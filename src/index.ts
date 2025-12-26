interface StorageValue<T> {
  value: T;
  expiry: number | null;
  version?: string;
  metadata?: Record<string, any>;
}

interface SafeVaultOptions {
  prefix?: string;
  version?: string;
  encryption?: {
    encrypt: (data: string) => string;
    decrypt: (data: string) => string;
  };
  onError?: (error: Error, operation: string, key: string) => void;
}

interface VaultStats {
  totalKeys: number;
  expiredKeys: number;
  size: number; // in bytes
  keys: string[];
}

export class SafeVault<Schema extends Record<string, any>> {
  private storage: Storage;
  private prefix: string;
  private version: string;
  private encryption?: SafeVaultOptions['encryption'];
  private onError?: SafeVaultOptions['onError'];
  private listeners: Map<string, Set<(value: any) => void>> = new Map();

  constructor(
    storage: Storage = localStorage,
    options: SafeVaultOptions = {}
  ) {
    if (typeof window === "undefined") {
      throw new Error("SafeVault can only be used in browser environments");
    }
    
    this.storage = storage;
    this.prefix = options.prefix || 'sv_';
    this.version = options.version || '1.0.0';
    this.encryption = options.encryption;
    this.onError = options.onError;

    // Auto-cleanup expired items on initialization
    this.cleanupExpired();
  }

  /**
   * Set a value with optional TTL (in milliseconds) and metadata
   */
  set<K extends keyof Schema>(
    key: K,
    value: Schema[K],
    ttl?: number,
    metadata?: Record<string, any>
  ): boolean {
    try {
      const expiry = typeof ttl === "number" ? Date.now() + ttl : null;

      const data: StorageValue<Schema[K]> = {
        value,
        expiry,
        version: this.version,
        metadata,
      };

      const serialized = JSON.stringify(data);
      const finalData = this.encryption 
        ? this.encryption.encrypt(serialized)
        : serialized;

      this.storage.setItem(this.getKey(key), finalData);
      this.notifyListeners(key, value);
      return true;
    } catch (error) {
      this.handleError(error as Error, 'set', key as string);
      return false;
    }
  }

  /**
   * Get a value. Returns null if expired or not found.
   */
  get<K extends keyof Schema>(key: K): Schema[K] | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;

      const decrypted = this.encryption 
        ? this.encryption.decrypt(item)
        : item;

      const data: StorageValue<Schema[K]> = JSON.parse(decrypted);

      // Check expiry
      if (data.expiry !== null && Date.now() > data.expiry) {
        this.remove(key);
        return null;
      }

      // Check version mismatch (optional migration)
      if (data.version && data.version !== this.version) {
        // You can implement migration logic here
      }

      return data.value;
    } catch (error) {
      this.handleError(error as Error, 'get', key as string);
      this.storage.removeItem(this.getKey(key));
      return null;
    }
  }

  /**
   * Get with default value
   */
  getOrDefault<K extends keyof Schema>(
    key: K,
    defaultValue: Schema[K]
  ): Schema[K] {
    const value = this.get(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Check if key exists and is not expired
   */
  has<K extends keyof Schema>(key: K): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get metadata for a key
   */
  getMetadata<K extends keyof Schema>(key: K): Record<string, any> | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;

      const decrypted = this.encryption 
        ? this.encryption.decrypt(item)
        : item;

      const data: StorageValue<Schema[K]> = JSON.parse(decrypted);
      return data.metadata || null;
    } catch {
      return null;
    }
  }

  /**
   * Update only if key exists
   */
  update<K extends keyof Schema>(
    key: K,
    updater: (current: Schema[K]) => Schema[K]
  ): boolean {
    const current = this.get(key);
    if (current === null) return false;

    const updated = updater(current);
    return this.set(key, updated);
  }

  /**
   * Set if key doesn't exist
   */
  setIfAbsent<K extends keyof Schema>(
    key: K,
    value: Schema[K],
    ttl?: number
  ): boolean {
    if (this.has(key)) return false;
    return this.set(key, value, ttl);
  }

  /**
   * Remove a single key
   */
  remove<K extends keyof Schema>(key: K): void {
    this.storage.removeItem(this.getKey(key));
    this.notifyListeners(key, null);
  }

  /**
   * Remove multiple keys
   */
  removeMany<K extends keyof Schema>(keys: K[]): void {
    keys.forEach(key => this.remove(key));
  }

  /**
   * Clear all prefixed storage
   */
  clear(): void {
    const keys = this.getAllKeys();
    keys.forEach(key => this.storage.removeItem(key));
    this.listeners.clear();
  }

  /**
   * Get all keys (without prefix)
   */
  keys(): (keyof Schema)[] {
    return this.getAllKeys().map(key => 
      key.substring(this.prefix.length) as keyof Schema
    );
  }

  /**
   * Get all values
   */
  entries(): Array<[keyof Schema, Schema[keyof Schema]]> {
    return this.keys()
      .map(key => [key, this.get(key)] as [keyof Schema, Schema[keyof Schema] | null])
      .filter(([, value]) => value !== null) as Array<[keyof Schema, Schema[keyof Schema]]>;
  }

  /**
   * Cleanup all expired items
   */
  cleanupExpired(): number {
    let count = 0;
    const keys = this.getAllKeys();

    keys.forEach(fullKey => {
      try {
        const item = this.storage.getItem(fullKey);
        if (!item) return;

        const decrypted = this.encryption 
          ? this.encryption.decrypt(item)
          : item;

        const data: StorageValue<any> = JSON.parse(decrypted);

        if (data.expiry !== null && Date.now() > data.expiry) {
          this.storage.removeItem(fullKey);
          count++;
        }
      } catch {
        // Remove corrupted items
        this.storage.removeItem(fullKey);
        count++;
      }
    });

    return count;
  }

  /**
   * Get storage statistics
   */
  getStats(): VaultStats {
    const keys = this.getAllKeys();
    let totalSize = 0;
    let expiredCount = 0;

    keys.forEach(fullKey => {
      try {
        const item = this.storage.getItem(fullKey);
        if (!item) return;

        totalSize += item.length * 2; // rough byte estimate

        const decrypted = this.encryption 
          ? this.encryption.decrypt(item)
          : item;

        const data: StorageValue<any> = JSON.parse(decrypted);

        if (data.expiry !== null && Date.now() > data.expiry) {
          expiredCount++;
        }
      } catch {
        expiredCount++;
      }
    });

    return {
      totalKeys: keys.length,
      expiredKeys: expiredCount,
      size: totalSize,
      keys: keys.map(k => k.substring(this.prefix.length)),
    };
  }

  /**
   * Subscribe to key changes
   */
  subscribe<K extends keyof Schema>(
    key: K,
    callback: (value: Schema[K] | null) => void
  ): () => void {
    const keyStr = key as string;
    
    if (!this.listeners.has(keyStr)) {
      this.listeners.set(keyStr, new Set());
    }

    this.listeners.get(keyStr)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(keyStr);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(keyStr);
        }
      }
    };
  }

  /**
   * Export all data as JSON
   */
  export(): string {
    const data: Record<string, any> = {};
    
    this.entries().forEach(([key, value]) => {
      data[key as string] = value;
    });

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON
   */
  import(jsonData: string, merge: boolean = false): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (!merge) {
        this.clear();
      }

      Object.entries(data).forEach(([key, value]) => {
        this.set(key as keyof Schema, value as Schema[keyof Schema]);
      });

      return true;
    } catch (error) {
      this.handleError(error as Error, 'import', 'batch');
      return false;
    }
  }

  /**
   * Get remaining TTL in milliseconds
   */
  getTTL<K extends keyof Schema>(key: K): number | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;

      const decrypted = this.encryption 
        ? this.encryption.decrypt(item)
        : item;

      const data: StorageValue<Schema[K]> = JSON.parse(decrypted);

      if (data.expiry === null) return null;

      const remaining = data.expiry - Date.now();
      return remaining > 0 ? remaining : 0;
    } catch {
      return null;
    }
  }

  /**
   * Extend TTL for existing key
   */
  extendTTL<K extends keyof Schema>(key: K, additionalMs: number): boolean {
    const current = this.get(key);
    if (current === null) return false;

    const currentTTL = this.getTTL(key);
    const newTTL = currentTTL ? currentTTL + additionalMs : additionalMs;

    return this.set(key, current, newTTL);
  }

  // Private helpers

  private getKey<K extends keyof Schema>(key: K): string {
    return `${this.prefix}${String(key)}`;
  }

  private getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private notifyListeners<K extends keyof Schema>(
    key: K,
    value: Schema[K] | null
  ): void {
    const callbacks = this.listeners.get(key as string);
    if (callbacks) {
      callbacks.forEach(callback => callback(value));
    }
  }

  private handleError(error: Error, operation: string, key: string): void {
    if (this.onError) {
      this.onError(error, operation, key);
    } else {
      console.error(`SafeVault ${operation} error for key "${key}":`, error);
    }
  }
}

// Example usage:
/*
interface MySchema {
  user: { name: string; email: string };
  token: string;
  settings: { theme: 'light' | 'dark' };
}

const vault = new SafeVault<MySchema>(localStorage, {
  prefix: 'myapp_',
  version: '2.0.0',
  onError: (error, op, key) => console.log(`Error in ${op}:`, key, error)
});

// Set with 1 hour TTL
vault.set('token', 'abc123', 60 * 60 * 1000);

// Subscribe to changes
const unsubscribe = vault.subscribe('user', (user) => {
  console.log('User changed:', user);
});

// Get stats
const stats = vault.getStats();
console.log('Storage usage:', stats);

// Cleanup expired items
vault.cleanupExpired();

// Export/Import
const backup = vault.export();
vault.import(backup);
*/
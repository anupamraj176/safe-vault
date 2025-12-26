interface StorageValue<T> {
  value: T;
  expiry: number | null;
}

export class SafeVault<Schema extends Record<string, any>> {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    if (typeof window === "undefined") {
      throw new Error("SafeVault can only be used in browser environments");
    }
    this.storage = storage;
  }

  /**
   * Set a value with optional TTL (in milliseconds)
   */
  set<K extends keyof Schema>(
    key: K,
    value: Schema[K],
    ttl?: number
  ): void {
    const expiry = typeof ttl === "number" ? Date.now() + ttl : null;

    const data: StorageValue<Schema[K]> = {
      value,
      expiry,
    };

    this.storage.setItem(key as string, JSON.stringify(data));
  }

  /**
   * Get a value. Returns null if expired or not found.
   */
  get<K extends keyof Schema>(key: K): Schema[K] | null {
    const item = this.storage.getItem(key as string);
    if (!item) return null;

    try {
      const data: StorageValue<Schema[K]> = JSON.parse(item);

      if (data.expiry !== null && Date.now() > data.expiry) {
        this.storage.removeItem(key as string);
        return null;
      }

      return data.value;
    } catch {
      // corrupted JSON
      this.storage.removeItem(key as string);
      return null;
    }
  }

  /**
   * Remove a single key
   */
  remove<K extends keyof Schema>(key: K): void {
    this.storage.removeItem(key as string);
  }

  /**
   * Clear all storage
   */
  clear(): void {
    this.storage.clear();
  }
}

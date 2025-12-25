// src/index.ts
var SafeVault = class {
  storage;
  constructor(storage = localStorage) {
    if (typeof window === "undefined") {
      throw new Error("SafeVault can only be used in browser environments");
    }
    this.storage = storage;
  }
  /**
   * Set a value with optional TTL (in milliseconds)
   */
  set(key, value, ttl) {
    const expiry = typeof ttl === "number" ? Date.now() + ttl : null;
    const data = {
      value,
      expiry
    };
    this.storage.setItem(key, JSON.stringify(data));
  }
  /**
   * Get a value. Returns null if expired or not found.
   */
  get(key) {
    const item = this.storage.getItem(key);
    if (!item) return null;
    try {
      const data = JSON.parse(item);
      if (data.expiry !== null && Date.now() > data.expiry) {
        this.storage.removeItem(key);
        return null;
      }
      return data.value;
    } catch {
      this.storage.removeItem(key);
      return null;
    }
  }
  /**
   * Remove a single key
   */
  remove(key) {
    this.storage.removeItem(key);
  }
  /**
   * Clear all storage
   */
  clear() {
    this.storage.clear();
  }
};
export {
  SafeVault
};
//# sourceMappingURL=index.js.map
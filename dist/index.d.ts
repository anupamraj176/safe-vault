declare class SafeVault<Schema extends Record<string, any>> {
    private storage;
    constructor(storage?: Storage);
    /**
     * Set a value with optional TTL (in milliseconds)
     */
    set<K extends keyof Schema>(key: K, value: Schema[K], ttl?: number): void;
    /**
     * Get a value. Returns null if expired or not found.
     */
    get<K extends keyof Schema>(key: K): Schema[K] | null;
    /**
     * Remove a single key
     */
    remove<K extends keyof Schema>(key: K): void;
    /**
     * Clear all storage
     */
    clear(): void;
}

export { SafeVault };

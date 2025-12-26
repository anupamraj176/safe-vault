# SafeVault

A type-safe localStorage wrapper with TTL, encryption, and reactive subscriptions for browser environments.

## Features

- 🔒 Type-safe with full TypeScript support
- ⏰ TTL (Time To Live) support with auto-expiration
- 🔐 Optional encryption/decryption hooks
- 📡 Reactive subscriptions for real-time updates
- 🗂️ Namespaced keys with configurable prefix
- 📦 Batch operations and import/export
- 🛡️ Automatic error handling
- 🪶 Zero dependencies

## Installation

```bash
npm install safe-vault
```

## Quick Start

```typescript
import { SafeVault } from 'safe-vault';

interface MySchema {
  user: { id: string; name: string };
  token: string;
}

const vault = new SafeVault<MySchema>();

// Basic operations
vault.set('token', 'abc123', 3600000); // 1 hour TTL
const token = vault.get('token');
vault.remove('token');
```

## Configuration

```typescript
const vault = new SafeVault<MySchema>(localStorage, {
  prefix: 'app_',              // Default: 'sv_'
  version: '1.3.0',            // Default: '1.0.0'
  encryption: {
    encrypt: (data) => btoa(data),
    decrypt: (data) => atob(data)
  },
  onError: (error, op, key) => console.error(error)
});
```

## Core API

### Basic Operations

```typescript
// Set with optional TTL and metadata
vault.set('user', userData, 3600000, { source: 'login' });

// Get value (null if expired/missing)
const user = vault.get('user');

// Get with default
const prefs = vault.getOrDefault('preferences', { theme: 'light' });

// Check existence
if (vault.has('token')) { /* ... */ }

// Remove
vault.remove('token');

// Clear all
vault.clear();
```

### Conditional Operations

```typescript
// Set only if absent
vault.setIfAbsent('config', { init: true });

// Update existing value
vault.update('user', (u) => ({ ...u, lastSeen: Date.now() }));
```

### TTL Management

```typescript
// Get remaining TTL (ms)
const ttl = vault.getTTL('token');

// Extend TTL
vault.extendTTL('token', 1800000); // +30 minutes
```

### Subscriptions

```typescript
const unsubscribe = vault.subscribe('user', (user) => {
  console.log('User updated:', user);
});

// Later...
unsubscribe();
```

### Batch Operations

```typescript
// Get all keys/entries
const keys = vault.keys();
const entries = vault.entries();

// Remove multiple
vault.removeMany(['key1', 'key2']);

// Export/Import
const backup = vault.export();
vault.import(backup, true); // merge = true
```

### Storage Management

```typescript
// Get statistics
const stats = vault.getStats();
// { totalKeys, expiredKeys, size, keys }

// Cleanup expired items
const removed = vault.cleanupExpired();

// Get metadata
const meta = vault.getMetadata('token');
```

## Migration from v1.0

**Breaking Changes:**
- Keys are prefixed by default (`sv_`)
- Constructor accepts options as second parameter
- `set()` returns boolean

```typescript
// v1.0
const vault = new SafeVault<Schema>(localStorage);

// v1.3.0 - with prefix
const vault = new SafeVault<Schema>(localStorage, { prefix: 'app_' });

// v1.3.0 - no prefix (v1.0 behavior)
const vault = new SafeVault<Schema>(localStorage, { prefix: '' });
```

## TypeScript

Full type safety and autocomplete:

```typescript
interface Schema {
  count: number;
}

const vault = new SafeVault<Schema>();

vault.set('count', 42);      // ✅
vault.set('count', '42');    // ❌ Type error
vault.set('invalid', 1);     // ❌ Not in schema
```

## Use Cases

**Auth Token Management:**
```typescript
vault.set('accessToken', token, 15 * 60 * 1000);  // 15 min
vault.set('refreshToken', refresh, 7 * 24 * 60 * 60 * 1000); // 7 days
```

**Form Draft Auto-Save:**
```typescript
setInterval(() => {
  vault.set('draft', formData, 24 * 60 * 60 * 1000); // 24 hours
}, 30000);
```

**Feature Flags:**
```typescript
vault.set('features', flags, 60 * 60 * 1000); // Cache 1 hour
```

## License

MIT

# SafeVault

A type-safe localStorage wrapper with built-in TTL (Time To Live) support for browser environments.

## Features

- 🔒 **Type-safe**: Full TypeScript support with schema definitions
- ⏰ **TTL Support**: Set automatic expiration times for stored data
- 🛡️ **Error Handling**: Gracefully handles corrupted data and expired entries
- 🪶 **Lightweight**: Zero dependencies
- 🌐 **Storage Agnostic**: Works with both localStorage and sessionStorage

## Installation

```bash
npm install safe-vault
```

```bash
yarn add safe-vault
```

```bash
pnpm add safe-vault
```

## Usage

### Basic Example

```typescript
import { SafeVault } from 'safe-vault';

// Define your storage schema
interface MySchema {
  user: {
    id: string;
    name: string;
  };
  token: string;
  preferences: {
    theme: 'light' | 'dark';
  };
}

// Create an instance
const vault = new SafeVault<MySchema>();

// Set values
vault.set('user', { id: '123', name: 'John Doe' });
vault.set('token', 'abc123');

// Get values
const user = vault.get('user'); // Typed as { id: string; name: string } | null
const token = vault.get('token'); // Typed as string | null

// Remove values
vault.remove('token');

// Clear all storage
vault.clear();
```

### TTL (Time To Live) Support

Set expiration times for your data:

```typescript
// Expire after 1 hour (3600000 milliseconds)
vault.set('token', 'abc123', 3600000);

// Expire after 5 minutes
vault.set('sessionData', { temp: true }, 5 * 60 * 1000);

// When you try to get expired data, it returns null
setTimeout(() => {
  const token = vault.get('token'); // null (if expired)
}, 3600001);
```

### Using sessionStorage

```typescript
const sessionVault = new SafeVault<MySchema>(sessionStorage);

sessionVault.set('temporaryData', { foo: 'bar' });
```

## API Reference

### Constructor

```typescript
new SafeVault<Schema>(storage?: Storage)
```

- `storage`: Optional. Defaults to `localStorage`. Can be `sessionStorage` or any Storage-compatible object.

### Methods

#### `set<K>(key: K, value: Schema[K], ttl?: number): void`

Store a value with optional TTL.

- `key`: The key from your schema
- `value`: The value to store (must match schema type)
- `ttl`: Optional. Time to live in milliseconds

#### `get<K>(key: K): Schema[K] | null`

Retrieve a value. Returns `null` if the key doesn't exist or has expired.

- `key`: The key from your schema
- Returns: The stored value or `null`

#### `remove<K>(key: K): void`

Remove a specific key from storage.

- `key`: The key to remove

#### `clear(): void`

Clear all items from storage.

## Error Handling

SafeVault automatically handles:

- **Corrupted JSON**: If stored data can't be parsed, it's removed and `null` is returned
- **Expired entries**: Automatically removed when accessed
- **Missing keys**: Returns `null` gracefully

## Browser Support

SafeVault requires a browser environment with `localStorage` or `sessionStorage` support. It will throw an error if used in non-browser environments (like Node.js without polyfills).

## TypeScript

This package is written in TypeScript and includes type definitions. Your schema provides full autocomplete and type checking:

```typescript
interface MySchema {
  count: number;
  name: string;
}

const vault = new SafeVault<MySchema>();

vault.set('count', 42); // ✅ OK
vault.set('count', '42'); // ❌ Type error
vault.set('invalid', 'value'); // ❌ Type error - key not in schema

const count = vault.get('count'); // Type: number | null
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you find a bug or have a feature request, please open an issue on GitHub.

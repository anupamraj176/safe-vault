"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SafeVault: () => SafeVault
});
module.exports = __toCommonJS(index_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SafeVault
});
//# sourceMappingURL=index.cjs.map
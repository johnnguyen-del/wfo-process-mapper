import "@testing-library/jest-dom/vitest";

// Some test envs don't ship a working localStorage (or ship one without
// getItem). Always replace with a minimal in-memory shim so identity/storage
// helpers can run during tests.
if (typeof window !== "undefined") {
  const store = new Map<string, string>();
  const ls: Storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: ls,
    configurable: true,
    writable: true,
  });
}

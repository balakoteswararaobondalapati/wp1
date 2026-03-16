export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    const oldValue = this.getItem(key);
    this.store.set(key, value);

    // Keep compatibility with existing listeners that expect a storage-like event.
    window.dispatchEvent(
      new CustomEvent('app-storage', {
        detail: { key, oldValue, newValue: value },
      }),
    );
  }

  removeItem(key: string): void {
    const oldValue = this.getItem(key);
    this.store.delete(key);
    window.dispatchEvent(
      new CustomEvent('app-storage', {
        detail: { key, oldValue, newValue: null },
      }),
    );
  }

  clear(): void {
    this.store.clear();
    window.dispatchEvent(new CustomEvent('app-storage:clear'));
  }
}

class LocalStorageWrapper implements StorageLike {
  private readonly target: Storage;

  constructor(target: Storage) {
    this.target = target;
  }

  getItem(key: string): string | null {
    return this.target.getItem(key);
  }

  setItem(key: string, value: string): void {
    const oldValue = this.getItem(key);
    this.target.setItem(key, value);
    window.dispatchEvent(
      new CustomEvent('app-storage', {
        detail: { key, oldValue, newValue: value },
      }),
    );
  }

  removeItem(key: string): void {
    const oldValue = this.getItem(key);
    this.target.removeItem(key);
    window.dispatchEvent(
      new CustomEvent('app-storage', {
        detail: { key, oldValue, newValue: null },
      }),
    );
  }

  clear(): void {
    this.target.clear();
    window.dispatchEvent(new CustomEvent('app-storage:clear'));
  }
}

const createAppStorage = (): StorageLike => {
  if (typeof window === 'undefined') return new MemoryStorage();
  try {
    const probeKey = '__app_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return new LocalStorageWrapper(window.localStorage);
  } catch {
    return new MemoryStorage();
  }
};

export const appStorage: StorageLike = createAppStorage();

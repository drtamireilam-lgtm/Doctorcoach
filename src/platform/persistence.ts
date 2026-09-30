export type PersistedEnvelope<T> = {
  schemaVersion: number;
  updatedAt: string;
  payload: T;
};

export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export class BrowserStorageStore implements KeyValueStore {
  constructor(private prefix = 'doctorcoach') {}

  private storageKey(key: string) {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(this.storageKey(key));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.storageKey(key));
  }
}

export class VersionedRepository<T> {
  constructor(
    private store: KeyValueStore,
    private key: string,
    private schemaVersion: number,
  ) {}

  async load(): Promise<T | null> {
    const envelope = await this.store.get<PersistedEnvelope<T>>(this.key);
    if (!envelope) return null;
    if (envelope.schemaVersion !== this.schemaVersion) return null;
    return envelope.payload;
  }

  async save(payload: T): Promise<void> {
    const envelope: PersistedEnvelope<T> = {
      schemaVersion: this.schemaVersion,
      updatedAt: new Date().toISOString(),
      payload,
    };
    await this.store.set(this.key, envelope);
  }

  async clear(): Promise<void> {
    await this.store.remove(this.key);
  }
}

// Production note: BrowserStorageStore is an offline/MVP adapter only. A remote
// adapter should implement KeyValueStore using the authenticated backend API.

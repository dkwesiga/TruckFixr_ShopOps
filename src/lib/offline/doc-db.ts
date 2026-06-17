import type { LocalDocument, RefCache, SyncLogEntry } from "./doc-types";

// Separate IndexedDB database for the offline document mirror.
const DB_NAME = "shopops-docs";
const VERSION = 1;
const DOCS = "documents";
const LOG = "synclog";
const REF = "refcache";

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(LOG)) db.createObjectStore(LOG, { keyPath: "id" });
      if (!db.objectStoreNames.contains(REF)) db.createObjectStore(REF, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const r = fn(t.objectStore(store));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        t.oncomplete = () => db.close();
      })
  );
}

// --- Documents ---
export async function docPut(doc: LocalDocument): Promise<void> {
  if (!hasIDB()) return;
  await run(DOCS, "readwrite", (s) => s.put(doc));
}
export async function docGet(id: string): Promise<LocalDocument | undefined> {
  if (!hasIDB()) return undefined;
  return run<LocalDocument | undefined>(DOCS, "readonly", (s) => s.get(id) as IDBRequest<LocalDocument | undefined>);
}
export async function docGetAll(): Promise<LocalDocument[]> {
  if (!hasIDB()) return [];
  const all = await run<LocalDocument[]>(DOCS, "readonly", (s) => s.getAll() as IDBRequest<LocalDocument[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function docDelete(id: string): Promise<void> {
  if (!hasIDB()) return;
  await run(DOCS, "readwrite", (s) => s.delete(id));
}

// --- Sync log ---
export async function logPut(entry: SyncLogEntry): Promise<void> {
  if (!hasIDB()) return;
  await run(LOG, "readwrite", (s) => s.put(entry));
}
export async function logGetAll(): Promise<SyncLogEntry[]> {
  if (!hasIDB()) return [];
  const all = await run<SyncLogEntry[]>(LOG, "readonly", (s) => s.getAll() as IDBRequest<SyncLogEntry[]>);
  return all.sort((a, b) => b.at - a.at);
}

// --- Reference cache (single record under key "current") ---
export async function refPut(cache: RefCache): Promise<void> {
  if (!hasIDB()) return;
  await run(REF, "readwrite", (s) => s.put({ key: "current", ...cache }));
}
export async function refGet(): Promise<RefCache | undefined> {
  if (!hasIDB()) return undefined;
  const rec = await run<(RefCache & { key: string }) | undefined>(REF, "readonly", (s) => s.get("current") as IDBRequest<(RefCache & { key: string }) | undefined>);
  if (!rec) return undefined;
  const { key: _key, ...cache } = rec;
  void _key;
  return cache;
}

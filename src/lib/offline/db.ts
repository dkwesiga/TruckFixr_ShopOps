import type { CaptureRecord } from "./types";

// Minimal promise wrapper around IndexedDB — no dependency. Browser-only.
const DB_NAME = "shopops-offline";
const STORE = "captures";
const VERSION = 1;

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = fn(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      })
  );
}

export async function idbPut(record: CaptureRecord): Promise<void> {
  if (!hasIDB()) return;
  await tx("readwrite", (s) => s.put(record));
}

export async function idbGet(id: string): Promise<CaptureRecord | undefined> {
  if (!hasIDB()) return undefined;
  return tx<CaptureRecord | undefined>("readonly", (s) => s.get(id) as IDBRequest<CaptureRecord | undefined>);
}

export async function idbGetAll(): Promise<CaptureRecord[]> {
  if (!hasIDB()) return [];
  const all = await tx<CaptureRecord[]>("readonly", (s) => s.getAll() as IDBRequest<CaptureRecord[]>);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function idbDelete(id: string): Promise<void> {
  if (!hasIDB()) return;
  await tx("readwrite", (s) => s.delete(id));
}

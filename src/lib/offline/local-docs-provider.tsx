"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { LocalDocument, RefCache } from "./doc-types";
import { docDelete, docGet, docGetAll, docPut, refGet } from "./doc-db";
import { refreshRefCache, syncDocuments } from "./doc-sync-client";

interface LocalDocsContextValue {
  online: boolean;
  documents: LocalDocument[];
  refCache: RefCache | null;
  unsyncedCount: number;
  refresh: () => Promise<void>;
  save: (doc: LocalDocument) => Promise<void>;
  get: (id: string) => Promise<LocalDocument | undefined>;
  remove: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<LocalDocsContextValue | null>(null);

export function LocalDocsProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [refCache, setRefCache] = useState<RefCache | null>(null);
  const syncing = useRef(false);

  const refresh = useCallback(async () => {
    setDocuments(await docGetAll());
  }, []);

  const runSync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      await syncDocuments(() => { void refresh(); });
    } finally {
      syncing.current = false;
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void (async () => {
      setRefCache((await refGet()) ?? null);
      await refresh();
      if (navigator.onLine) {
        setRefCache((await refreshRefCache()) ?? null);
        await runSync();
      }
    })();

    const goOnline = async () => {
      setOnline(true);
      setRefCache((await refreshRefCache()) ?? null);
      await runSync();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refresh, runSync]);

  const save = useCallback(async (doc: LocalDocument) => {
    await docPut(doc);
    await refresh();
    if (navigator.onLine && (doc.syncState === "local" || doc.syncState === "error")) void runSync();
  }, [refresh, runSync]);

  const remove = useCallback(async (id: string) => {
    await docDelete(id);
    await refresh();
  }, [refresh]);

  const unsyncedCount = documents.filter((d) => d.syncState === "local" || d.syncState === "error" || d.syncState === "syncing").length;

  return (
    <Ctx.Provider value={{ online, documents, refCache, unsyncedCount, refresh, save, get: docGet, remove, syncNow: runSync }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLocalDocs(): LocalDocsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocalDocs must be used within LocalDocsProvider");
  return ctx;
}

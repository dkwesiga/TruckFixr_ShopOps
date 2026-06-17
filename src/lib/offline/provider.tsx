"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CaptureKind, CaptureRecord } from "./types";
import { idbPut } from "./db";
import { deleteCapture, enqueueCapture, listCaptures, processQueue, setApplied } from "./queue";

interface OfflineContextValue {
  online: boolean;
  captures: CaptureRecord[];
  pendingCount: number; // queued or processing
  readyCount: number;
  refresh: () => Promise<void>;
  enqueue: (input: { kind: CaptureKind; text?: string; imageDataUrl?: string; audio?: Blob; fromImage?: boolean }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  retry: (record: CaptureRecord) => Promise<void>;
  markApplied: (record: CaptureRecord, kind: "estimate" | "invoice", docId: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const processing = useRef(false);

  const refresh = useCallback(async () => {
    setCaptures(await listCaptures());
  }, []);

  const drainQueue = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    try {
      await processQueue(() => { void refresh(); });
    } finally {
      processing.current = false;
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refresh().then(() => {
      if (navigator.onLine) void drainQueue();
    });

    const goOnline = () => { setOnline(true); void drainQueue(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refresh, drainQueue]);

  const enqueue = useCallback<OfflineContextValue["enqueue"]>(async (input) => {
    await enqueueCapture(input);
    await refresh();
    if (navigator.onLine) void drainQueue();
  }, [refresh, drainQueue]);

  const remove = useCallback(async (id: string) => {
    await deleteCapture(id);
    await refresh();
  }, [refresh]);

  const retry = useCallback(async (record: CaptureRecord) => {
    await idbPut({ ...record, status: "queued", errorMessage: null, updatedAt: Date.now() });
    await refresh();
    if (navigator.onLine) void drainQueue();
  }, [refresh, drainQueue]);

  const markApplied = useCallback(async (record: CaptureRecord, kind: "estimate" | "invoice", docId: string) => {
    await setApplied(record, kind, docId);
    await refresh();
  }, [refresh]);

  const pendingCount = captures.filter((c) => c.status === "queued" || c.status === "processing").length;
  const readyCount = captures.filter((c) => c.status === "ready").length;

  return (
    <OfflineContext.Provider value={{ online, captures, pendingCount, readyCount, refresh, enqueue, remove, retry, markApplied }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}

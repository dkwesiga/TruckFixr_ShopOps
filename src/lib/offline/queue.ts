import type { CaptureDraft, CaptureKind, CaptureRecord } from "./types";
import { idbDelete, idbGetAll, idbPut } from "./db";

export async function enqueueCapture(input: {
  kind: CaptureKind;
  text?: string;
  imageDataUrl?: string;
  audio?: Blob;
  fromImage?: boolean;
}): Promise<CaptureRecord> {
  const now = Date.now();
  const record: CaptureRecord = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  await idbPut(record);
  return record;
}

export async function listCaptures(): Promise<CaptureRecord[]> {
  return idbGetAll();
}

export async function deleteCapture(id: string): Promise<void> {
  await idbDelete(id);
}

export async function setApplied(record: CaptureRecord, kind: "estimate" | "invoice", docId: string): Promise<void> {
  await idbPut({ ...record, status: "applied", appliedKind: kind, appliedDocId: docId, updatedAt: Date.now() });
}

/** Transcribe (if voice) + AI-draft a single capture. Network failures leave it queued for retry. */
export async function processCapture(rec: CaptureRecord): Promise<CaptureRecord> {
  let working: CaptureRecord = { ...rec, status: "processing", errorMessage: null, updatedAt: Date.now() };
  await idbPut(working);

  try {
    let text = working.text;
    if (working.kind === "voice" && working.audio && !text?.trim()) {
      text = await transcribe(working.audio);
      working = { ...working, text };
      await idbPut(working);
    }

    const result = await draft(text, working.imageDataUrl);
    working = {
      ...working,
      status: "ready",
      draft: result === "not-configured" ? null : result,
      updatedAt: Date.now(),
    };
    await idbPut(working);
    return working;
  } catch (err) {
    if (isOffline(err)) {
      const requeued: CaptureRecord = { ...rec, status: "queued", updatedAt: Date.now() };
      await idbPut(requeued);
      return requeued;
    }
    const errored: CaptureRecord = {
      ...working,
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Processing failed",
      updatedAt: Date.now(),
    };
    await idbPut(errored);
    return errored;
  }
}

/** Process every queued capture, stopping early if connectivity drops. */
export async function processQueue(onProgress?: () => void): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const queued = (await idbGetAll()).filter((r) => r.status === "queued");
  for (const rec of queued) {
    if (typeof navigator !== "undefined" && !navigator.onLine) break;
    await processCapture(rec);
    onProgress?.();
  }
}

// ---------------------------------------------------------------------------

async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audio, "capture.webm");
  const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
  if (res.status === 503) throw new Error("Voice transcription isn’t configured.");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Transcription failed.");
  return data.text as string;
}

async function draft(text: string | undefined, image: string | undefined): Promise<CaptureDraft | "not-configured"> {
  const res = await fetch("/api/ai/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "estimate", text: text || undefined, image: image || undefined }),
  });
  if (res.status === 503) return "not-configured";
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Drafting failed.");
  return data as CaptureDraft;
}

function isOffline(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  // A failed fetch (no network) rejects with a TypeError.
  return err instanceof TypeError;
}

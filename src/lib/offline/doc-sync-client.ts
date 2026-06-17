import { docGetAll, docPut, logPut, refGet, refPut } from "./doc-db";
import type { LocalDocument, RefCache } from "./doc-types";
import { syncLocalDocument } from "@/lib/actions/doc-sync";

/** Fetch fresh reference data when online; fall back to the cached snapshot. */
export async function refreshRefCache(): Promise<RefCache | undefined> {
  try {
    const res = await fetch("/api/refcache");
    if (!res.ok) return refGet();
    const data = await res.json();
    const cache: RefCache = { customers: data.customers ?? [], items: data.items ?? [], taxRate: data.taxRate ?? 0, updatedAt: Date.now() };
    await refPut(cache);
    return cache;
  } catch {
    return refGet();
  }
}

/** Push every local/error draft to the server, stopping early if connectivity drops. */
export async function syncDocuments(onProgress?: () => void): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const docs = await docGetAll();
  const pending = docs.filter((d) => d.syncState === "local" || d.syncState === "error");
  for (const doc of pending) {
    if (typeof navigator !== "undefined" && !navigator.onLine) break;
    await syncOne(doc);
    onProgress?.();
  }
}

async function syncOne(doc: LocalDocument): Promise<void> {
  await docPut({ ...doc, syncState: "syncing" });
  try {
    if (!doc.customerId) throw new Error("Pick a customer before syncing.");
    const res = await syncLocalDocument({
      kind: doc.kind,
      serverId: doc.serverId ?? null,
      customerId: doc.customerId,
      vehicleId: doc.vehicleId ?? null,
      complaint: doc.complaint ?? null,
      lines: doc.lines.map((l) => ({ type: l.type, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable })),
    });
    await docPut({ ...doc, serverId: res.serverId, serverNumber: res.serverNumber, syncState: "synced", syncedAt: res.syncedAt, syncError: null });
    await logPut({
      id: crypto.randomUUID(),
      docId: doc.id,
      kind: doc.kind,
      outcome: doc.serverId ? "updated" : "created",
      message: res.conflict ? "Server copy was already sent — kept the server version." : undefined,
      at: Date.now(),
    });
  } catch (err) {
    if (isOffline(err)) {
      await docPut({ ...doc, syncState: "local" });
      return;
    }
    const message = err instanceof Error ? err.message : "Sync failed";
    await docPut({ ...doc, syncState: "error", syncError: message });
    await logPut({ id: crypto.randomUUID(), docId: doc.id, kind: doc.kind, outcome: "error", message, at: Date.now() });
  }
}

function isOffline(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return err instanceof TypeError;
}

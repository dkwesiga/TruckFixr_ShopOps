"use client";

import Link from "next/link";
import { useLocalDocs } from "@/lib/offline/local-docs-provider";
import type { LocalDocument } from "@/lib/offline/doc-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, round2 } from "@/lib/money";

const SYNC: Record<LocalDocument["syncState"], { label: string; variant: "default" | "success" | "warning" | "error" | "ai" }> = {
  local: { label: "On device", variant: "default" },
  syncing: { label: "Syncing…", variant: "ai" },
  synced: { label: "Synced", variant: "success" },
  error: { label: "Sync failed", variant: "error" },
};

function docTotal(d: LocalDocument): number {
  let sub = 0, taxable = 0;
  for (const l of d.lines) {
    const t = round2(l.quantity * l.unitPrice);
    sub += t;
    if (l.taxable) taxable += t;
  }
  return round2(round2(sub) + round2(taxable * d.taxRate));
}

export function LocalDocsList() {
  const { documents, online, unsyncedCount, syncNow, remove } = useLocalDocs();

  return (
    <div className="space-y-3">
      {online && unsyncedCount > 0 && (
        <Button type="button" variant="secondary" size="md" className="w-full" onClick={() => void syncNow()}>
          Sync {unsyncedCount} draft{unsyncedCount !== 1 ? "s" : ""} now
        </Button>
      )}
      {!online && (
        <div className="rounded-lg border border-[#f2862e]/40 bg-[#fff3e8] px-4 py-3 text-sm text-[#9b4c10]">
          You’re offline. Drafts are saved here and sync automatically when you reconnect.
        </div>
      )}

      {documents.length === 0 ? (
        <div className="industrial-card p-8 text-center">
          <p className="text-base font-bold text-[#191c20]">No drafts on this device</p>
          <p className="text-sm text-[#5f6673] mt-1">Create estimates or invoices offline — they sync to your ledger when you reconnect.</p>
          <Link href="/drafts/new" className="inline-flex mt-4 items-center rounded-lg bg-[#004787] px-4 py-2 text-sm font-semibold text-white">New draft</Link>
        </div>
      ) : (
        documents.map((d) => {
          const s = SYNC[d.syncState];
          return (
            <div key={d.id} className="industrial-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-[#191c20]">{d.serverNumber ?? (d.kind === "estimate" ? "Estimate" : "Invoice")}</span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
                <span className="text-sm font-bold text-[#191c20] flex-shrink-0">{formatCurrency(docTotal(d))}</span>
              </div>
              <p className="text-sm text-[#5f6673] truncate">{d.customerName ?? "No customer yet"}{d.complaint ? ` — ${d.complaint}` : ""}</p>
              {d.syncState === "error" && d.syncError && <p className="text-xs text-[#d32f2f]">{d.syncError}</p>}
              <div className="flex items-center gap-3 pt-0.5">
                <Link href={`/drafts/${d.id}`} className="text-xs font-semibold text-[#004787]">Edit</Link>
                {d.syncState === "synced" && d.serverId && (
                  <Link href={d.kind === "invoice" ? `/invoices/${d.serverId}` : `/estimates/${d.serverId}`} className="text-xs font-semibold text-[#004787]">View in ledger</Link>
                )}
                <button type="button" onClick={() => void remove(d.id)} className="text-xs font-semibold text-[#d32f2f] ml-auto">Remove</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

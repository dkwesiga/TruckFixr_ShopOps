"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOffline } from "@/lib/offline/provider";
import type { CaptureRecord } from "@/lib/offline/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createEstimateFromDraft, createInvoiceFromDraft, type ApplyDraftLine } from "@/lib/actions/capture-apply";

interface VehicleOpt { id: string; label: string }
interface CustomerOpt { id: string; name: string; companyName: string | null; vehicles: VehicleOpt[] }

const STATUS: Record<CaptureRecord["status"], { label: string; variant: "default" | "success" | "warning" | "error" | "ai" }> = {
  queued: { label: "Saved on device", variant: "default" },
  processing: { label: "Processing…", variant: "ai" },
  ready: { label: "Ready", variant: "success" },
  error: { label: "Error", variant: "error" },
  applied: { label: "Synced", variant: "success" },
};

export function CaptureInbox({ customers }: { customers: CustomerOpt[] }) {
  const { captures, online, remove, retry } = useOffline();

  return (
    <div className="space-y-3">
      {!online && (
        <div className="rounded-lg border border-[#f2862e]/40 bg-[#fff3e8] px-4 py-3 text-sm text-[#9b4c10]">
          You’re offline. Captures are saved here and will be processed automatically when you reconnect.
        </div>
      )}

      {captures.length === 0 ? (
        <div className="industrial-card p-8 text-center">
          <p className="text-base font-bold text-[#191c20]">No captures yet</p>
          <p className="text-sm text-[#5f6673] mt-1">Capture a note, photo, or voice memo — even offline.</p>
          <Link href="/capture/new" className="inline-flex mt-4 items-center rounded-xl bg-[#004787] px-4 py-2 text-sm font-medium text-white">New capture</Link>
        </div>
      ) : (
        captures.map((c) => (
          <CaptureCard key={c.id} capture={c} customers={customers} onRemove={() => remove(c.id)} onRetry={() => retry(c)} />
        ))
      )}
    </div>
  );
}

function CaptureCard({
  capture,
  customers,
  onRemove,
  onRetry,
}: {
  capture: CaptureRecord;
  customers: CustomerOpt[];
  onRemove: () => void;
  onRetry: () => void;
}) {
  const router = useRouter();
  const { markApplied } = useOffline();
  const [applying, setApplying] = useState(false);
  const [docType, setDocType] = useState<"estimate" | "invoice">("estimate");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = STATUS[capture.status];
  const lineCount = capture.draft?.lines.length ?? 0;
  const selectedCustomer = customers.find((x) => x.id === customerId);

  const preview =
    capture.kind === "photo" ? "📷 Photo capture" : capture.kind === "voice" ? (capture.text ? `🎤 ${capture.text}` : "🎤 Voice clip") : capture.text || "Note";

  async function apply() {
    if (!customerId) { setError("Pick a customer."); return; }
    setBusy(true);
    setError(null);
    const lines: ApplyDraftLine[] = (capture.draft?.lines ?? []).map((l) => ({
      type: l.type,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxable: l.taxable,
      confidence: l.confidence,
      matchedItemId: l.matchedItemId,
    }));
    const input = {
      customerId,
      vehicleId: vehicleId || null,
      lines,
      complaint: capture.draft?.complaint ?? capture.text ?? null,
      recommendedWork: capture.draft?.recommendedWork ?? null,
      customerNote: capture.draft?.customerNote ?? null,
      internalNote: capture.draft?.internalNote ?? null,
    };
    try {
      const { id } = docType === "estimate" ? await createEstimateFromDraft(input) : await createInvoiceFromDraft(input);
      await markApplied(capture, docType, id);
      router.push(docType === "estimate" ? `/estimates/${id}` : `/invoices/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the document.");
      setBusy(false);
    }
  }

  return (
    <div className="industrial-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={s.variant}>{s.label}</Badge>
        <span className="text-xs text-[#858b98]">{new Date(capture.createdAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
      </div>

      <p className="text-sm text-[#191c20] line-clamp-3">{preview}</p>
      {capture.status === "ready" && lineCount > 0 && <p className="text-xs text-[#5f6673]">{lineCount} draft line{lineCount !== 1 ? "s" : ""} ready</p>}
      {capture.status === "ready" && lineCount === 0 && <p className="text-xs text-[#5f6673]">No AI lines — will start the document from this note.</p>}
      {capture.status === "error" && capture.errorMessage && <p className="text-xs text-[#d32f2f]">{capture.errorMessage}</p>}

      {/* Apply panel */}
      {applying && capture.status === "ready" && (
        <div className="rounded-lg border border-[#c2c6d3] p-3 space-y-2.5">
          <div className="flex gap-1.5 p-1 bg-[#eef0f5] rounded-lg">
            {(["estimate", "invoice"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setDocType(t)} className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize ${docType === t ? "bg-white shadow-sm text-[#191c20]" : "text-[#5f6673]"}`}>{t}</button>
            ))}
          </div>
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setVehicleId(""); }} className="w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-2 text-sm">
            <option value="">Select customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName ? `${c.name} (${c.companyName})` : c.name}</option>)}
          </select>
          {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-2 text-sm">
              <option value="">Vehicle (optional)…</option>
              {selectedCustomer.vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          )}
          {error && <p className="text-xs text-[#d32f2f]">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" onClick={apply} disabled={busy}>{busy ? "Creating…" : `Create ${docType}`}</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setApplying(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!applying && (
        <div className="flex items-center gap-3 pt-0.5">
          {capture.status === "ready" && <button type="button" onClick={() => setApplying(true)} className="text-xs font-medium text-[#004787]">Create document</button>}
          {capture.status === "error" && <button type="button" onClick={onRetry} className="text-xs font-medium text-[#004787]">Retry</button>}
          {capture.status === "applied" && capture.appliedDocId && (
            <Link href={capture.appliedKind === "invoice" ? `/invoices/${capture.appliedDocId}` : `/estimates/${capture.appliedDocId}`} className="text-xs font-medium text-[#004787]">View {capture.appliedKind}</Link>
          )}
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-[#d32f2f] ml-auto">Remove</button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { commitPartsPurchase, type PartsPurchaseLineInput } from "@/lib/actions/parts-purchase";
import { round2 } from "@/lib/money";

const DEFAULT_MARKUP = 0.4; // 40% default when no prior sell price is known

interface ExtractedLine {
  description: string;
  partNumber: string | null;
  quantity: number;
  unitCost: number;
  confidence: number;
  matchedItemId: string | null;
  suggestedSellPrice: number | null;
}

interface ReviewLine extends ExtractedLine {
  sellPrice: number;
  include: boolean;
}

export function PartsPurchaseCapture({
  kind,
  docId,
  extractionEnabled,
}: {
  kind: "estimate" | "invoice";
  docId: string;
  extractionEnabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [lines, setLines] = useState<ReviewLine[] | null>(null);
  const [busy, setBusy] = useState<null | "extracting" | "committing">(null);
  const [error, setError] = useState<string | null>(null);

  if (!extractionEnabled) return null;

  function reset() {
    setImage(null);
    setVendorName(null);
    setLines(null);
    setError(null);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setImage(await downscaleToDataUrl(file));
    } catch {
      setError("Could not read that image.");
    }
  }

  async function extract() {
    if (!image) return;
    setBusy("extracting");
    setError(null);
    try {
      const res = await fetch("/api/ai/vendor-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data: { vendorName: string | null; lines: ExtractedLine[]; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      setVendorName(data.vendorName);
      setLines(
        data.lines.map((l) => ({
          ...l,
          sellPrice: l.suggestedSellPrice ?? round2(l.unitCost * (1 + DEFAULT_MARKUP)),
          include: true,
        }))
      );
      if (data.lines.length === 0) setError("No parts found on that photo. Try a clearer shot.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setBusy(null);
    }
  }

  function patch(idx: number, changes: Partial<ReviewLine>) {
    setLines((cur) => cur && cur.map((l, i) => (i === idx ? { ...l, ...changes } : l)));
  }

  function applyMarkup(idx: number, pct: number) {
    setLines((cur) =>
      cur && cur.map((l, i) => (i === idx ? { ...l, sellPrice: round2(l.unitCost * (1 + pct / 100)) } : l))
    );
  }

  async function commit() {
    if (!lines) return;
    const chosen = lines.filter((l) => l.include && l.description.trim());
    if (chosen.length === 0) {
      setError("Select at least one part to add.");
      return;
    }
    setBusy("committing");
    setError(null);
    const payload: PartsPurchaseLineInput[] = chosen.map((l) => ({
      description: l.description,
      partNumber: l.partNumber,
      quantity: l.quantity,
      unitCost: l.unitCost,
      sellPrice: l.sellPrice,
      taxable: true,
      matchedItemId: l.matchedItemId,
    }));
    try {
      await commitPartsPurchase(kind, docId, vendorName, payload);
      reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add parts.");
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#f2862e] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9b4c10] active:bg-[#ffe7d1]"
      >
        📷 Add parts from invoice photo
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-[#c2c6d3] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#9b4c10]">Parts from vendor invoice</p>
        <button type="button" onClick={() => { reset(); setOpen(false); }} className="text-xs font-semibold text-[#5f6673]">Close</button>
      </div>

      {!lines && (
        <>
          <label className="block">
            <span className="sr-only">Vendor invoice photo</span>
            <input type="file" accept="image/*" capture="environment" onChange={onPickImage} className="block w-full text-xs text-[#5f6673] file:mr-3 file:rounded-lg file:border-0 file:bg-[#fff3e8] file:px-3 file:py-2 file:font-semibold file:text-[#9b4c10]" />
          </label>
          {/* eslint-disable-next-line @next/next/no-img-element -- transient data-URL preview, not a hostable asset */}
          {image && <img src={image} alt="vendor invoice preview" className="max-h-56 w-full rounded-lg border border-[#c2c6d3] object-contain" />}
          {error && <p className="text-xs font-semibold text-[#d32f2f]">{error}</p>}
          <Button type="button" size="md" className="w-full" onClick={extract} disabled={busy !== null || !image}>
            {busy === "extracting" ? "Reading invoice…" : "Extract parts"}
          </Button>
          <p className="text-[11px] text-gray-400">Set a sell price for each part — cost stays internal for job profitability.</p>
        </>
      )}

      {lines && (
        <div className="space-y-3">
          {vendorName && <p className="text-xs text-[#5f6673]">Vendor: <span className="font-semibold text-[#191c20]">{vendorName}</span></p>}
          <div className="space-y-2">
            {lines.map((l, idx) => (
              <PartRow key={idx} line={l} onChange={(c) => patch(idx, c)} onMarkup={(pct) => applyMarkup(idx, pct)} />
            ))}
          </div>
          {error && <p className="text-xs font-semibold text-[#d32f2f]">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="md" className="flex-1" onClick={commit} disabled={busy !== null}>
              {busy === "committing" ? "Adding…" : `Add ${lines.filter((l) => l.include).length} part(s)`}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => { setLines(null); setError(null); }}>Back</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PartRow({
  line,
  onChange,
  onMarkup,
}: {
  line: ReviewLine;
  onChange: (c: Partial<ReviewLine>) => void;
  onMarkup: (pct: number) => void;
}) {
  const low = line.confidence < 0.5;
  const margin = line.sellPrice > 0 ? Math.round(((line.sellPrice - line.unitCost) / line.sellPrice) * 100) : 0;
  return (
    <div className={`space-y-2 rounded-lg border p-3 ${line.include ? (low ? "border-[#d32f2f] bg-[#fdecec]" : "border-[#f2862e] bg-[#fff3e8]") : "border-[#c2c6d3] opacity-60"}`}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={line.include} onChange={(e) => onChange({ include: e.target.checked })} className="h-4 w-4 rounded border-[#c2c6d3] text-[#f2862e]" />
        <input value={line.description} onChange={(e) => onChange({ description: e.target.value })} className="flex-1 rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f2862e]" />
        {low && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#d32f2f]">Check</span>}
      </div>
      <input value={line.partNumber ?? ""} onChange={(e) => onChange({ partNumber: e.target.value || null })} placeholder="Part #" className="w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#f2862e]" />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-gray-500">Qty
          <input type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || 0 })} className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-[11px] text-gray-500">Cost/unit
          <input type="number" step="0.01" min="0" value={line.unitCost} onChange={(e) => onChange({ unitCost: parseFloat(e.target.value) || 0 })} className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-[11px] text-gray-500">Sell/unit
          <input type="number" step="0.01" min="0" value={line.sellPrice} onChange={(e) => onChange({ sellPrice: parseFloat(e.target.value) || 0 })} className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-400">Markup:</span>
        {[25, 40, 60, 100].map((p) => (
          <button key={p} type="button" onClick={() => onMarkup(p)} className="text-[11px] rounded-full border border-gray-200 px-2 py-0.5 text-gray-600 active:bg-gray-100">
            {p}%
          </button>
        ))}
        <span className="text-[11px] text-gray-400 ml-auto">margin {margin}%</span>
      </div>
    </div>
  );
}

/** Downscale an image client-side to keep the upload payload small. */
async function downscaleToDataUrl(file: File, maxDim = 1600): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

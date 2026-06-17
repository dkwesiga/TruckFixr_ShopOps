"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalDocs } from "@/lib/offline/local-docs-provider";
import type { LocalDocKind, LocalDocLine, LocalDocument } from "@/lib/offline/doc-types";
import { Button } from "@/components/ui/button";
import { formatCurrency, round2 } from "@/lib/money";

export function LocalDocEditor({ docId }: { docId?: string }) {
  const router = useRouter();
  const { refCache, online, save, get } = useLocalDocs();
  const [loaded, setLoaded] = useState(false);

  const [kind, setKind] = useState<LocalDocKind>("estimate");
  const [serverId, setServerId] = useState<string | undefined>();
  const [serverNumber, setServerNumber] = useState<string | undefined>();
  const [createdAt, setCreatedAt] = useState<number>(() => Date.now());
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [lines, setLines] = useState<LocalDocLine[]>([]);
  const [pickItem, setPickItem] = useState("");

  useEffect(() => {
    if (!docId) { setLoaded(true); return; }
    void get(docId).then((d) => {
      if (d) {
        setKind(d.kind); setServerId(d.serverId); setServerNumber(d.serverNumber);
        setCreatedAt(d.createdAt); setCustomerId(d.customerId ?? ""); setVehicleId(d.vehicleId ?? "");
        setComplaint(d.complaint ?? ""); setLines(d.lines);
      }
      setLoaded(true);
    });
  }, [docId, get]);

  const customers = refCache?.customers ?? [];
  const items = refCache?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const taxExempt = selectedCustomer?.taxExempt ?? false;
  const taxRate = taxExempt ? 0 : refCache?.taxRate ?? 0;

  const { subtotal, tax, total } = useMemo(() => {
    let sub = 0, taxable = 0;
    for (const l of lines) {
      const lt = round2(l.quantity * l.unitPrice);
      sub += lt;
      if (l.taxable) taxable += lt;
    }
    return { subtotal: round2(sub), tax: round2(taxable * taxRate), total: round2(round2(sub) + round2(taxable * taxRate)) };
  }, [lines, taxRate]);

  function addLine(prefill?: Partial<LocalDocLine>) {
    setLines((cur) => [...cur, {
      id: crypto.randomUUID(),
      type: prefill?.type ?? "part",
      description: prefill?.description ?? "",
      quantity: prefill?.quantity ?? 1,
      unitPrice: prefill?.unitPrice ?? 0,
      taxable: prefill?.taxable ?? true,
    }]);
  }

  function onPickItem(id: string) {
    setPickItem("");
    const item = items.find((i) => i.id === id);
    if (item) addLine({ type: item.type, description: item.partNumber ? `${item.name} (${item.partNumber})` : item.name, quantity: item.defaultQty || 1, unitPrice: item.unitPrice, taxable: item.taxable });
  }

  function patchLine(id: string, c: Partial<LocalDocLine>) {
    setLines((cur) => cur.map((l) => (l.id === id ? { ...l, ...c } : l)));
  }
  function removeLine(id: string) {
    setLines((cur) => cur.filter((l) => l.id !== id));
  }

  async function saveDoc() {
    const now = Date.now();
    const doc: LocalDocument = {
      id: docId ?? crypto.randomUUID(),
      kind,
      serverId,
      serverNumber,
      customerId: customerId || undefined,
      customerName: selectedCustomer ? (selectedCustomer.companyName || selectedCustomer.name) : undefined,
      vehicleId: vehicleId || undefined,
      vehicleLabel: selectedCustomer?.vehicles.find((v) => v.id === vehicleId)?.label,
      complaint: complaint.trim() || undefined,
      lines: lines.filter((l) => l.description.trim()),
      taxRate,
      taxExempt,
      syncState: "local", // any edit returns it to the sync queue
      createdAt,
      updatedAt: now,
    };
    await save(doc);
    router.push("/drafts");
  }

  if (!loaded) return <p className="text-sm text-[#5f6673]">Loading…</p>;

  return (
    <div className="space-y-4">
      {!refCache && (
        <div className="rounded-lg border border-[#f2862e]/40 bg-[#fff3e8] px-4 py-3 text-sm text-[#9b4c10]">
          Customer list not cached yet. You can write lines now; connect once to load customers, then assign one before it syncs.
        </div>
      )}

      {!serverId && (
        <div className="industrial-card p-1 flex gap-1">
          {(["estimate", "invoice"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize ${kind === k ? "bg-[#004787] text-white" : "text-[#5f6673]"}`}>{k}</button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[#424955]">Customer</label>
        <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setVehicleId(""); }} className="w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base min-h-12">
          <option value="">{customers.length ? "Select customer…" : "No cached customers"}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName ? `${c.name} (${c.companyName})` : c.name}</option>)}
        </select>
      </div>

      {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#424955]">Vehicle / unit</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base min-h-12">
            <option value="">Optional…</option>
            {selectedCustomer.vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[#424955]">Complaint / work</label>
        <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} rows={2} placeholder="What the customer wants done" className="w-full rounded-lg border border-[#c2c6d3] px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004787]" />
      </div>

      {/* Lines */}
      <div>
        <h2 className="industrial-label mb-2">Line items</h2>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="industrial-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select value={l.type} onChange={(e) => patchLine(l.id, { type: e.target.value as LocalDocLine["type"] })} className="rounded-lg border border-[#c2c6d3] px-2 py-1 text-xs">
                  <option value="part">Part</option><option value="labour">Labour</option><option value="fee">Fee</option>
                </select>
                <button type="button" onClick={() => removeLine(l.id)} className="ml-auto text-xs font-semibold text-[#d32f2f]">Remove</button>
              </div>
              <input value={l.description} onChange={(e) => patchLine(l.id, { description: e.target.value })} placeholder="Description" className="w-full rounded-lg border border-[#c2c6d3] px-2.5 py-1.5 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.01" min="0" value={l.quantity} onChange={(e) => patchLine(l.id, { quantity: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-[#c2c6d3] px-2.5 py-1.5 text-sm" placeholder="Qty" />
                <input type="number" step="0.01" min="0" value={l.unitPrice} onChange={(e) => patchLine(l.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-[#c2c6d3] px-2.5 py-1.5 text-sm" placeholder="Unit price" />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#5f6673]">
                <input type="checkbox" checked={l.taxable} onChange={(e) => patchLine(l.id, { taxable: e.target.checked })} className="w-4 h-4 rounded border-[#c2c6d3]" /> Taxable
              </label>
            </div>
          ))}
        </div>

        <div className="mt-2 space-y-2">
          {items.length > 0 && (
            <select value={pickItem} onChange={(e) => onPickItem(e.target.value)} className="w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-2 text-sm">
              <option value="">Add from library…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.type === "labour" ? "🔧 " : "📦 "}{i.name}{i.partNumber ? ` · ${i.partNumber}` : ""}</option>)}
            </select>
          )}
          <Button type="button" variant="secondary" size="md" className="w-full" onClick={() => addLine()}>+ Add custom line</Button>
        </div>
      </div>

      {/* Totals */}
      <div className="industrial-card p-4 space-y-1.5">
        <Row label="Subtotal" value={formatCurrency(subtotal)} />
        <Row label={taxExempt ? "Tax (exempt)" : "Tax"} value={formatCurrency(tax)} />
        <div className="border-t border-[#c2c6d3] pt-1.5"><Row label="Total" value={formatCurrency(total)} bold /></div>
      </div>

      <Button type="button" size="lg" className="w-full" onClick={saveDoc} disabled={lines.filter((l) => l.description.trim()).length === 0}>
        Save draft
      </Button>
      <p className="text-[11px] text-[#858b98] text-center">
        Saved on this device. {online ? "Syncs to your ledger automatically." : "Will sync when you reconnect."}
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-bold text-[#191c20]" : "text-[#5f6673]"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-[#191c20]" : "text-[#191c20]"}`}>{value}</span>
    </div>
  );
}

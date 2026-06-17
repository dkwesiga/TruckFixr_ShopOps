"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/money";

export interface LineView {
  id: string;
  type: "labour" | "part" | "fee";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxable: boolean;
  aiSuggested: boolean;
  isVariance: boolean;
}

export interface ItemOption {
  id: string;
  type: "labour" | "part" | "fee";
  name: string;
  partNumber: string | null;
  unitPrice: number; // sell price (parts) or default rate (labour)
  defaultQty: number; // default time (labour) or 1
  taxable: boolean;
}

interface LineEditorProps {
  docId: string;
  idFieldName: "estimateId" | "invoiceId";
  lines: LineView[];
  items: ItemOption[];
  readOnly?: boolean;
  showVariance?: boolean;
  addAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

const TYPE_LABEL: Record<LineView["type"], string> = {
  labour: "Labour",
  part: "Part",
  fee: "Fee",
};

export function LineEditor({
  docId,
  idFieldName,
  lines,
  items,
  readOnly = false,
  showVariance = false,
  addAction,
  updateAction,
  deleteAction,
}: LineEditorProps) {
  return (
    <div className="space-y-2">
      {lines.length === 0 && (
        <p className="text-sm text-[#858b98] text-center py-6 industrial-card">
          No lines yet.{readOnly ? "" : " Add labour and parts below."}
        </p>
      )}

      {lines.map((line) => (
        <LineRow
          key={line.id}
          line={line}
          docId={docId}
          idFieldName={idFieldName}
          readOnly={readOnly}
          showVariance={showVariance}
          updateAction={updateAction}
          deleteAction={deleteAction}
        />
      ))}

      {!readOnly && (
        <AddLineForm
          docId={docId}
          idFieldName={idFieldName}
          items={items}
          addAction={addAction}
        />
      )}
    </div>
  );
}

function LineRow({
  line,
  docId,
  idFieldName,
  readOnly,
  showVariance,
  updateAction,
  deleteAction,
}: {
  line: LineView;
  docId: string;
  idFieldName: "estimateId" | "invoiceId";
  readOnly: boolean;
  showVariance: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && !readOnly) {
    return (
      <form action={updateAction} className="bg-white rounded-lg border border-blue-200 p-3 space-y-2.5">
        <input type="hidden" name="lineId" value={line.id} />
        <input type="hidden" name={idFieldName} value={docId} />
        <input
          name="description"
          defaultValue={line.description}
          required
          className="w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-[#5f6673]">
            Qty / hrs
            <input
              name="quantity"
              type="number"
              step="0.01"
              min="0"
              defaultValue={line.quantity}
              className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
            />
          </label>
          <label className="text-xs text-[#5f6673]">
            Unit price
            <input
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={line.unitPrice}
              className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#424955]">
          <input type="checkbox" name="taxable" value="true" defaultChecked={line.taxable} className="w-4 h-4 rounded border-[#c2c6d3] text-[#004787]" />
          Taxable
        </label>
        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" className="flex-1">Save</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="industrial-card p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-[#858b98] uppercase tracking-wide">{TYPE_LABEL[line.type]}</span>
            {line.aiSuggested && <Badge variant="ai">AI</Badge>}
            {showVariance && line.isVariance && <Badge variant="warning">Added</Badge>}
            {!line.taxable && <span className="text-[10px] text-[#858b98]">non-tax</span>}
          </div>
          <p className="text-sm text-[#191c20] mt-0.5">{line.description}</p>
          <p className="text-xs text-[#5f6673] mt-0.5">
            {line.quantity} × {formatCurrency(line.unitPrice)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-[#191c20]">{formatCurrency(line.total)}</p>
          {!readOnly && (
            <div className="flex items-center gap-2 justify-end mt-1.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-[#004787] font-medium"
              >
                Edit
              </button>
              <form action={deleteAction} className="inline">
                <input type="hidden" name="lineId" value={line.id} />
                <input type="hidden" name={idFieldName} value={docId} />
                <button type="submit" className="text-xs text-[#d32f2f] font-medium">Delete</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLineForm({
  docId,
  idFieldName,
  items,
  addAction,
}: {
  docId: string;
  idFieldName: "estimateId" | "invoiceId";
  items: ItemOption[];
  addAction: (formData: FormData) => Promise<void>;
}) {
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<LineView["type"]>("part");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxable, setTaxable] = useState(true);

  function onPickItem(id: string) {
    setItemId(id);
    const item = items.find((i) => i.id === id);
    if (item) {
      setType(item.type);
      setDescription(item.partNumber ? `${item.name} (${item.partNumber})` : item.name);
      setQuantity(String(item.defaultQty || 1));
      setUnitPrice(item.unitPrice ? String(item.unitPrice) : "");
      setTaxable(item.taxable);
    }
  }

  return (
    <form action={addAction} className="bg-blue-50/50 rounded-lg border border-dashed border-blue-200 p-3 space-y-2.5 mt-3">
      <p className="text-xs font-semibold text-[#5f6673] uppercase tracking-wider">Add line</p>
      <input type="hidden" name={idFieldName} value={docId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="type" value={type} />

      {items.length > 0 && (
        <select
          value={itemId}
          onChange={(e) => onPickItem(e.target.value)}
          className="w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
        >
          <option value="">From library… (or type a custom line)</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.type === "labour" ? "🔧 " : "📦 "}
              {i.name}
              {i.partNumber ? ` · ${i.partNumber}` : ""}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        {(["part", "labour", "fee"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); setItemId(""); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              type === t ? "bg-[#004787] text-white" : "bg-white text-[#5f6673] border border-[#c2c6d3]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <input
        name="description"
        required
        value={description}
        onChange={(e) => { setDescription(e.target.value); setItemId(""); }}
        placeholder={type === "labour" ? "Labour description" : type === "fee" ? "Fee description" : "Part description"}
        className="w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-[#5f6673]">
          {type === "labour" ? "Hours" : "Qty"}
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </label>
        <label className="text-xs text-[#5f6673]">
          {type === "labour" ? "Rate ($/hr)" : "Unit price"}
          <input
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
            className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#424955]">
        <input type="checkbox" name="taxable" value="true" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} className="w-4 h-4 rounded border-[#c2c6d3] text-[#004787]" />
        Taxable
      </label>

      <Button type="submit" size="sm" className="w-full">+ Add line</Button>
    </form>
  );
}

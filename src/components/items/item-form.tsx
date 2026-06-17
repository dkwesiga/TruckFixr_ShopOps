"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ItemFormProps {
  defaultType?: "labour" | "part";
  defaultValues?: {
    name?: string;
    description?: string | undefined;
    partNumber?: string | undefined;
    cost?: number | null;
    sellPrice?: number | null;
    defaultRate?: number | null;
    defaultTime?: number | null;
    taxable?: boolean;
    qtyOnHand?: number | null;
    fitmentMake?: string | null;
    fitmentModel?: string | null;
    fitmentYearFrom?: number | null;
    fitmentYearTo?: number | null;
  };
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  returnTo?: string;
}

export function ItemForm({ defaultType = "part", defaultValues = {}, action, submitLabel = "Save item", returnTo }: ItemFormProps) {
  const [type, setType] = useState<"labour" | "part">(defaultType);

  return (
    <form action={action} className="px-4 py-5 space-y-4">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="type" value={type} />

      {/* Type toggle */}
      <div>
        <p className="text-sm font-medium text-[#424955] mb-1.5">Type</p>
        <div className="flex gap-2 p-1 bg-[#eef0f5] rounded-xl">
          {(["part", "labour"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                type === t ? "bg-white text-[#191c20] shadow-sm" : "text-[#5f6673]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Input label="Name" name="name" required defaultValue={defaultValues.name ?? ""} placeholder={type === "labour" ? "e.g. Oil Change" : "e.g. Oil Filter"} />
      <Textarea label="Description" name="description" defaultValue={defaultValues.description ?? ""} placeholder="Optional details" rows={2} />

      {type === "part" && (
        <>
          <Input label="Part number" name="partNumber" defaultValue={defaultValues.partNumber ?? ""} placeholder="e.g. LF3349" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cost ($/unit)" name="cost" type="number" step="0.01" min="0" defaultValue={defaultValues.cost ?? ""} placeholder="0.00" />
            <Input label="Sell price ($/unit)" name="sellPrice" type="number" step="0.01" min="0" defaultValue={defaultValues.sellPrice ?? ""} placeholder="0.00" />
          </div>
          <Input label="Qty on hand" name="qtyOnHand" type="number" step="0.01" min="0" defaultValue={defaultValues.qtyOnHand ?? ""} placeholder="0" />

          <div className="pt-1">
            <p className="industrial-label mb-3">Fitment (optional)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Make" name="fitmentMake" defaultValue={defaultValues.fitmentMake ?? ""} placeholder="e.g. Kenworth" />
                <Input label="Model" name="fitmentModel" defaultValue={defaultValues.fitmentModel ?? ""} placeholder="e.g. T680" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Year from" name="fitmentYearFrom" type="number" defaultValue={defaultValues.fitmentYearFrom ?? ""} placeholder="2015" />
                <Input label="Year to" name="fitmentYearTo" type="number" defaultValue={defaultValues.fitmentYearTo ?? ""} placeholder="2024" />
              </div>
            </div>
          </div>
        </>
      )}

      {type === "labour" && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rate ($/hr)" name="defaultRate" type="number" step="0.01" min="0" defaultValue={defaultValues.defaultRate ?? ""} placeholder="0.00" />
          <Input label="Default time (hr)" name="defaultTime" type="number" step="0.25" min="0" defaultValue={defaultValues.defaultTime ?? ""} placeholder="1.0" />
        </div>
      )}

      <div className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id="taxable"
          name="taxable"
          value="true"
          defaultChecked={defaultValues.taxable !== false}
          className="w-4 h-4 rounded border-[#c2c6d3] text-[#004787] focus:ring-[#004787]"
        />
        <label htmlFor="taxable" className="text-sm text-[#424955]">Taxable</label>
      </div>

      <Button type="submit" size="lg" className="w-full mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}

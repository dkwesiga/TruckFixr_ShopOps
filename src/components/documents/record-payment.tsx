"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";

/**
 * Collapsible "Record a payment" form. Pre-fills the amount with the remaining
 * balance and today's date; the owner can override either.
 */
export function RecordPayment({
  invoiceId,
  balanceDue,
  action,
}: {
  invoiceId: string;
  balanceDue: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!open) {
    return (
      <Button type="button" size="lg" className="w-full" onClick={() => setOpen(true)}>
        Record a payment
      </Button>
    );
  }

  return (
    <form action={action} className="industrial-card p-4 space-y-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-[#5f6673]">
          Amount
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={balanceDue > 0 ? balanceDue.toFixed(2) : ""}
            className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </label>
        <label className="text-xs text-[#5f6673]">
          Date
          <input
            name="date"
            type="date"
            defaultValue={today}
            className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </label>
      </div>
      <label className="text-xs text-[#5f6673] block">
        Method
        <select
          name="method"
          defaultValue="cash"
          className="mt-0.5 w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
        >
          {PAYMENT_METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
      <input
        name="referenceNumber"
        placeholder="Reference # (optional)"
        className="w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="w-full rounded-lg border border-[#c2c6d3] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />
      <div className="flex gap-2">
        <Button type="submit" size="md" className="flex-1">Save payment</Button>
        <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

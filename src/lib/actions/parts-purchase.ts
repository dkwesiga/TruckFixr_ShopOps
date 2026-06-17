"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";
import { recalcEstimateTotals, recalcInvoiceTotals } from "@/lib/documents";
import { lineTotal } from "@/lib/money";

export interface PartsPurchaseLineInput {
  description: string;
  partNumber: string | null;
  quantity: number;
  unitCost: number; // vendor cost per unit (internal)
  sellPrice: number; // owner-set sell price per unit
  taxable: boolean;
  matchedItemId: string | null;
}

/**
 * Add priced parts (captured from a vendor invoice photo) to a job. Each part is
 * upserted into the item library with its latest cost/sell price and fitment from
 * the job's vehicle (Section 5). Cost is stored on invoice lines for profitability;
 * estimate lines carry only the sell price (cost lives on the item).
 */
export async function commitPartsPurchase(
  kind: "estimate" | "invoice",
  docId: string,
  vendorName: string | null,
  lines: PartsPurchaseLineInput[]
): Promise<{ added: number }> {
  const { userId, companyId } = await getSessionContext();
  const clean = sanitize(lines);

  const added = await withRLS(userId, companyId, async (tx) => {
    const vehicle = await loadVehicle(tx, kind, docId, companyId);
    if (vehicle === undefined) return 0; // doc not found / not in company

    let n = 0;
    for (const line of clean) {
      const itemId = await upsertPartItem(tx, companyId, line, vehicle);

      if (kind === "estimate") {
        const count = await tx.estimateLine.count({ where: { estimateId: docId } });
        await tx.estimateLine.create({
          data: {
            estimateId: docId,
            itemId,
            type: "part",
            description: lineDescription(line),
            quantity: line.quantity,
            unitPrice: line.sellPrice,
            total: lineTotal(line.quantity, line.sellPrice),
            taxable: line.taxable,
            sortOrder: count,
          },
        });
      } else {
        const invoice = await tx.invoice.findUnique({ where: { id: docId }, select: { estimateId: true } });
        const count = await tx.invoiceLine.count({ where: { invoiceId: docId } });
        await tx.invoiceLine.create({
          data: {
            invoiceId: docId,
            itemId,
            type: "part",
            description: lineDescription(line),
            quantity: line.quantity,
            unitPrice: line.sellPrice,
            cost: line.unitCost,
            total: lineTotal(line.quantity, line.sellPrice),
            taxable: line.taxable,
            isVariance: invoice?.estimateId != null,
            sortOrder: count,
          },
        });
      }
      n++;
    }

    if (n === 0) return 0;

    if (kind === "estimate") {
      if (vendorName) await appendVendorNote(tx, "estimate", docId, vendorName);
      await recalcEstimateTotals(tx, docId, companyId);
    } else {
      const variance = await tx.invoiceLine.count({ where: { invoiceId: docId, isVariance: true } });
      await tx.invoice.update({ where: { id: docId }, data: { hasVariance: variance > 0 } });
      if (vendorName) await appendVendorNote(tx, "invoice", docId, vendorName);
      await recalcInvoiceTotals(tx, docId, companyId);
    }
    return n;
  });

  revalidatePath(kind === "estimate" ? `/estimates/${docId}` : `/invoices/${docId}`);
  return { added };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type VehicleFitment = { make: string | null; model: string | null; year: number | null } | null;

async function loadVehicle(
  tx: Prisma.TransactionClient,
  kind: "estimate" | "invoice",
  docId: string,
  companyId: string
): Promise<VehicleFitment | undefined> {
  if (kind === "estimate") {
    const est = await tx.estimate.findUnique({
      where: { id: docId, companyId },
      select: { vehicle: { select: { make: true, model: true, year: true } } },
    });
    if (!est) return undefined;
    return est.vehicle ?? null;
  }
  const inv = await tx.invoice.findUnique({
    where: { id: docId, companyId },
    select: { vehicle: { select: { make: true, model: true, year: true } } },
  });
  if (!inv) return undefined;
  return inv.vehicle ?? null;
}

async function upsertPartItem(
  tx: Prisma.TransactionClient,
  companyId: string,
  line: PartsPurchaseLineInput,
  vehicle: VehicleFitment
): Promise<string> {
  if (line.matchedItemId) {
    const existing = await tx.item.findFirst({ where: { id: line.matchedItemId, companyId }, select: { id: true } });
    if (existing) {
      // Last-cost tracking: refresh cost and the most recent sell price.
      await tx.item.update({
        where: { id: existing.id },
        data: { cost: line.unitCost, sellPrice: line.sellPrice, ...(line.partNumber ? { partNumber: line.partNumber } : {}) },
      });
      return existing.id;
    }
  }

  const created = await tx.item.create({
    data: {
      companyId,
      type: "part",
      name: line.description,
      partNumber: line.partNumber,
      cost: line.unitCost,
      sellPrice: line.sellPrice,
      taxable: line.taxable,
      // Auto-fitment from the job's vehicle (single model year; owner can widen later).
      fitmentMake: vehicle?.make ?? null,
      fitmentModel: vehicle?.model ?? null,
      fitmentYearFrom: vehicle?.year ?? null,
      fitmentYearTo: vehicle?.year ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

async function appendVendorNote(
  tx: Prisma.TransactionClient,
  kind: "estimate" | "invoice",
  docId: string,
  vendorName: string
): Promise<void> {
  const note = `Parts from ${vendorName}`;
  if (kind === "estimate") {
    const est = await tx.estimate.findUnique({ where: { id: docId }, select: { internalNotes: true } });
    if (est && !(est.internalNotes ?? "").includes(note)) {
      await tx.estimate.update({
        where: { id: docId },
        data: { internalNotes: est.internalNotes ? `${est.internalNotes}\n${note}` : note },
      });
    }
  } else {
    const inv = await tx.invoice.findUnique({ where: { id: docId }, select: { internalNotes: true } });
    if (inv && !(inv.internalNotes ?? "").includes(note)) {
      await tx.invoice.update({
        where: { id: docId },
        data: { internalNotes: inv.internalNotes ? `${inv.internalNotes}\n${note}` : note },
      });
    }
  }
}

function lineDescription(line: PartsPurchaseLineInput): string {
  return line.partNumber ? `${line.description} (${line.partNumber})` : line.description;
}

function sanitize(lines: PartsPurchaseLineInput[]): PartsPurchaseLineInput[] {
  return (lines ?? [])
    .map((l) => ({
      description: String(l.description ?? "").trim(),
      partNumber: l.partNumber ? String(l.partNumber).trim() || null : null,
      quantity: Number.isFinite(l.quantity) && l.quantity > 0 ? l.quantity : 1,
      unitCost: Number.isFinite(l.unitCost) && l.unitCost >= 0 ? l.unitCost : 0,
      sellPrice: Number.isFinite(l.sellPrice) && l.sellPrice >= 0 ? l.sellPrice : 0,
      taxable: l.taxable !== false,
      matchedItemId: l.matchedItemId ?? null,
    }))
    .filter((l) => l.description.length > 0);
}

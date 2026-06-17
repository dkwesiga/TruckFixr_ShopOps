"use server";

import { revalidatePath } from "next/cache";
import type { ItemType } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";
import {
  nextEstimateNumber,
  nextInvoiceNumber,
  recalcEstimateTotals,
  recalcInvoiceTotals,
} from "@/lib/documents";
import { lineTotal } from "@/lib/money";

export interface ApplyDraftLine {
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  confidence: number;
  matchedItemId: string | null;
}

export interface ApplyDraftInput {
  customerId: string;
  vehicleId?: string | null;
  lines: ApplyDraftLine[];
  complaint?: string | null;
  recommendedWork?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
}

/** Create a new estimate (header + AI-suggested lines) from an offline capture draft. */
export async function createEstimateFromDraft(input: ApplyDraftInput): Promise<{ id: string }> {
  const { userId, companyId } = await getSessionContext();
  if (!input.customerId) throw new Error("Pick a customer.");

  const id = await withRLS(userId, companyId, async (tx) => {
    const company = await tx.company.findUnique({ where: { id: companyId }, select: { numberingPrefix: true } });
    const estimate = await tx.estimate.create({
      data: {
        companyId,
        estimateNumber: await nextEstimateNumber(tx, companyId, company?.numberingPrefix),
        customerId: input.customerId,
        vehicleId: input.vehicleId || null,
        complaint: input.complaint || null,
        recommendedWork: input.recommendedWork || null,
        customerNotes: input.customerNote || null,
        internalNotes: input.internalNote || null,
      },
    });

    let sort = 0;
    for (const l of sanitize(input.lines)) {
      await tx.estimateLine.create({
        data: {
          estimateId: estimate.id,
          itemId: l.matchedItemId,
          type: l.type,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: lineTotal(l.quantity, l.unitPrice),
          taxable: l.taxable,
          aiSuggested: true,
          aiConfidence: l.confidence,
          sortOrder: sort++,
        },
      });
    }
    await recalcEstimateTotals(tx, estimate.id, companyId);
    return estimate.id;
  });

  revalidatePath("/estimates");
  return { id };
}

/** Create a new invoice (header + AI-suggested lines) from an offline capture draft. */
export async function createInvoiceFromDraft(input: ApplyDraftInput): Promise<{ id: string }> {
  const { userId, companyId } = await getSessionContext();
  if (!input.customerId) throw new Error("Pick a customer.");

  const id = await withRLS(userId, companyId, async (tx) => {
    const company = await tx.company.findUnique({ where: { id: companyId }, select: { numberingPrefix: true } });
    const customer = await tx.customer.findUnique({ where: { id: input.customerId }, select: { paymentTerms: true } });
    const invoice = await tx.invoice.create({
      data: {
        companyId,
        invoiceNumber: await nextInvoiceNumber(tx, companyId, company?.numberingPrefix),
        customerId: input.customerId,
        vehicleId: input.vehicleId || null,
        paymentTerms: customer?.paymentTerms ?? null,
        internalNotes: input.internalNote || input.complaint || null,
        customerNotes: input.customerNote || null,
      },
    });

    let sort = 0;
    for (const l of sanitize(input.lines)) {
      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          itemId: l.matchedItemId,
          type: l.type,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: lineTotal(l.quantity, l.unitPrice),
          taxable: l.taxable,
          aiSuggested: true,
          aiConfidence: l.confidence,
          sortOrder: sort++,
        },
      });
    }
    await recalcInvoiceTotals(tx, invoice.id, companyId);
    return invoice.id;
  });

  revalidatePath("/invoices");
  return { id };
}

const VALID_TYPES: ItemType[] = ["labour", "part", "fee"];

function sanitize(lines: ApplyDraftLine[]): ApplyDraftLine[] {
  return (lines ?? [])
    .map((l) => ({
      type: VALID_TYPES.includes(l.type) ? l.type : ("part" as ItemType),
      description: String(l.description ?? "").trim(),
      quantity: Number.isFinite(l.quantity) ? l.quantity : 1,
      unitPrice: Number.isFinite(l.unitPrice) ? l.unitPrice : 0,
      taxable: l.taxable !== false,
      confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0.7)),
      matchedItemId: l.matchedItemId ?? null,
    }))
    .filter((l) => l.description.length > 0);
}

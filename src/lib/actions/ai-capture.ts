"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, ItemType, AiCaptureType } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";
import { recalcEstimateTotals, recalcInvoiceTotals } from "@/lib/documents";
import { lineTotal } from "@/lib/money";

export interface CommitLineInput {
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  confidence: number;
  matchedItemId: string | null;
  /** The wording the AI originally proposed — used to detect user corrections. */
  aiOriginalDescription: string;
}

interface CommitMeta {
  complaint?: string | null;
  recommendedWork?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  fromImage?: boolean;
}

export async function commitEstimateDraft(
  estimateId: string,
  lines: CommitLineInput[],
  meta: CommitMeta = {}
): Promise<{ added: number }> {
  const { userId, companyId } = await getSessionContext();

  const added = await withRLS(userId, companyId, async (tx) => {
    const estimate = await tx.estimate.findUnique({
      where: { id: estimateId, companyId },
      select: { id: true, customerId: true, vehicleId: true, complaint: true, recommendedWork: true, customerNotes: true, internalNotes: true },
    });
    if (!estimate) return 0;

    let count = await tx.estimateLine.count({ where: { estimateId } });
    let n = 0;
    for (const line of sanitize(lines)) {
      await tx.estimateLine.create({
        data: {
          estimateId,
          itemId: line.matchedItemId,
          type: line.type,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: lineTotal(line.quantity, line.unitPrice),
          taxable: line.taxable,
          aiSuggested: true,
          aiConfidence: line.confidence,
          sortOrder: count++,
        },
      });
      await maybeLogCorrection(tx, companyId, estimate.customerId, estimate.vehicleId, line, meta.fromImage);
      n++;
    }

    await applyMeta(tx, "estimate", estimate, meta);
    await recalcEstimateTotals(tx, estimateId, companyId);
    return n;
  });

  revalidatePath(`/estimates/${estimateId}`);
  return { added };
}

export async function commitInvoiceDraft(
  invoiceId: string,
  lines: CommitLineInput[],
  meta: CommitMeta = {}
): Promise<{ added: number }> {
  const { userId, companyId } = await getSessionContext();

  const added = await withRLS(userId, companyId, async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId, companyId },
      select: { id: true, customerId: true, vehicleId: true, estimateId: true, customerNotes: true, internalNotes: true },
    });
    if (!invoice) return 0;

    const isVariance = invoice.estimateId != null;
    let count = await tx.invoiceLine.count({ where: { invoiceId } });
    let n = 0;
    for (const line of sanitize(lines)) {
      await tx.invoiceLine.create({
        data: {
          invoiceId,
          itemId: line.matchedItemId,
          type: line.type,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: lineTotal(line.quantity, line.unitPrice),
          taxable: line.taxable,
          aiSuggested: true,
          aiConfidence: line.confidence,
          isVariance,
          sortOrder: count++,
        },
      });
      await maybeLogCorrection(tx, companyId, invoice.customerId, invoice.vehicleId, line, meta.fromImage);
      n++;
    }

    if (isVariance && n > 0) {
      await tx.invoice.update({ where: { id: invoiceId }, data: { hasVariance: true } });
    }
    await applyMeta(tx, "invoice", invoice, meta);
    await recalcInvoiceTotals(tx, invoiceId, companyId);
    return n;
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { added };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TYPES: ItemType[] = ["labour", "part", "fee"];

function sanitize(lines: CommitLineInput[]): CommitLineInput[] {
  return (lines ?? [])
    .map((l) => ({
      type: VALID_TYPES.includes(l.type) ? l.type : ("part" as ItemType),
      description: String(l.description ?? "").trim(),
      quantity: Number.isFinite(l.quantity) ? l.quantity : 1,
      unitPrice: Number.isFinite(l.unitPrice) ? l.unitPrice : 0,
      taxable: l.taxable !== false,
      confidence: clamp01(Number(l.confidence)),
      matchedItemId: l.matchedItemId ?? null,
      aiOriginalDescription: String(l.aiOriginalDescription ?? "").trim(),
    }))
    .filter((l) => l.description.length > 0);
}

async function maybeLogCorrection(
  tx: Prisma.TransactionClient,
  companyId: string,
  customerId: string | null,
  vehicleId: string | null,
  line: CommitLineInput,
  fromImage?: boolean
): Promise<void> {
  if (!line.aiOriginalDescription || line.aiOriginalDescription === line.description) return;
  const captureType: AiCaptureType = fromImage ? "image_extraction" : "text_extraction";
  await tx.aiCorrectionLog.create({
    data: {
      companyId,
      customerId,
      vehicleId,
      itemId: line.matchedItemId,
      fieldName: "description",
      originalValue: line.aiOriginalDescription,
      correctedValue: line.description,
      captureType,
    },
  });
}

async function applyMeta(
  tx: Prisma.TransactionClient,
  kind: "estimate" | "invoice",
  current: { id: string; complaint?: string | null; recommendedWork?: string | null; customerNotes: string | null; internalNotes: string | null },
  meta: CommitMeta
): Promise<void> {
  // Only fill fields that are currently empty so we never clobber the owner's edits.
  if (kind === "estimate") {
    const data: Prisma.EstimateUpdateInput = {};
    if (meta.complaint && !current.complaint) data.complaint = meta.complaint;
    if (meta.recommendedWork && !current.recommendedWork) data.recommendedWork = meta.recommendedWork;
    if (meta.customerNote && !current.customerNotes) data.customerNotes = meta.customerNote;
    if (meta.internalNote && !current.internalNotes) data.internalNotes = meta.internalNote;
    if (Object.keys(data).length) {
      await tx.estimate.update({ where: { id: current.id }, data });
    }
  } else {
    const data: Prisma.InvoiceUpdateInput = {};
    if (meta.customerNote && !current.customerNotes) data.customerNotes = meta.customerNote;
    if (meta.internalNote && !current.internalNotes) data.internalNotes = meta.internalNote;
    if (Object.keys(data).length) {
      await tx.invoice.update({ where: { id: current.id }, data });
    }
  }
}

function clamp01(n: number): number {
  if (isNaN(n)) return 0.7;
  return Math.max(0, Math.min(1, n));
}

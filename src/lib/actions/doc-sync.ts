"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, ItemType } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";
import {
  nextEstimateNumber,
  nextInvoiceNumber,
  recalcEstimateTotals,
  recalcInvoiceTotals,
} from "@/lib/documents";
import { lineTotal } from "@/lib/money";

export interface SyncDocLine {
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

export interface SyncDocInput {
  kind: "estimate" | "invoice";
  serverId?: string | null;
  customerId: string;
  vehicleId?: string | null;
  complaint?: string | null;
  lines: SyncDocLine[];
}

export interface SyncDocResult {
  serverId: string;
  serverNumber: string;
  syncedAt: number;
  conflict?: boolean; // server doc was past draft → local edits not applied
}

/**
 * Mirror a locally-created/edited draft document to the server.
 * - No serverId → insert a new draft.
 * - serverId + server doc still "draft" → last-write-wins: replace header + lines from local.
 * - serverId + server doc past draft → conflict: server wins, local edits dropped (flagged).
 */
export async function syncLocalDocument(input: SyncDocInput): Promise<SyncDocResult> {
  const { userId, companyId } = await getSessionContext();
  if (!input.customerId) throw new Error("Missing customer.");

  const result = await withRLS(userId, companyId, async (tx) => {
    // Ensure the referenced customer is real and in this company.
    const customer = await tx.customer.findUnique({ where: { id: input.customerId, companyId }, select: { id: true } });
    if (!customer) throw new Error("Customer no longer exists.");
    const vehicleId = await resolveVehicle(tx, companyId, input.customerId, input.vehicleId);

    return input.kind === "estimate"
      ? syncEstimate(tx, companyId, input, vehicleId)
      : syncInvoice(tx, companyId, input, vehicleId);
  });

  revalidatePath(input.kind === "estimate" ? "/estimates" : "/invoices");
  return result;
}

// ---------------------------------------------------------------------------

async function syncEstimate(
  tx: Prisma.TransactionClient,
  companyId: string,
  input: SyncDocInput,
  vehicleId: string | null
): Promise<SyncDocResult> {
  const lines = sanitize(input.lines);

  if (input.serverId) {
    const existing = await tx.estimate.findUnique({ where: { id: input.serverId, companyId }, select: { id: true, status: true, estimateNumber: true } });
    if (existing) {
      if (existing.status !== "draft") {
        return { serverId: existing.id, serverNumber: existing.estimateNumber, syncedAt: Date.now(), conflict: true };
      }
      await tx.estimateLine.deleteMany({ where: { estimateId: existing.id } });
      await tx.estimate.update({
        where: { id: existing.id },
        data: { customerId: input.customerId, vehicleId, complaint: input.complaint || null, lines: { create: lineCreate(lines) } },
      });
      await recalcEstimateTotals(tx, existing.id, companyId);
      return { serverId: existing.id, serverNumber: existing.estimateNumber, syncedAt: Date.now() };
    }
  }

  const company = await tx.company.findUnique({ where: { id: companyId }, select: { numberingPrefix: true } });
  const estimate = await tx.estimate.create({
    data: {
      companyId,
      estimateNumber: await nextEstimateNumber(tx, companyId, company?.numberingPrefix),
      customerId: input.customerId,
      vehicleId,
      complaint: input.complaint || null,
      lines: { create: lineCreate(lines) },
    },
  });
  await recalcEstimateTotals(tx, estimate.id, companyId);
  return { serverId: estimate.id, serverNumber: estimate.estimateNumber, syncedAt: Date.now() };
}

async function syncInvoice(
  tx: Prisma.TransactionClient,
  companyId: string,
  input: SyncDocInput,
  vehicleId: string | null
): Promise<SyncDocResult> {
  const lines = sanitize(input.lines);

  if (input.serverId) {
    const existing = await tx.invoice.findUnique({ where: { id: input.serverId, companyId }, select: { id: true, status: true, invoiceNumber: true } });
    if (existing) {
      if (existing.status !== "draft") {
        return { serverId: existing.id, serverNumber: existing.invoiceNumber, syncedAt: Date.now(), conflict: true };
      }
      await tx.invoiceLine.deleteMany({ where: { invoiceId: existing.id } });
      await tx.invoice.update({
        where: { id: existing.id },
        data: { customerId: input.customerId, vehicleId, internalNotes: input.complaint || null, lines: { create: lineCreate(lines) } },
      });
      await recalcInvoiceTotals(tx, existing.id, companyId);
      return { serverId: existing.id, serverNumber: existing.invoiceNumber, syncedAt: Date.now() };
    }
  }

  const company = await tx.company.findUnique({ where: { id: companyId }, select: { numberingPrefix: true } });
  const customer = await tx.customer.findUnique({ where: { id: input.customerId }, select: { paymentTerms: true } });
  const invoice = await tx.invoice.create({
    data: {
      companyId,
      invoiceNumber: await nextInvoiceNumber(tx, companyId, company?.numberingPrefix),
      customerId: input.customerId,
      vehicleId,
      paymentTerms: customer?.paymentTerms ?? null,
      internalNotes: input.complaint || null,
      lines: { create: lineCreate(lines) },
    },
  });
  await recalcInvoiceTotals(tx, invoice.id, companyId);
  return { serverId: invoice.id, serverNumber: invoice.invoiceNumber, syncedAt: Date.now() };
}

// ---------------------------------------------------------------------------

async function resolveVehicle(
  tx: Prisma.TransactionClient,
  companyId: string,
  customerId: string,
  vehicleId: string | null | undefined
): Promise<string | null> {
  if (!vehicleId) return null;
  const v = await tx.vehicle.findUnique({ where: { id: vehicleId, companyId }, select: { customerId: true } });
  return v && v.customerId === customerId ? vehicleId : null;
}

const VALID_TYPES: ItemType[] = ["labour", "part", "fee"];

function sanitize(lines: SyncDocLine[]): SyncDocLine[] {
  return (lines ?? [])
    .map((l) => ({
      type: VALID_TYPES.includes(l.type) ? l.type : ("part" as ItemType),
      description: String(l.description ?? "").trim(),
      quantity: Number.isFinite(l.quantity) ? l.quantity : 1,
      unitPrice: Number.isFinite(l.unitPrice) ? l.unitPrice : 0,
      taxable: l.taxable !== false,
    }))
    .filter((l) => l.description.length > 0);
}

function lineCreate(lines: SyncDocLine[]) {
  return lines.map((l, idx) => ({
    type: l.type,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    total: lineTotal(l.quantity, l.unitPrice),
    taxable: l.taxable,
    sortOrder: idx,
  }));
}

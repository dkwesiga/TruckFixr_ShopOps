"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma, ItemType, PaymentMethod } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";
import {
  nextInvoiceNumber,
  recalcInvoiceTotals,
} from "@/lib/documents";
import { resolveDocumentStart } from "@/lib/actions/document-start";
import { lineTotal } from "@/lib/money";
import { emailEnabled } from "@/lib/email/config";
import { dispatchInvoiceEmail } from "@/lib/email/dispatch";

/** Best-effort email send → `?notice=` query param; never throws. */
async function tryEmail(fn: () => Promise<"sent" | "no-email">): Promise<string> {
  if (!emailEnabled) return "";
  try {
    const result = await fn();
    return result === "sent" ? "?notice=emailed" : "?notice=noemail";
  } catch {
    return "?notice=emailfail";
  }
}

// ---------------------------------------------------------------------------
// Creation: direct (walk-in) and conversion from estimate / work order
// ---------------------------------------------------------------------------

export async function createInvoice(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();

  const invoice = await withRLS(userId, companyId, async (tx) => {
    const { customerId, vehicleId } = await resolveDocumentStart(tx, companyId, formData, "/invoices/new");
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { numberingPrefix: true },
    });
    const customer = await tx.customer.findUnique({
      where: { id: customerId!, companyId },
      select: { paymentTerms: true },
    });
    const invoiceDate = new Date();
    return tx.invoice.create({
      data: {
        companyId,
        invoiceNumber: await nextInvoiceNumber(tx, companyId, company?.numberingPrefix),
        customerId,
        vehicleId,
        invoiceDate,
        paymentTerms: customer?.paymentTerms ?? null,
        dueDate: dueDateFromTerms(customer?.paymentTerms ?? null, invoiceDate),
        internalNotes: str(formData.get("complaint")),
      },
    });
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function convertEstimateToInvoice(estimateId: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const invoiceId = await withRLS(userId, companyId, async (tx) => {
    const estimate = await tx.estimate.findUnique({
      where: { id: estimateId, companyId },
      include: { lines: { orderBy: { sortOrder: "asc" } }, invoice: { select: { id: true } }, workOrder: { select: { id: true } } },
    });
    if (!estimate) return null;
    if (estimate.invoice) return estimate.invoice.id; // already converted
    return createInvoiceFromEstimateTx(tx, companyId, estimate);
  });

  if (!invoiceId) redirect(`/estimates/${estimateId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

export async function convertWorkOrderToInvoice(workOrderId: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const invoiceId = await withRLS(userId, companyId, async (tx) => {
    const wo = await tx.workOrder.findUnique({
      where: { id: workOrderId, companyId },
      include: {
        invoice: { select: { id: true } },
        estimate: { include: { lines: { orderBy: { sortOrder: "asc" } }, invoice: { select: { id: true } }, workOrder: { select: { id: true } } } },
      },
    });
    if (!wo) return null;
    if (wo.invoice) return wo.invoice.id;
    if (wo.estimate.invoice) return wo.estimate.invoice.id;
    return createInvoiceFromEstimateTx(tx, companyId, wo.estimate);
  });

  if (!invoiceId) redirect(`/work-orders/${workOrderId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

/** Shared: build an invoice (+lines) from an estimate, link both, and mark them converted. */
async function createInvoiceFromEstimateTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  estimate: Prisma.EstimateGetPayload<{ include: { lines: true; workOrder: { select: { id: true } } } }>
): Promise<string> {
  const company = await tx.company.findUnique({ where: { id: companyId }, select: { numberingPrefix: true } });
  const customer = await tx.customer.findUnique({ where: { id: estimate.customerId }, select: { paymentTerms: true } });
  const invoiceDate = new Date();

  const invoice = await tx.invoice.create({
    data: {
      companyId,
      invoiceNumber: await nextInvoiceNumber(tx, companyId, company?.numberingPrefix),
      customerId: estimate.customerId,
      vehicleId: estimate.vehicleId,
      estimateId: estimate.id,
      workOrderId: estimate.workOrder?.id ?? null,
      invoiceDate,
      paymentTerms: customer?.paymentTerms ?? null,
      dueDate: dueDateFromTerms(customer?.paymentTerms ?? null, invoiceDate),
      customerNotes: estimate.customerNotes,
      internalNotes: estimate.internalNotes,
      lines: {
        create: estimate.lines.map((l, idx) => ({
          itemId: l.itemId,
          type: l.type,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
          taxable: l.taxable,
          aiSuggested: l.aiSuggested,
          aiConfidence: l.aiConfidence,
          isVariance: false,
          sortOrder: idx,
        })),
      },
    },
  });

  await recalcInvoiceTotals(tx, invoice.id, companyId);
  await tx.estimate.update({ where: { id: estimate.id }, data: { status: "converted" } });
  if (estimate.workOrder?.id) {
    await tx.workOrder.update({ where: { id: estimate.workOrder.id }, data: { status: "invoiced" } });
  }
  return invoice.id;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export async function updateInvoiceHeader(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.invoice.update({
      where: { id, companyId },
      data: {
        vehicleId: str(formData.get("vehicleId")),
        paymentTerms: str(formData.get("paymentTerms")),
        dueDate: date(formData.get("dueDate")),
        customerNotes: str(formData.get("customerNotes")),
        internalNotes: str(formData.get("internalNotes")),
      },
    })
  );
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

// ---------------------------------------------------------------------------
// Line management
// ---------------------------------------------------------------------------

export async function addInvoiceLine(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const invoiceId = str(formData.get("invoiceId"));
  const description = str(formData.get("description"));
  if (!invoiceId || !description) redirect(`/invoices/${invoiceId ?? ""}?error=Line+needs+a+description`);

  const quantity = dec(formData.get("quantity")) ?? 1;
  const unitPrice = dec(formData.get("unitPrice")) ?? 0;
  const type = (str(formData.get("type")) as ItemType | null) ?? "part";

  await withRLS(userId, companyId, async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId!, companyId }, select: { estimateId: true } });
    if (!invoice) return;
    const count = await tx.invoiceLine.count({ where: { invoiceId: invoiceId! } });
    // A line added to an invoice that came from an estimate is "beyond estimate" → variance.
    const isVariance = invoice.estimateId != null;
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoiceId!,
        itemId: str(formData.get("itemId")),
        type,
        description: description!,
        quantity,
        unitPrice,
        total: lineTotal(quantity, unitPrice),
        taxable: formData.get("taxable") !== null,
        isVariance,
        sortOrder: count,
      },
    });
    await syncVarianceFlag(tx, invoiceId!);
    await recalcInvoiceTotals(tx, invoiceId!, companyId);
  });

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoiceLine(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const lineId = str(formData.get("lineId"));
  const invoiceId = str(formData.get("invoiceId"));
  if (!lineId || !invoiceId) redirect(`/invoices/${invoiceId ?? ""}`);

  const quantity = dec(formData.get("quantity")) ?? 1;
  const unitPrice = dec(formData.get("unitPrice")) ?? 0;

  await withRLS(userId, companyId, async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId!, companyId }, select: { id: true } });
    if (!invoice) return;
    await tx.invoiceLine.update({
      where: { id: lineId! },
      data: {
        description: str(formData.get("description")) ?? "",
        quantity,
        unitPrice,
        total: lineTotal(quantity, unitPrice),
        taxable: formData.get("taxable") !== null,
      },
    });
    await recalcInvoiceTotals(tx, invoiceId!, companyId);
  });

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceLine(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const lineId = str(formData.get("lineId"));
  const invoiceId = str(formData.get("invoiceId"));
  if (!lineId || !invoiceId) redirect(`/invoices/${invoiceId ?? ""}`);

  await withRLS(userId, companyId, async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId!, companyId }, select: { id: true } });
    if (!invoice) return;
    await tx.invoiceLine.delete({ where: { id: lineId! } });
    await syncVarianceFlag(tx, invoiceId!);
    await recalcInvoiceTotals(tx, invoiceId!, companyId);
  });

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function sendInvoice(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.invoice.update({ where: { id, companyId }, data: { status: "sent", sentAt: new Date() } })
  );
  const notice = await tryEmail(() => dispatchInvoiceEmail(id, companyId));
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}${notice}`);
}

/** Explicitly (re)email the invoice to the customer. */
export async function emailInvoice(id: string): Promise<void> {
  const { companyId } = await getSessionContext();
  const notice = await tryEmail(() => dispatchInvoiceEmail(id, companyId));
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}${notice}`);
}

export async function voidInvoice(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.invoice.update({ where: { id, companyId }, data: { status: "void" } })
  );
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id, companyId }, select: { status: true, estimateId: true, workOrderId: true } });
    if (!invoice || invoice.status !== "draft") return;
    // Re-open any linked estimate / work order so the job isn't stuck "converted".
    if (invoice.estimateId) await tx.estimate.update({ where: { id: invoice.estimateId }, data: { status: "approved" } });
    if (invoice.workOrderId) await tx.workOrder.update({ where: { id: invoice.workOrderId }, data: { status: "done" } });
    await tx.invoice.delete({ where: { id } });
  });
  revalidatePath("/invoices");
  redirect("/invoices");
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordPayment(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const invoiceId = str(formData.get("invoiceId"));
  const amount = dec(formData.get("amount"));
  if (!invoiceId) redirect("/invoices");
  if (!amount || amount <= 0) redirect(`/invoices/${invoiceId}?error=Enter+a+payment+amount`);

  const method = (str(formData.get("method")) as PaymentMethod | null) ?? "cash";

  await withRLS(userId, companyId, async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId!, companyId }, select: { customerId: true } });
    if (!invoice) return;
    await tx.payment.create({
      data: {
        companyId,
        invoiceId: invoiceId!,
        customerId: invoice.customerId,
        amount,
        method,
        date: date(formData.get("date")) ?? new Date(),
        referenceNumber: str(formData.get("referenceNumber")),
        notes: str(formData.get("notes")),
      },
    });
    await recalcInvoiceTotals(tx, invoiceId!, companyId);
  });

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function deletePayment(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const paymentId = str(formData.get("paymentId"));
  const invoiceId = str(formData.get("invoiceId"));
  if (!paymentId || !invoiceId) redirect(`/invoices/${invoiceId ?? ""}`);

  await withRLS(userId, companyId, async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId! }, select: { companyId: true } });
    if (!payment || payment.companyId !== companyId) return;
    await tx.payment.delete({ where: { id: paymentId! } });
    await recalcInvoiceTotals(tx, invoiceId!, companyId);
  });

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set invoice.hasVariance true if any of its lines is flagged a variance. */
async function syncVarianceFlag(tx: Prisma.TransactionClient, invoiceId: string): Promise<void> {
  const variance = await tx.invoiceLine.count({ where: { invoiceId, isVariance: true } });
  await tx.invoice.update({ where: { id: invoiceId }, data: { hasVariance: variance > 0 } });
}

function dueDateFromTerms(terms: string | null, from: Date): Date | null {
  if (!terms) return null;
  const t = terms.toLowerCase();
  if (t.includes("receipt")) return from;
  const match = t.match(/net\s*(\d+)/);
  if (match) {
    const out = new Date(from);
    out.setDate(out.getDate() + parseInt(match[1], 10));
    return out;
  }
  return null;
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

function dec(val: FormDataEntryValue | null): number | null {
  const n = parseFloat((val as string | null) ?? "");
  return isNaN(n) ? null : n;
}

function date(val: FormDataEntryValue | null): Date | null {
  const s = (val as string | null)?.trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

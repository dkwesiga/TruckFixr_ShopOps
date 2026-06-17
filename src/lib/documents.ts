import type { Prisma } from "@prisma/client";
import { round2, toNum } from "@/lib/money";

/**
 * Shared document helpers (numbering, tax, total recalculation) used by the
 * estimate, work-order, and invoice server actions. Every function takes a
 * Prisma TransactionClient so it runs inside the same `withRLS` transaction as
 * the mutation that triggered it.
 */

/** The company's default combined tax rate as a decimal (e.g. 0.13), or 0. */
export async function getDefaultTaxRate(
  tx: Prisma.TransactionClient,
  companyId: string
): Promise<number> {
  const rate =
    (await tx.taxRate.findFirst({ where: { companyId, isDefault: true } })) ??
    (await tx.taxRate.findFirst({ where: { companyId } }));
  return rate ? toNum(rate.rate) : 0;
}

/**
 * Generate the next document number for a company, e.g. "EST-0001".
 * Count-based: simple and good enough for the single-user MVP. Numbers are not
 * uniqueness-constrained, so a deleted draft may leave a gap or reuse — fine
 * for Phase 1a, revisited if multi-user sequencing becomes a concern.
 */
export async function nextEstimateNumber(
  tx: Prisma.TransactionClient,
  companyId: string,
  prefix?: string | null
): Promise<string> {
  const count = await tx.estimate.count({ where: { companyId } });
  return `${prefix?.trim() || "EST"}-${String(count + 1).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  companyId: string,
  prefix?: string | null
): Promise<string> {
  const count = await tx.invoice.count({ where: { companyId } });
  return `${prefix?.trim() || "INV"}-${String(count + 1).padStart(4, "0")}`;
}

/** Recompute and persist subtotal / tax / total for an estimate from its lines. */
export async function recalcEstimateTotals(
  tx: Prisma.TransactionClient,
  estimateId: string,
  companyId: string
): Promise<void> {
  const estimate = await tx.estimate.findUnique({
    where: { id: estimateId },
    select: { customer: { select: { taxExempt: true } } },
  });
  const lines = await tx.estimateLine.findMany({ where: { estimateId } });
  const rate = estimate?.customer.taxExempt ? 0 : await getDefaultTaxRate(tx, companyId);

  let subtotal = 0;
  let taxableBase = 0;
  for (const l of lines) {
    const t = toNum(l.total);
    subtotal += t;
    if (l.taxable) taxableBase += t;
  }

  const taxAmount = round2(taxableBase * rate);
  subtotal = round2(subtotal);
  await tx.estimate.update({
    where: { id: estimateId },
    data: { subtotal, taxAmount, total: round2(subtotal + taxAmount) },
  });
}

/**
 * Recompute and persist subtotal / tax / total / amountPaid / balanceDue for an
 * invoice, and auto-advance its status between draft/sent/partially_paid/paid.
 * Does not downgrade a void invoice or force an overdue invoice back to sent.
 */
export async function recalcInvoiceTotals(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  companyId: string
): Promise<void> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: { select: { taxExempt: true } } },
  });
  if (!invoice) return;

  const lines = await tx.invoiceLine.findMany({ where: { invoiceId } });
  const rate = invoice.customer.taxExempt ? 0 : await getDefaultTaxRate(tx, companyId);

  let subtotal = 0;
  let taxableBase = 0;
  for (const l of lines) {
    const t = toNum(l.total);
    subtotal += t;
    if (l.taxable) taxableBase += t;
  }
  const taxAmount = round2(taxableBase * rate);
  subtotal = round2(subtotal);
  const total = round2(subtotal + taxAmount);

  const paidAgg = await tx.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const amountPaid = round2(toNum(paidAgg._sum.amount));
  const balanceDue = round2(total - amountPaid);

  // Derive status from payment progress, preserving terminal/manual states.
  let status = invoice.status;
  let paidAt = invoice.paidAt;
  if (status !== "void") {
    if (amountPaid <= 0) {
      // No payments: keep draft/sent/overdue as-is; clear any stale paid state.
      if (status === "paid" || status === "partially_paid") status = "sent";
      paidAt = null;
    } else if (balanceDue > 0) {
      status = "partially_paid";
      paidAt = null;
    } else {
      status = "paid";
      paidAt = paidAt ?? new Date();
    }
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, total, amountPaid, balanceDue, status, paidAt },
  });
}

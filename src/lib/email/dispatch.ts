import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/money";
import { sendEmail } from "./send";
import { estimateApprovalEmail, invoiceEmail } from "./templates";

type DispatchResult = "sent" | "no-email";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Email the customer the estimate approval link. Returns "no-email" if the customer has no address. */
export async function dispatchEstimateEmail(estimateId: string, companyId: string): Promise<DispatchResult> {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId, companyId },
    include: {
      customer: { select: { name: true, email: true } },
      company: { select: { name: true, email: true } },
    },
  });
  if (!estimate) return "no-email";
  if (!estimate.customer.email) return "no-email";
  if (!estimate.approvalToken) return "no-email";

  const { subject, html } = estimateApprovalEmail({
    companyName: estimate.company.name,
    customerName: estimate.customer.name,
    number: estimate.estimateNumber,
    total: toNum(estimate.total),
    approvalUrl: `${appUrl()}/estimate/approve/${estimate.approvalToken}`,
    expiry: estimate.approvalTokenExpiresAt,
  });

  await sendEmail({ to: estimate.customer.email, subject, html, replyTo: estimate.company.email });
  return "sent";
}

/** Email the customer the invoice (rendered inline). Returns "no-email" if the customer has no address. */
export async function dispatchInvoiceEmail(invoiceId: string, companyId: string): Promise<DispatchResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, companyId },
    include: {
      customer: { select: { name: true, email: true } },
      company: { select: { name: true, email: true, termsText: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) return "no-email";
  if (!invoice.customer.email) return "no-email";

  const { subject, html } = invoiceEmail({
    companyName: invoice.company.name,
    customerName: invoice.customer.name,
    number: invoice.invoiceNumber,
    total: toNum(invoice.total),
    balanceDue: toNum(invoice.balanceDue),
    dueDate: invoice.dueDate,
    paymentTerms: invoice.paymentTerms,
    termsText: invoice.company.termsText,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: toNum(l.quantity),
      unitPrice: toNum(l.unitPrice),
      total: toNum(l.total),
    })),
  });

  await sendEmail({ to: invoice.customer.email, subject, html, replyTo: invoice.company.email });
  return "sent";
}

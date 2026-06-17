import { prisma } from "@/lib/prisma";

/** Open receivables plus this-month tax/sales totals for the ledger summary. */
export async function getReceivables(companyId: string) {
  const openInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ["sent", "partially_paid", "overdue"] },
      balanceDue: { gt: 0 },
    },
    orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
    include: { customer: { select: { id: true, name: true } } },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const month = await prisma.invoice.aggregate({
    where: { companyId, status: { not: "void" }, invoiceDate: { gte: monthStart } },
    _sum: { taxAmount: true, total: true },
  });

  return {
    openInvoices,
    taxThisMonth: month._sum.taxAmount,
    salesThisMonth: month._sum.total,
  };
}

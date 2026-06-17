import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@prisma/client";

export async function getInvoices(
  companyId: string,
  opts?: { status?: InvoiceStatus; search?: string }
) {
  return prisma.invoice.findMany({
    where: {
      companyId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.search
        ? {
            OR: [
              { invoiceNumber: { contains: opts.search, mode: "insensitive" } },
              { customer: { name: { contains: opts.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, companyName: true } },
      vehicle: { select: { id: true, unitNumber: true, year: true, make: true, model: true } },
    },
  });
}

export async function getInvoice(id: string, companyId: string) {
  return prisma.invoice.findUnique({
    where: { id, companyId },
    include: {
      customer: true,
      vehicle: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { date: "desc" } },
      estimate: { select: { id: true, estimateNumber: true } },
      workOrder: { select: { id: true } },
    },
  });
}

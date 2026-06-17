import { prisma } from "@/lib/prisma";
import type { WorkOrderStatus } from "@prisma/client";

export async function getWorkOrders(companyId: string, status?: WorkOrderStatus) {
  return prisma.workOrder.findMany({
    where: { companyId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      estimate: {
        select: {
          estimateNumber: true,
          total: true,
          customer: { select: { name: true } },
          vehicle: { select: { unitNumber: true, year: true, make: true, model: true } },
        },
      },
      invoice: { select: { id: true } },
    },
  });
}

export async function getWorkOrder(id: string, companyId: string) {
  return prisma.workOrder.findUnique({
    where: { id, companyId },
    include: {
      estimate: {
        include: {
          customer: true,
          vehicle: true,
          lines: { orderBy: { sortOrder: "asc" } },
        },
      },
      invoice: { select: { id: true, invoiceNumber: true } },
    },
  });
}

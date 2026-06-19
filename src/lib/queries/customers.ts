import { prisma } from "@/lib/prisma";
import { getCustomersWithVehiclesLive } from "@/lib/live-records";

export async function getCustomers(companyId: string, search?: string) {
  return prisma.customer.findMany({
    where: {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { companyName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true, invoices: true } } },
  });
}

export async function getCustomer(id: string, companyId: string) {
  return prisma.customer.findUnique({
    where: { id, companyId },
    include: {
      vehicles: { orderBy: { createdAt: "desc" } },
      _count: { select: { estimates: true, invoices: true } },
    },
  });
}

export async function getCustomerOptions(companyId: string) {
  return prisma.customer.findMany({
    where: { companyId },
    select: { id: true, name: true, companyName: true },
    orderBy: { name: "asc" },
  });
}

/** Customers each with their vehicles — for the document start form's dependent pickers. */
export async function getCustomersWithVehicles(companyId: string) {
  return getCustomersWithVehiclesLive(companyId);
}

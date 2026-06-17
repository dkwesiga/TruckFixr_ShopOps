import { prisma } from "@/lib/prisma";

export async function getVehicles(companyId: string, search?: string) {
  return prisma.vehicle.findMany({
    where: {
      companyId,
      ...(search
        ? {
            OR: [
              { unitNumber: { contains: search, mode: "insensitive" } },
              { vin: { contains: search, mode: "insensitive" } },
              { plate: { contains: search, mode: "insensitive" } },
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true } } },
  });
}

export async function getVehicle(id: string, companyId: string) {
  return prisma.vehicle.findUnique({
    where: { id, companyId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
}

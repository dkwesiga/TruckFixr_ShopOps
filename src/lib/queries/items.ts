import { ItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getItems(companyId: string, type?: ItemType, search?: string) {
  return prisma.item.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { partNumber: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getItem(id: string, companyId: string) {
  return prisma.item.findUnique({ where: { id, companyId } });
}

/** Items for the line-editor picker — enough to prefill a document line. */
export async function getItemOptions(companyId: string) {
  return prisma.item.findMany({
    where: { companyId },
    select: {
      id: true,
      type: true,
      name: true,
      partNumber: true,
      sellPrice: true,
      cost: true,
      defaultRate: true,
      defaultTime: true,
      taxable: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

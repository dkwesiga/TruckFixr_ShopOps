import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/rls";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/money";
import type { RefCustomer, RefItem } from "@/lib/offline/doc-types";

export const runtime = "nodejs";

/** Snapshot of customers/vehicles/items/tax rate for offline document editing. */
export async function GET() {
  let companyId: string;
  try {
    ({ companyId } = await getSessionContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customers, items, taxRate] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        companyName: true,
        taxExempt: true,
        vehicles: { select: { id: true, unitNumber: true, year: true, make: true, model: true, plate: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { companyId },
      select: { id: true, type: true, name: true, partNumber: true, sellPrice: true, defaultRate: true, defaultTime: true, taxable: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      take: 300,
    }),
    prisma.taxRate.findFirst({ where: { companyId, isDefault: true } }),
  ]);

  const refCustomers: RefCustomer[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    companyName: c.companyName,
    taxExempt: c.taxExempt,
    vehicles: c.vehicles.map((v) => ({
      id: v.id,
      label: ([v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle") + (v.unitNumber ? ` · #${v.unitNumber}` : v.plate ? ` · ${v.plate}` : ""),
    })),
  }));

  const refItems: RefItem[] = items.map((i) => ({
    id: i.id,
    type: i.type,
    name: i.name,
    partNumber: i.partNumber,
    unitPrice: i.type === "labour" ? toNum(i.defaultRate) : toNum(i.sellPrice),
    defaultQty: i.type === "labour" ? toNum(i.defaultTime) || 1 : 1,
    taxable: i.taxable,
  }));

  return NextResponse.json({
    customers: refCustomers,
    items: refItems,
    taxRate: taxRate ? toNum(taxRate.rate) : 0,
  });
}

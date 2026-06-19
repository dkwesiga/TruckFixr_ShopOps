import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/rls";
import { createAdminClient } from "@/lib/supabase/server";
import { toNum } from "@/lib/money";
import type { Numeric } from "@/lib/money";
import type { RefCustomer, RefItem } from "@/lib/offline/doc-types";

export const runtime = "nodejs";

type CustomerRow = {
  id: string;
  name: string;
  companyName: string | null;
  taxExempt: boolean;
  vehicles: Array<{
    id: string;
    unitNumber: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    plate: string | null;
    createdAt: string | null;
  }> | null;
};

type ItemRow = {
  id: string;
  type: RefItem["type"];
  name: string;
  partNumber: string | null;
  sellPrice: unknown;
  defaultRate: unknown;
  defaultTime: unknown;
  taxable: boolean;
};

type TaxRateRow = {
  rate: unknown;
  isDefault: boolean | null;
};

/** Snapshot of customers/vehicles/items/tax rate for offline document editing. */
export async function GET() {
  let companyId: string;
  try {
    ({ companyId } = await getSessionContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [customersResult, itemsResult, taxRatesResult] = await Promise.all([
    admin
      .from("customers")
      .select("id,name,companyName,taxExempt,vehicles(id,unitNumber,year,make,model,plate,createdAt)")
      .eq("companyId", companyId)
      .order("name", { ascending: true }),
    admin
      .from("items")
      .select("id,type,name,partNumber,sellPrice,defaultRate,defaultTime,taxable")
      .eq("companyId", companyId)
      .order("type", { ascending: true })
      .order("name", { ascending: true })
      .limit(300),
    admin.from("tax_rates").select("rate,isDefault").eq("companyId", companyId),
  ]);

  if (customersResult.error) {
    return NextResponse.json({ error: customersResult.error.message }, { status: 500 });
  }

  if (itemsResult.error) {
    return NextResponse.json({ error: itemsResult.error.message }, { status: 500 });
  }

  if (taxRatesResult.error) {
    return NextResponse.json({ error: taxRatesResult.error.message }, { status: 500 });
  }

  const customers = (customersResult.data ?? []) as CustomerRow[];
  const items = (itemsResult.data ?? []) as ItemRow[];
  const taxRate = ((taxRatesResult.data ?? []) as TaxRateRow[]).sort(
    (a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))
  )[0];

  const refCustomers: RefCustomer[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    taxExempt: customer.taxExempt,
    vehicles: [...(customer.vehicles ?? [])]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .map((vehicle) => ({
        id: vehicle.id,
        label:
          ([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle") +
          (vehicle.unitNumber ? ` - #${vehicle.unitNumber}` : vehicle.plate ? ` - ${vehicle.plate}` : ""),
      })),
  }));

  const refItems: RefItem[] = items.map((item) => ({
    id: item.id,
    type: item.type,
    name: item.name,
    partNumber: item.partNumber,
    unitPrice:
      item.type === "labour" ? toNum(item.defaultRate as Numeric) : toNum(item.sellPrice as Numeric),
    defaultQty: item.type === "labour" ? toNum(item.defaultTime as Numeric) || 1 : 1,
    taxable: item.taxable,
  }));

  return NextResponse.json({
    customers: refCustomers,
    items: refItems,
    taxRate: taxRate ? toNum(taxRate.rate as Numeric) : 0,
  });
}

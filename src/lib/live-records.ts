import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { lineTotal, round2, toNum } from "@/lib/money";
import type { Numeric } from "@/lib/money";

type DbUserRecord = {
  companyId: string;
};

type MaybeOne<T> = T | T[] | null;

type CustomerVehicle = {
  id: string;
  unitNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  createdAt?: string | null;
};

type CustomerWithVehiclesRow = {
  id: string;
  name: string;
  companyName: string | null;
  vehicles: CustomerVehicle[] | null;
};

type DocumentStartResult = {
  customerId: string;
  vehicleId: string | null;
};

type LineType = "labour" | "part" | "fee";

type InvoiceMutationRow = {
  id: string;
  customerId: string;
  estimateId: string | null;
  status: string;
  paidAt: string | null;
  customer: MaybeOne<{ taxExempt: boolean | null }>;
};

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getDbUserById(userId: string): Promise<DbUserRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("companyId")
    .eq("id", userId)
    .maybeSingle<DbUserRecord>();

  if (error) {
    throw new Error(`Failed to load user record: ${error.message}`);
  }

  return data;
}

export async function getCompanyNameByUserId(userId: string): Promise<string | null> {
  const dbUser = await getDbUserById(userId);
  if (!dbUser) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("name")
    .eq("id", dbUser.companyId)
    .maybeSingle<{ name: string }>();

  if (error) {
    throw new Error(`Failed to load company: ${error.message}`);
  }

  return data?.name ?? null;
}

export async function getCompanyLive(companyId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("id,name,province,address,phone,email,logoUrl,termsText,warrantyText")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load company: ${error.message}`);
  }

  return data;
}

export async function getCustomersWithVehiclesLive(companyId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("id,name,companyName,vehicles(id,unitNumber,year,make,model,plate,createdAt)")
    .eq("companyId", companyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load customers: ${error.message}`);
  }

  return ((data ?? []) as CustomerWithVehiclesRow[]).map((customer) => ({
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    vehicles: [...(customer.vehicles ?? [])]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .map((vehicle) => ({
        id: vehicle.id,
        unitNumber: vehicle.unitNumber,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        plate: vehicle.plate,
      })),
  }));
}

export async function getItemOptionsLive(companyId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("items")
    .select("id,type,name,partNumber,sellPrice,cost,defaultRate,defaultTime,taxable")
    .eq("companyId", companyId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load items: ${error.message}`);
  }

  return data ?? [];
}

export async function getEstimateLive(id: string, companyId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("estimates")
    .select(`
      id,
      estimateNumber,
      customerId,
      vehicleId,
      status,
      complaint,
      recommendedWork,
      customerNotes,
      internalNotes,
      subtotal,
      taxAmount,
      total,
      expiryDate,
      approvalToken,
      approvalTokenExpiresAt,
      approvedAt,
      declinedAt,
      sentAt,
      createdAt,
      updatedAt,
      customer:customers(*),
      vehicle:vehicles(*),
      workOrder:work_orders(id,status),
      invoice:invoices(id,invoiceNumber)
    `)
    .eq("id", id)
    .eq("companyId", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load estimate: ${error.message}`);
  }

  if (!data) return null;

  const { data: lines, error: linesError } = await admin
    .from("estimate_lines")
    .select("*")
    .eq("estimateId", id)
    .order("sortOrder", { ascending: true });

  if (linesError) {
    throw new Error(`Failed to load estimate lines: ${linesError.message}`);
  }

  return {
    ...data,
    customer: first(data.customer),
    vehicle: first(data.vehicle),
    workOrder: first(data.workOrder),
    invoice: first(data.invoice),
    lines: lines ?? [],
  };
}

export async function getInvoiceLive(id: string, companyId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invoices")
    .select(`
      id,
      invoiceNumber,
      customerId,
      vehicleId,
      estimateId,
      workOrderId,
      status,
      invoiceDate,
      dueDate,
      paymentTerms,
      subtotal,
      taxAmount,
      total,
      amountPaid,
      balanceDue,
      hasVariance,
      customerNotes,
      internalNotes,
      sentAt,
      paidAt,
      createdAt,
      updatedAt,
      customer:customers(*),
      vehicle:vehicles(*),
      estimate:estimates(id,estimateNumber),
      workOrder:work_orders(id)
    `)
    .eq("id", id)
    .eq("companyId", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice: ${error.message}`);
  }

  if (!data) return null;

  const [{ data: lines, error: linesError }, { data: payments, error: paymentsError }] = await Promise.all([
    admin.from("invoice_lines").select("*").eq("invoiceId", id).order("sortOrder", { ascending: true }),
    admin.from("payments").select("*").eq("invoiceId", id).order("date", { ascending: false }),
  ]);

  if (linesError) {
    throw new Error(`Failed to load invoice lines: ${linesError.message}`);
  }

  if (paymentsError) {
    throw new Error(`Failed to load payments: ${paymentsError.message}`);
  }

  return {
    ...data,
    customer: first(data.customer),
    vehicle: first(data.vehicle),
    estimate: first(data.estimate),
    workOrder: first(data.workOrder),
    lines: lines ?? [],
    payments: payments ?? [],
  };
}

export async function createEstimateLive(companyId: string, formData: FormData) {
  const admin = createAdminClient();
  const { customerId, vehicleId } = await resolveDocumentStartLive(companyId, formData, "/estimates/new");
  const estimateId = randomUUID();
  const timestamp = nowIso();
  const estimateNumber = await nextDocumentNumber("estimates", companyId, await getNumberingPrefix(companyId), "EST");

  const { data, error } = await admin
    .from("estimates")
    .insert({
      id: estimateId,
      companyId,
      estimateNumber,
      customerId,
      vehicleId,
      status: "draft",
      complaint: str(formData.get("complaint")),
      recommendedWork: str(formData.get("recommendedWork")),
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(`Failed to create estimate: ${error.message}`);
  }

  return data;
}

export async function createInvoiceLive(companyId: string, formData: FormData) {
  const admin = createAdminClient();
  const { customerId, vehicleId } = await resolveDocumentStartLive(companyId, formData, "/invoices/new");
  const invoiceId = randomUUID();
  const invoiceDate = new Date();
  const timestamp = invoiceDate.toISOString();
  const invoiceNumber = await nextDocumentNumber("invoices", companyId, await getNumberingPrefix(companyId), "INV");
  const paymentTerms = await getCustomerPaymentTerms(companyId, customerId);
  const dueDate = dueDateFromTerms(paymentTerms, invoiceDate);

  const { data, error } = await admin
    .from("invoices")
    .insert({
      id: invoiceId,
      companyId,
      invoiceNumber,
      customerId,
      vehicleId,
      status: "draft",
      invoiceDate: timestamp,
      dueDate: dueDate?.toISOString() ?? null,
      paymentTerms,
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      amountPaid: 0,
      balanceDue: 0,
      hasVariance: false,
      internalNotes: str(formData.get("complaint")),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  return data;
}

export async function addInvoiceLineLive(companyId: string, formData: FormData): Promise<string | null> {
  const admin = createAdminClient();
  const invoiceId = str(formData.get("invoiceId"));
  const description = str(formData.get("description"));
  if (!invoiceId || !description) return invoiceId;

  const invoice = await getInvoiceForMutation(admin, companyId, invoiceId);
  if (!invoice) return invoiceId;

  const quantity = dec(formData.get("quantity")) ?? 1;
  const unitPrice = dec(formData.get("unitPrice")) ?? 0;
  const type = lineType(formData.get("type"));

  const { count, error: countError } = await admin
    .from("invoice_lines")
    .select("id", { count: "exact", head: true })
    .eq("invoiceId", invoiceId);

  if (countError) {
    throw new Error(`Failed to count invoice lines: ${countError.message}`);
  }

  const timestamp = nowIso();
  const { error } = await admin.from("invoice_lines").insert({
    id: randomUUID(),
    invoiceId,
    itemId: str(formData.get("itemId")),
    type,
    description,
    quantity,
    unitPrice,
    total: lineTotal(quantity, unitPrice),
    taxable: formData.get("taxable") !== null,
    isVariance: invoice.estimateId != null,
    sortOrder: count ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (error) {
    throw new Error(`Failed to add invoice line: ${error.message}`);
  }

  await syncInvoiceVarianceLive(admin, invoiceId);
  await recalcInvoiceTotalsLive(admin, companyId, invoiceId);
  return invoiceId;
}

export async function updateInvoiceLineLive(companyId: string, formData: FormData): Promise<string | null> {
  const admin = createAdminClient();
  const lineId = str(formData.get("lineId"));
  const invoiceId = str(formData.get("invoiceId"));
  if (!lineId || !invoiceId) return invoiceId;

  const invoice = await getInvoiceForMutation(admin, companyId, invoiceId);
  if (!invoice) return invoiceId;

  const quantity = dec(formData.get("quantity")) ?? 1;
  const unitPrice = dec(formData.get("unitPrice")) ?? 0;

  const { error } = await admin
    .from("invoice_lines")
    .update({
      description: str(formData.get("description")) ?? "",
      quantity,
      unitPrice,
      total: lineTotal(quantity, unitPrice),
      taxable: formData.get("taxable") !== null,
      updatedAt: nowIso(),
    })
    .eq("id", lineId)
    .eq("invoiceId", invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice line: ${error.message}`);
  }

  await recalcInvoiceTotalsLive(admin, companyId, invoiceId);
  return invoiceId;
}

export async function deleteInvoiceLineLive(companyId: string, formData: FormData): Promise<string | null> {
  const admin = createAdminClient();
  const lineId = str(formData.get("lineId"));
  const invoiceId = str(formData.get("invoiceId"));
  if (!lineId || !invoiceId) return invoiceId;

  const invoice = await getInvoiceForMutation(admin, companyId, invoiceId);
  if (!invoice) return invoiceId;

  const { error } = await admin
    .from("invoice_lines")
    .delete()
    .eq("id", lineId)
    .eq("invoiceId", invoiceId);

  if (error) {
    throw new Error(`Failed to delete invoice line: ${error.message}`);
  }

  await syncInvoiceVarianceLive(admin, invoiceId);
  await recalcInvoiceTotalsLive(admin, companyId, invoiceId);
  return invoiceId;
}

export async function sendInvoiceLive(companyId: string, invoiceId: string): Promise<boolean> {
  const admin = createAdminClient();
  const timestamp = nowIso();
  const { data, error } = await admin
    .from("invoices")
    .update({ status: "sent", sentAt: timestamp, updatedAt: timestamp })
    .eq("id", invoiceId)
    .eq("companyId", companyId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Failed to send invoice: ${error.message}`);
  }

  return Boolean(data);
}

export async function sendEstimateLive(
  companyId: string,
  estimateId: string,
  approvalToken: string,
  approvalTokenExpiresAt: Date
): Promise<boolean> {
  const admin = createAdminClient();
  const timestamp = nowIso();
  const { data, error } = await admin
    .from("estimates")
    .update({
      status: "sent",
      sentAt: timestamp,
      approvalToken,
      approvalTokenExpiresAt: approvalTokenExpiresAt.toISOString(),
      updatedAt: timestamp,
    })
    .eq("id", estimateId)
    .eq("companyId", companyId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Failed to send estimate: ${error.message}`);
  }

  return Boolean(data);
}

async function resolveDocumentStartLive(
  companyId: string,
  formData: FormData,
  errorPath: string
): Promise<DocumentStartResult> {
  const admin = createAdminClient();
  const customerMode = str(formData.get("customerMode"));
  let customerId = str(formData.get("customerId"));

  if (customerMode === "new" || !customerId) {
    const name = str(formData.get("newCustomerName"));
    if (!name) redirect(`${errorPath}?error=Customer+name+is+required`);

    const timestamp = nowIso();
    const nextCustomerId = randomUUID();
    const { data, error } = await admin
      .from("customers")
      .insert({
        id: nextCustomerId,
        companyId,
        name,
        companyName: str(formData.get("newCustomerCompanyName")),
        phone: str(formData.get("newCustomerPhone")),
        email: str(formData.get("newCustomerEmail")),
        taxExempt: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    customerId = data.id;
  } else {
    const { data, error } = await admin
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("companyId", companyId)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(`Failed to validate customer: ${error.message}`);
    }

    if (!data) redirect(`${errorPath}?error=Pick+a+valid+customer`);
  }

  let vehicleId: string | null = null;
  const vehicleMode = str(formData.get("vehicleMode"));
  const submittedVehicleId = str(formData.get("vehicleId"));

  if (vehicleMode === "existing" && submittedVehicleId) {
    const { data, error } = await admin
      .from("vehicles")
      .select("id,customerId")
      .eq("id", submittedVehicleId)
      .eq("companyId", companyId)
      .maybeSingle<{ id: string; customerId: string }>();

    if (error) {
      throw new Error(`Failed to validate vehicle: ${error.message}`);
    }

    if (!data || data.customerId !== customerId) {
      redirect(`${errorPath}?error=Pick+a+valid+vehicle`);
    }

    vehicleId = data.id;
  } else if (vehicleMode === "new" || hasNewVehicleData(formData)) {
    const timestamp = nowIso();
    const nextVehicleId = randomUUID();
    const { data, error } = await admin
      .from("vehicles")
      .insert({
        id: nextVehicleId,
        companyId,
        customerId,
        unitNumber: str(formData.get("newVehicleUnitNumber")),
        vin: str(formData.get("newVehicleVin")),
        plate: str(formData.get("newVehiclePlate")),
        year: num(formData.get("newVehicleYear")),
        make: str(formData.get("newVehicleMake")),
        model: str(formData.get("newVehicleModel")),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      throw new Error(`Failed to create vehicle: ${error.message}`);
    }

    vehicleId = data.id;
  }

  return { customerId, vehicleId };
}

async function getNumberingPrefix(companyId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("numberingPrefix")
    .eq("id", companyId)
    .maybeSingle<{ numberingPrefix: string | null }>();

  if (error) {
    throw new Error(`Failed to load company numbering: ${error.message}`);
  }

  return data?.numberingPrefix ?? null;
}

async function getCustomerPaymentTerms(companyId: string, customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("paymentTerms")
    .eq("id", customerId)
    .eq("companyId", companyId)
    .maybeSingle<{ paymentTerms: string | null }>();

  if (error) {
    throw new Error(`Failed to load customer payment terms: ${error.message}`);
  }

  return data?.paymentTerms ?? null;
}

async function getInvoiceForMutation(
  admin: AdminClient,
  companyId: string,
  invoiceId: string
): Promise<InvoiceMutationRow | null> {
  const { data, error } = await admin
    .from("invoices")
    .select("id,customerId,estimateId,status,paidAt,customer:customers(taxExempt)")
    .eq("id", invoiceId)
    .eq("companyId", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate invoice: ${error.message}`);
  }

  return (data as InvoiceMutationRow | null) ?? null;
}

async function syncInvoiceVarianceLive(admin: AdminClient, invoiceId: string): Promise<void> {
  const { count, error: countError } = await admin
    .from("invoice_lines")
    .select("id", { count: "exact", head: true })
    .eq("invoiceId", invoiceId)
    .eq("isVariance", true);

  if (countError) {
    throw new Error(`Failed to count invoice variance lines: ${countError.message}`);
  }

  const { error } = await admin
    .from("invoices")
    .update({ hasVariance: (count ?? 0) > 0 })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice variance flag: ${error.message}`);
  }
}

async function recalcInvoiceTotalsLive(
  admin: AdminClient,
  companyId: string,
  invoiceId: string
): Promise<void> {
  const invoice = await getInvoiceForMutation(admin, companyId, invoiceId);
  if (!invoice) return;

  const [{ data: lines, error: linesError }, { data: payments, error: paymentsError }] = await Promise.all([
    admin.from("invoice_lines").select("total,taxable").eq("invoiceId", invoiceId),
    admin.from("payments").select("amount").eq("invoiceId", invoiceId),
  ]);

  if (linesError) {
    throw new Error(`Failed to load invoice lines for totals: ${linesError.message}`);
  }

  if (paymentsError) {
    throw new Error(`Failed to load invoice payments for totals: ${paymentsError.message}`);
  }

  const customer = first(invoice.customer);
  const taxRate = customer?.taxExempt ? 0 : await getDefaultTaxRateLive(admin, companyId);
  let subtotal = 0;
  let taxableBase = 0;

  for (const line of (lines ?? []) as Array<{ total: unknown; taxable: boolean | null }>) {
    const total = toNum(line.total as Numeric);
    subtotal += total;
    if (line.taxable) taxableBase += total;
  }

  subtotal = round2(subtotal);
  const taxAmount = round2(taxableBase * taxRate);
  const total = round2(subtotal + taxAmount);
  const amountPaid = round2(
    ((payments ?? []) as Array<{ amount: unknown }>).reduce(
      (sum, payment) => sum + toNum(payment.amount as Numeric),
      0
    )
  );
  const balanceDue = round2(total - amountPaid);
  const statusUpdate = invoiceStatusAfterTotals(invoice.status, invoice.paidAt, amountPaid, balanceDue);

  const { error } = await admin
    .from("invoices")
    .update({
      subtotal,
      taxAmount,
      total,
      amountPaid,
      balanceDue,
      status: statusUpdate.status,
      paidAt: statusUpdate.paidAt,
    })
    .eq("id", invoiceId)
    .eq("companyId", companyId);

  if (error) {
    throw new Error(`Failed to update invoice totals: ${error.message}`);
  }
}

async function getDefaultTaxRateLive(admin: AdminClient, companyId: string): Promise<number> {
  const { data, error } = await admin
    .from("tax_rates")
    .select("rate,isDefault")
    .eq("companyId", companyId);

  if (error) {
    throw new Error(`Failed to load tax rates: ${error.message}`);
  }

  const rates = ((data ?? []) as Array<{ rate: unknown; isDefault: boolean | null }>).sort((a, b) =>
    Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))
  );

  return rates[0] ? toNum(rates[0].rate as Numeric) : 0;
}

function invoiceStatusAfterTotals(
  currentStatus: string,
  currentPaidAt: string | null,
  amountPaid: number,
  balanceDue: number
) {
  let status = currentStatus;
  let paidAt = currentPaidAt;

  if (status !== "void") {
    if (amountPaid <= 0) {
      if (status === "paid" || status === "partially_paid") status = "sent";
      paidAt = null;
    } else if (balanceDue > 0) {
      status = "partially_paid";
      paidAt = null;
    } else {
      status = "paid";
      paidAt = paidAt ?? nowIso();
    }
  }

  return { status, paidAt };
}

async function nextDocumentNumber(
  table: "estimates" | "invoices",
  companyId: string,
  prefix: string | null,
  fallbackPrefix: string
) {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("companyId", companyId);

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }

  return `${prefix?.trim() || fallbackPrefix}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

function dueDateFromTerms(terms: string | null, from: Date): Date | null {
  if (!terms) return null;
  const normalized = terms.toLowerCase();
  if (normalized.includes("receipt")) return from;
  const match = normalized.match(/net\s*(\d+)/);
  if (!match) return null;

  const dueDate = new Date(from);
  dueDate.setDate(dueDate.getDate() + parseInt(match[1], 10));
  return dueDate;
}

function hasNewVehicleData(formData: FormData): boolean {
  return [
    "newVehicleUnitNumber",
    "newVehicleVin",
    "newVehiclePlate",
    "newVehicleYear",
    "newVehicleMake",
    "newVehicleModel",
  ].some((key) => Boolean(str(formData.get(key))));
}

function str(val: FormDataEntryValue | null): string | null {
  const value = (val as string | null)?.trim();
  return value || null;
}

function num(val: FormDataEntryValue | null): number | null {
  const value = parseInt((val as string | null) ?? "", 10);
  return Number.isNaN(value) ? null : value;
}

function dec(val: FormDataEntryValue | null): number | null {
  const value = parseFloat((val as string | null) ?? "");
  return Number.isNaN(value) ? null : value;
}

function lineType(val: FormDataEntryValue | null): LineType {
  const value = str(val);
  return value === "labour" || value === "fee" ? value : "part";
}

function nowIso() {
  return new Date().toISOString();
}

function first<T>(value: MaybeOne<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

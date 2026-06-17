import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/rls";
import { prisma } from "@/lib/prisma";
import { toCsv, type CsvCell } from "@/lib/csv";
import { toNum, round2 } from "@/lib/money";

export const runtime = "nodejs";

type ExportType = "receivables" | "tax-summary" | "sales-by-customer" | "quickbooks";

export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string }> }) {
  let companyId: string;
  try {
    ({ companyId } = await getSessionContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await ctx.params;
  const period = req.nextUrl.searchParams.get("period") ?? "month";
  const { start, label: periodLabel } = periodRange(period);

  let rows: CsvCell[][];
  let filename: string;

  switch (type as ExportType) {
    case "receivables":
      rows = await receivablesRows(companyId);
      filename = `receivables_${stamp()}.csv`;
      break;
    case "tax-summary":
      rows = await taxSummaryRows(companyId, start);
      filename = `tax_summary_${periodLabel}.csv`;
      break;
    case "sales-by-customer":
      rows = await salesByCustomerRows(companyId, start);
      filename = `sales_by_customer_${periodLabel}.csv`;
      break;
    case "quickbooks":
      rows = await quickbooksRows(companyId, start);
      filename = `quickbooks_invoices_${periodLabel}.csv`;
      break;
    default:
      return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
  }

  // Best-effort export tracking.
  try {
    await prisma.exportLog.create({ data: { companyId, exportType: type } });
  } catch {
    /* ignore */
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

async function receivablesRows(companyId: string): Promise<CsvCell[][]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { in: ["sent", "partially_paid", "overdue"] }, balanceDue: { gt: 0 } },
    orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
    include: { customer: { select: { name: true } } },
  });
  const now = new Date();
  const header = ["Invoice", "Customer", "Invoice Date", "Due Date", "Total", "Paid", "Balance", "Days Overdue"];
  const body = invoices.map((inv) => {
    const ref = inv.dueDate ?? inv.invoiceDate;
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - ref.getTime()) / 86_400_000));
    return [
      inv.invoiceNumber,
      inv.customer.name,
      isoDate(inv.invoiceDate),
      inv.dueDate ? isoDate(inv.dueDate) : "",
      toNum(inv.total).toFixed(2),
      toNum(inv.amountPaid).toFixed(2),
      toNum(inv.balanceDue).toFixed(2),
      daysOverdue,
    ];
  });
  const totalBalance = invoices.reduce((s, i) => s + toNum(i.balanceDue), 0);
  return [header, ...body, [], ["", "", "", "TOTAL", "", "", round2(totalBalance).toFixed(2), ""]];
}

async function taxSummaryRows(companyId: string, start: Date): Promise<CsvCell[][]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { not: "void" }, invoiceDate: { gte: start } },
    orderBy: { invoiceDate: "asc" },
    include: { customer: { select: { name: true } } },
  });
  const header = ["Invoice", "Date", "Customer", "Subtotal", "Tax", "Total"];
  const body = invoices.map((inv) => [
    inv.invoiceNumber,
    isoDate(inv.invoiceDate),
    inv.customer.name,
    toNum(inv.subtotal).toFixed(2),
    toNum(inv.taxAmount).toFixed(2),
    toNum(inv.total).toFixed(2),
  ]);
  const sub = invoices.reduce((s, i) => s + toNum(i.subtotal), 0);
  const tax = invoices.reduce((s, i) => s + toNum(i.taxAmount), 0);
  const tot = invoices.reduce((s, i) => s + toNum(i.total), 0);
  return [header, ...body, [], ["", "", "TOTAL", round2(sub).toFixed(2), round2(tax).toFixed(2), round2(tot).toFixed(2)]];
}

async function salesByCustomerRows(companyId: string, start: Date): Promise<CsvCell[][]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { not: "void" }, invoiceDate: { gte: start } },
    include: { customer: { select: { id: true, name: true } } },
  });
  const map = new Map<string, { name: string; count: number; subtotal: number; tax: number; total: number }>();
  for (const inv of invoices) {
    const e = map.get(inv.customerId) ?? { name: inv.customer.name, count: 0, subtotal: 0, tax: 0, total: 0 };
    e.count += 1;
    e.subtotal += toNum(inv.subtotal);
    e.tax += toNum(inv.taxAmount);
    e.total += toNum(inv.total);
    map.set(inv.customerId, e);
  }
  const header = ["Customer", "Invoices", "Subtotal", "Tax", "Total"];
  const body = [...map.values()]
    .sort((a, b) => b.total - a.total)
    .map((e) => [e.name, e.count, round2(e.subtotal).toFixed(2), round2(e.tax).toFixed(2), round2(e.total).toFixed(2)]);
  return [header, ...body];
}

async function quickbooksRows(companyId: string, start: Date): Promise<CsvCell[][]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { not: "void" }, invoiceDate: { gte: start } },
    orderBy: { invoiceDate: "asc" },
    include: {
      customer: { select: { name: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  // Line-level export for CSV import tools (Transaction Pro / SaasAnt style).
  const header = ["InvoiceNo", "Customer", "InvoiceDate", "DueDate", "ItemType", "Description", "Qty", "Rate", "Amount", "Taxable"];
  const body: CsvCell[][] = [];
  for (const inv of invoices) {
    for (const l of inv.lines) {
      body.push([
        inv.invoiceNumber,
        inv.customer.name,
        isoDate(inv.invoiceDate),
        inv.dueDate ? isoDate(inv.dueDate) : "",
        l.type,
        l.description,
        toNum(l.quantity).toString(),
        toNum(l.unitPrice).toFixed(2),
        toNum(l.total).toFixed(2),
        l.taxable ? "Y" : "N",
      ]);
    }
  }
  return [header, ...body];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodRange(period: string): { start: Date; label: string } {
  const now = new Date();
  if (period === "year") return { start: new Date(now.getFullYear(), 0, 1), label: String(now.getFullYear()) };
  if (period === "all") return { start: new Date(0), label: "all" };
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    label: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

import { PROVINCE_TAX } from "@/lib/constants";
import { extractGstHstNumber, stripGstHstNumber } from "@/lib/company-doc-settings";
import { toNum } from "@/lib/money";
import type { PrintDocProps, PrintCompany } from "@/components/documents/print-document";

const ESTIMATE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", approved: "Approved", declined: "Declined", converted: "Converted", cancelled: "Cancelled",
};
const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", partially_paid: "Partially paid", overdue: "Overdue", void: "Void",
};
const LINE_TYPE_ORDER: Record<string, number> = { labour: 0, part: 1, fee: 2 };

type DateLike = Date | string | number | null;

interface CompanyLike {
  name: string;
  province: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  termsText: string | null;
  warrantyText: string | null;
}

function companyToPrint(company: CompanyLike): PrintCompany {
  return {
    name: company.name,
    address: company.address,
    phone: company.phone,
    email: company.email,
    logoUrl: company.logoUrl,
    gstHstNumber: extractGstHstNumber(company.termsText),
    termsText: stripGstHstNumber(company.termsText),
    warrantyText: company.warrantyText,
  };
}

function taxLabelFor(company: CompanyLike): string {
  const tax = PROVINCE_TAX[company.province] ?? PROVINCE_TAX["ON"];
  return `${tax.name} (${Math.round(tax.rate * 100)}%)`;
}

interface LineLike {
  type: string;
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  total: unknown;
}

interface EstimateLike {
  estimateNumber: string;
  status: string;
  createdAt: DateLike;
  expiryDate: DateLike;
  complaint: string | null;
  recommendedWork: string | null;
  customerNotes: string | null;
  subtotal: unknown;
  taxAmount: unknown;
  total: unknown;
  customer: CustomerLike;
  vehicle: VehicleLike | null;
  lines: LineLike[];
}

interface InvoiceLike {
  invoiceNumber: string;
  status: string;
  invoiceDate: DateLike;
  dueDate: DateLike;
  paymentTerms: string | null;
  customerNotes: string | null;
  subtotal: unknown;
  taxAmount: unknown;
  total: unknown;
  amountPaid: unknown;
  balanceDue: unknown;
  customer: CustomerLike;
  vehicle: VehicleLike | null;
  lines: LineLike[];
}

interface CustomerLike {
  name: string;
  companyName: string | null;
  billingAddress: string | null;
  phone: string | null;
  email: string | null;
}

interface VehicleLike {
  unitNumber: string | null;
  vin: string | null;
  plate: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  odometer: number | null;
}

function mapLines(lines: LineLike[]) {
  return [...lines]
    .sort((a, b) => (LINE_TYPE_ORDER[a.type] ?? 9) - (LINE_TYPE_ORDER[b.type] ?? 9))
    .map((l) => ({
      type: l.type,
      description: l.description,
      quantity: toNum(l.quantity as never),
      unitPrice: toNum(l.unitPrice as never),
      total: toNum(l.total as never),
    }));
}

function mapVehicle(v: VehicleLike | null) {
  if (!v) return null;
  return {
    unitNumber: v.unitNumber, vin: v.vin, plate: v.plate,
    year: v.year, make: v.make, model: v.model, odometer: v.odometer,
  };
}

export function buildEstimatePrint(e: EstimateLike, company: CompanyLike): PrintDocProps {
  return {
    kind: "estimate",
    company: companyToPrint(company),
    number: e.estimateNumber,
    statusLabel: ESTIMATE_STATUS_LABEL[e.status] ?? null,
    issuedDate: e.createdAt,
    expiryDate: e.expiryDate,
    customer: {
      name: e.customer.name,
      companyName: e.customer.companyName,
      billingAddress: e.customer.billingAddress,
      phone: e.customer.phone,
      email: e.customer.email,
    },
    vehicle: mapVehicle(e.vehicle),
    complaint: e.complaint,
    recommendedWork: e.recommendedWork,
    customerNotes: e.customerNotes,
    lines: mapLines(e.lines),
    subtotal: toNum(e.subtotal as never),
    taxAmount: toNum(e.taxAmount as never),
    taxLabel: taxLabelFor(company),
    total: toNum(e.total as never),
  };
}

export function buildInvoicePrint(i: InvoiceLike, company: CompanyLike): PrintDocProps {
  return {
    kind: "invoice",
    company: companyToPrint(company),
    number: i.invoiceNumber,
    statusLabel: INVOICE_STATUS_LABEL[i.status] ?? null,
    issuedDate: i.invoiceDate,
    dueDate: i.dueDate,
    paymentTerms: i.paymentTerms,
    customer: {
      name: i.customer.name,
      companyName: i.customer.companyName,
      billingAddress: i.customer.billingAddress,
      phone: i.customer.phone,
      email: i.customer.email,
    },
    vehicle: mapVehicle(i.vehicle),
    customerNotes: i.customerNotes,
    lines: mapLines(i.lines),
    subtotal: toNum(i.subtotal as never),
    taxAmount: toNum(i.taxAmount as never),
    taxLabel: taxLabelFor(company),
    total: toNum(i.total as never),
    amountPaid: toNum(i.amountPaid as never),
    balanceDue: toNum(i.balanceDue as never),
  };
}

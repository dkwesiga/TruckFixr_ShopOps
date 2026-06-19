import { formatCurrency } from "@/lib/money";

export interface PrintCompany {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  gstHstNumber: string | null;
  termsText: string | null;
  warrantyText: string | null;
}

export interface PrintLine {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PrintDocProps {
  kind: "estimate" | "invoice";
  company: PrintCompany;
  number: string;
  statusLabel?: string | null;
  issuedDate: Date | string | number | null;
  dueDate?: Date | string | number | null;
  expiryDate?: Date | string | number | null;
  paymentTerms?: string | null;
  customer: {
    name: string;
    companyName: string | null;
    billingAddress: string | null;
    phone: string | null;
    email: string | null;
  };
  vehicle?: {
    unitNumber: string | null;
    vin: string | null;
    plate: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    odometer: number | null;
  } | null;
  complaint?: string | null;
  recommendedWork?: string | null;
  customerNotes?: string | null;
  lines: PrintLine[];
  subtotal: number;
  taxAmount: number;
  taxLabel: string;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
}

const TYPE_LABEL: Record<string, string> = { labour: "Labour", part: "Part", fee: "Fee" };
const INVOICE_DISCLAIMER = [
  "This invoice reflects the work, parts, and services recorded by the shop at the time of issue.",
  "Please review all line items, taxes, and vehicle details before making payment.",
  "Any warranty, return, or compliance obligations are governed by the shop's written terms and applicable local law.",
];

/** Print-optimised estimate/invoice document. Pure presentational server component. */
export function PrintDocument(p: PrintDocProps) {
  const title = p.kind === "estimate" ? "ESTIMATE" : "INVOICE";
  const v = p.vehicle;
  const vehicleLine = v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : null;

  return (
    <div className="print-doc mx-auto max-w-[800px] bg-white text-gray-900 p-8 text-sm leading-relaxed">
      {/* Header */}
      <div className="flex justify-between items-start gap-6 border-b-2 border-gray-900 pb-4">
        <div>
          {p.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user logo, print document
            <img src={p.company.logoUrl} alt={p.company.name} className="h-12 mb-2 object-contain" />
          ) : (
            <p className="text-xl font-bold">{p.company.name}</p>
          )}
          <div className="text-xs text-gray-600 whitespace-pre-line mt-1">
            {p.company.logoUrl && <p className="font-semibold text-gray-800">{p.company.name}</p>}
            {p.company.address && <p>{p.company.address}</p>}
            {p.kind === "invoice" && p.company.gstHstNumber && (
              <p><span className="font-medium text-gray-700">GST/HST number:</span> {p.company.gstHstNumber}</p>
            )}
            {(p.company.phone || p.company.email) && (
              <p>{[p.company.phone, p.company.email].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight">{title}</p>
          <p className="text-sm font-medium text-gray-700 mt-1">{p.number}</p>
          {p.statusLabel && <p className="text-xs text-gray-500 mt-0.5">{p.statusLabel}</p>}
        </div>
      </div>

      {/* Meta + parties */}
      <div className="grid grid-cols-2 gap-6 mt-5">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Bill to</p>
          <p className="font-semibold">{p.customer.companyName || p.customer.name}</p>
          {p.customer.companyName && <p className="text-xs text-gray-600">{p.customer.name}</p>}
          {p.customer.billingAddress && <p className="text-xs text-gray-600 whitespace-pre-line">{p.customer.billingAddress}</p>}
          {(p.customer.phone || p.customer.email) && (
            <p className="text-xs text-gray-600">{[p.customer.phone, p.customer.email].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div className="text-right space-y-0.5">
          <MetaRow label={p.kind === "estimate" ? "Date" : "Invoice date"} value={fmtDate(p.issuedDate)} />
          {p.kind === "invoice" && p.dueDate && <MetaRow label="Due date" value={fmtDate(p.dueDate)} />}
          {p.kind === "invoice" && (
            <MetaRow label="Payment expected" value={paymentExpectation(p.dueDate, p.paymentTerms)} />
          )}
          {p.kind === "invoice" && p.paymentTerms && <MetaRow label="Terms" value={p.paymentTerms} />}
          {p.kind === "estimate" && p.expiryDate && <MetaRow label="Valid until" value={fmtDate(p.expiryDate)} />}
        </div>
      </div>

      {/* Vehicle */}
      {v && (
        <div className="mt-4 rounded border border-gray-200 p-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Vehicle / unit</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
            {vehicleLine && <Field label="Vehicle" value={vehicleLine} />}
            {v.unitNumber && <Field label="Unit #" value={v.unitNumber} />}
            {v.vin && <Field label="VIN" value={v.vin} />}
            {v.plate && <Field label="Plate" value={v.plate} />}
            {v.odometer != null && <Field label="Odometer" value={`${v.odometer.toLocaleString()} km`} />}
          </div>
        </div>
      )}

      {/* Complaint / recommended */}
      {(p.complaint || p.recommendedWork) && (
        <div className="mt-4 text-xs space-y-1">
          {p.complaint && <p><span className="font-semibold">Complaint: </span>{p.complaint}</p>}
          {p.recommendedWork && <p><span className="font-semibold">Recommended work: </span>{p.recommendedWork}</p>}
        </div>
      )}

      {/* Lines */}
      <table className="w-full mt-5 border-collapse">
        <thead>
          <tr className="border-b border-gray-300 text-[11px] uppercase tracking-wider text-gray-500">
            <th className="text-left py-1.5 font-semibold">Description</th>
            <th className="text-right py-1.5 font-semibold w-16">Qty</th>
            <th className="text-right py-1.5 font-semibold w-24">Unit</th>
            <th className="text-right py-1.5 font-semibold w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {p.lines.map((l, i) => (
            <tr key={i} className="border-b border-gray-100 align-top">
              <td className="py-1.5">
                <span className="text-[10px] text-gray-400 mr-1.5">{TYPE_LABEL[l.type] ?? l.type}</span>
                {l.description}
              </td>
              <td className="py-1.5 text-right tabular-nums">{l.quantity}</td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(l.unitPrice)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mt-4">
        <div className="w-64 space-y-1">
          <TotalRow label="Subtotal" value={formatCurrency(p.subtotal)} />
          <TotalRow label={p.taxLabel} value={formatCurrency(p.taxAmount)} />
          <div className="border-t border-gray-300 pt-1">
            <TotalRow label="Total" value={formatCurrency(p.total)} bold />
          </div>
          {p.kind === "invoice" && (p.amountPaid ?? 0) > 0 && (
            <>
              <TotalRow label="Paid" value={`− ${formatCurrency(p.amountPaid)}`} />
              <div className="border-t border-gray-300 pt-1">
                <TotalRow label="Balance due" value={formatCurrency(p.balanceDue)} bold />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes / terms / warranty */}
      {p.customerNotes && (
        <div className="mt-5 text-xs">
          <p className="font-semibold mb-0.5">Notes</p>
          <p className="text-gray-600 whitespace-pre-line">{p.customerNotes}</p>
        </div>
      )}

      {p.kind === "invoice" && (
        <div className="mt-5 text-xs">
          <p className="font-semibold mb-0.5">Invoice disclaimer</p>
          <div className="text-gray-600 space-y-0.5">
            {INVOICE_DISCLAIMER.map((sentence) => (
              <p key={sentence}>{sentence}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-200 pt-3 text-[11px] text-gray-500 space-y-1">
        {p.company.termsText && <p className="whitespace-pre-line">{p.company.termsText}</p>}
        {p.company.warrantyText && <p className="whitespace-pre-line">{p.company.warrantyText}</p>}
        <p>Tax shown is calculated by TruckFixr ShopOps and should be reviewed by your accountant or bookkeeper before filing.</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs"><span className="text-gray-400">{label}: </span><span className="font-medium">{value}</span></p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <p><span className="text-gray-400">{label}: </span>{value}</p>;
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-bold" : "text-gray-600"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}

function fmtDate(value: Date | string | number | null | undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function paymentExpectation(
  dueDate: Date | string | number | null | undefined,
  paymentTerms: string | null | undefined
): string {
  if (dueDate) return `By ${fmtDate(dueDate)}`;
  if (paymentTerms) return paymentTerms;
  return "Due on receipt";
}

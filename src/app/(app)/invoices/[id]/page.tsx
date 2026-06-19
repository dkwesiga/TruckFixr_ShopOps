import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvoice } from "@/lib/queries/invoices";
import { getItemOptions } from "@/lib/queries/items";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { InvoiceStatusBadge } from "@/components/ui/status-badge";
import { LineEditor, type ItemOption, type LineView } from "@/components/documents/line-editor";
import { AiCapture } from "@/components/ai/ai-capture";
import { PartsPurchaseCapture } from "@/components/ai/parts-purchase-capture";
import { transcriptionEnabled, extractionEnabled } from "@/lib/ai/config";
import { RecordPayment } from "@/components/documents/record-payment";
import { DeliveryNotice } from "@/components/documents/delivery-notice";
import { emailEnabled } from "@/lib/email/config";
import { formatCurrency, toNum } from "@/lib/money";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import {
  addInvoiceLine,
  updateInvoiceLine,
  deleteInvoiceLine,
  sendInvoice,
  emailInvoice,
  voidInvoice,
  deleteInvoice,
  recordPayment,
  deletePayment,
} from "@/lib/actions/invoices";
import { getDbUserById } from "@/lib/live-records";

const METHOD_LABEL = Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((m) => [m.value, m.label]));
const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const PREVIEW_LINK_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[#c2c6d3] bg-white px-5 py-3 text-base font-semibold text-[#004787] transition-colors hover:bg-[#f1f3f9] active:bg-[#e8ebf3]";
const LINE_TYPE_ORDER: Record<string, number> = { labour: 0, part: 1, fee: 2 };

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getDbUserById(user.id);
  if (!dbUser) redirect("/onboarding");

  const invoice = await getInvoice(id, dbUser.companyId);
  if (!invoice) notFound();

  const itemsRaw = await getItemOptions(dbUser.companyId);
  const locked = invoice.status === "void" || invoice.status === "paid";
  const balanceDue = toNum(invoice.balanceDue);

  const lines: LineView[] = invoice.lines
    .map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      quantity: toNum(l.quantity),
      unitPrice: toNum(l.unitPrice),
      total: toNum(l.total),
      taxable: l.taxable,
      aiSuggested: l.aiSuggested,
      isVariance: l.isVariance,
    }))
    .sort((a, b) => (LINE_TYPE_ORDER[a.type] ?? 9) - (LINE_TYPE_ORDER[b.type] ?? 9));

  const items: ItemOption[] = itemsRaw.map((i) => ({
    id: i.id,
    type: i.type,
    name: i.name,
    partNumber: i.partNumber,
    unitPrice: i.type === "labour" ? toNum(i.defaultRate) : toNum(i.sellPrice),
    defaultQty: i.type === "labour" ? toNum(i.defaultTime) || 1 : 1,
    taxable: i.taxable,
  }));

  const vehicleText = invoice.vehicle
    ? [invoice.vehicle.year, invoice.vehicle.make, invoice.vehicle.model].filter(Boolean).join(" ") ||
      (invoice.vehicle.unitNumber ? `Unit #${invoice.vehicle.unitNumber}` : "Vehicle")
    : null;

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        backHref="/invoices"
        action={
          <div className="flex items-center gap-1">
            <Link href={`/print/invoice/${id}`} className="text-sm text-[#004787] font-medium px-2 py-1">Preview</Link>
            {!locked && <Link href={`/invoices/${id}/edit`} className="text-sm text-[#004787] font-medium px-2 py-1">Edit</Link>}
          </div>
        }
      />

      <DeliveryNotice notice={notice} />

      <div className="py-4 space-y-4">
        {/* Summary */}
        <div className="industrial-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <InvoiceStatusBadge status={invoice.status} />
            <span className="text-xs text-[#858b98]">
              {fmtDate(invoice.invoiceDate)}
              {invoice.dueDate ? ` · due ${fmtDate(invoice.dueDate)}` : ""}
            </span>
          </div>
          <div>
            <Link href={`/customers/${invoice.customerId}`} className="text-base font-semibold text-[#191c20]">{invoice.customer.name}</Link>
            {vehicleText && <p className="text-sm text-[#5f6673]">{vehicleText}{invoice.vehicle?.plate ? ` · ${invoice.vehicle.plate}` : ""}</p>}
          </div>
          {invoice.estimate && (
            <Link href={`/estimates/${invoice.estimate.id}`} className="text-xs text-[#004787] inline-block">
              From estimate {invoice.estimate.estimateNumber}
            </Link>
          )}
        </div>

        {invoice.hasVariance && (
          <div className="bg-[#fff3e8] border border-[#f2862e]/40 rounded-lg py-3 flex items-center gap-2">
            <Badge variant="warning">Variance</Badge>
            <p className="text-xs text-[#9b4c10]">This invoice has lines added beyond the original estimate.</p>
          </div>
        )}

        {/* Lines */}
        <div>
          <h2 className="industrial-label mb-2">Line items</h2>
          {!locked && (
            <div className="mb-2 space-y-2">
              <AiCapture kind="invoice" docId={id} transcriptionEnabled={transcriptionEnabled} extractionEnabled={extractionEnabled} />
              <PartsPurchaseCapture kind="invoice" docId={id} extractionEnabled={extractionEnabled} />
            </div>
          )}
          <LineEditor
            docId={id}
            idFieldName="invoiceId"
            lines={lines}
            items={items}
            readOnly={locked}
            showVariance={invoice.estimateId != null}
            addAction={addInvoiceLine}
            updateAction={updateInvoiceLine}
            deleteAction={deleteInvoiceLine}
          />
        </div>

        {/* Totals */}
        <div className="industrial-card p-4 space-y-1.5">
          <Total label="Subtotal" value={formatCurrency(invoice.subtotal)} />
          <Total label="Tax" value={formatCurrency(invoice.taxAmount)} />
          <div className="border-t border-[#eef0f5] pt-1.5">
            <Total label="Total" value={formatCurrency(invoice.total)} bold />
          </div>
          {toNum(invoice.amountPaid) > 0 && (
            <>
              <Total label="Paid" value={`− ${formatCurrency(invoice.amountPaid)}`} />
              <div className="border-t border-[#eef0f5] pt-1.5">
                <Total label="Balance due" value={formatCurrency(balanceDue)} bold />
              </div>
            </>
          )}
        </div>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <div>
            <h2 className="industrial-label mb-2">Payments</h2>
            <div className="space-y-2">
              {invoice.payments.map((p) => (
                <div key={p.id} className="industrial-card p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#191c20]">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-[#5f6673]">
                      {METHOD_LABEL[p.method] ?? p.method} · {fmtDate(p.date)}
                      {p.referenceNumber ? ` · ${p.referenceNumber}` : ""}
                    </p>
                  </div>
                  {invoice.status !== "void" && (
                    <form action={deletePayment}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input type="hidden" name="invoiceId" value={id} />
                      <button type="submit" className="text-xs text-[#d32f2f] font-medium">Remove</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {(invoice.customerNotes || invoice.internalNotes) && (
          <div className="industrial-card p-4 space-y-2">
            {invoice.customerNotes && <p className="text-sm text-[#5f6673]"><span className="text-[#858b98]">Customer note: </span>{invoice.customerNotes}</p>}
            {invoice.internalNotes && <p className="text-sm text-[#5f6673]"><span className="text-[#858b98]">Internal: </span>{invoice.internalNotes}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          {invoice.status === "draft" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/print/invoice/${id}`} className={PREVIEW_LINK_CLASS}>
                  Preview invoice
                </Link>
                <form action={sendInvoice.bind(null, id)}>
                  <ConfirmSubmit
                    message="Send this invoice now? Preview it first if you have not reviewed it."
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={lines.length === 0}
                  >
                    Send invoice
                  </ConfirmSubmit>
                </form>
              </div>
              {lines.length === 0 && <p className="text-xs text-[#858b98] text-center">Add at least one line before sending.</p>}
            </>
          )}

          {emailEnabled && invoice.status !== "void" && invoice.status !== "draft" && (
            <form action={emailInvoice.bind(null, id)}>
              <Button type="submit" size="md" variant="secondary" className="w-full" disabled={!invoice.customer.email}>
                {invoice.customer.email ? "Email invoice to customer" : "No customer email on file"}
              </Button>
            </form>
          )}

          {!locked && <RecordPayment invoiceId={id} balanceDue={balanceDue} action={recordPayment} />}

          {invoice.status === "paid" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Badge variant="success">Paid in full</Badge>
              {invoice.paidAt && <span className="text-sm text-[#5f6673]">on {fmtDate(invoice.paidAt)}</span>}
            </div>
          )}

          {invoice.status !== "void" && invoice.status !== "draft" && (
            <form action={voidInvoice.bind(null, id)}>
              <ConfirmSubmit message="Void this invoice? It will no longer count toward receivables." variant="ghost" size="sm" className="w-full">
                Void invoice
              </ConfirmSubmit>
            </form>
          )}

          {invoice.status === "draft" && (
            <form action={deleteInvoice.bind(null, id)}>
              <ConfirmSubmit message="Delete this draft invoice? This cannot be undone." variant="ghost" size="sm" className="w-full text-[#d32f2f]">
                Delete draft
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Total({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold text-[#191c20]" : "text-[#5f6673]"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-[#191c20]" : "text-[#424955]"}`}>{value}</span>
    </div>
  );
}

function fmtDate(value: Date | string | number | null | undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Unknown date";
  return DATE_FORMATTER.format(date);
}

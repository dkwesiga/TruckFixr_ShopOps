import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getEstimate } from "@/lib/queries/estimates";
import { getItemOptions } from "@/lib/queries/items";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { CopyLink } from "@/components/ui/copy-link";
import { EstimateStatusBadge } from "@/components/ui/status-badge";
import { LineEditor, type ItemOption, type LineView } from "@/components/documents/line-editor";
import { AiCapture } from "@/components/ai/ai-capture";
import { PartsPurchaseCapture } from "@/components/ai/parts-purchase-capture";
import { transcriptionEnabled, extractionEnabled } from "@/lib/ai/config";
import { emailEnabled } from "@/lib/email/config";
import { DeliveryNotice } from "@/components/documents/delivery-notice";
import { formatCurrency, toNum } from "@/lib/money";
import {
  addEstimateLine,
  updateEstimateLine,
  deleteEstimateLine,
  sendEstimate,
  emailEstimate,
  markEstimateApproved,
  markEstimateDeclined,
  cancelEstimate,
  deleteEstimate,
} from "@/lib/actions/estimates";
import { convertEstimateToInvoice } from "@/lib/actions/invoices";

export default async function EstimateDetailPage({
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

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const estimate = await getEstimate(id, dbUser.companyId);
  if (!estimate) notFound();

  const itemsRaw = await getItemOptions(dbUser.companyId);

  const locked = !(estimate.status === "draft" || estimate.status === "sent");
  const hasLines = estimate.lines.length > 0;

  const lines: LineView[] = estimate.lines.map((l) => ({
    id: l.id,
    type: l.type,
    description: l.description,
    quantity: toNum(l.quantity),
    unitPrice: toNum(l.unitPrice),
    total: toNum(l.total),
    taxable: l.taxable,
    aiSuggested: l.aiSuggested,
    isVariance: false,
  }));

  const items: ItemOption[] = itemsRaw.map((i) => ({
    id: i.id,
    type: i.type,
    name: i.name,
    partNumber: i.partNumber,
    unitPrice: i.type === "labour" ? toNum(i.defaultRate) : toNum(i.sellPrice),
    defaultQty: i.type === "labour" ? toNum(i.defaultTime) || 1 : 1,
    taxable: i.taxable,
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const approvalUrl = estimate.approvalToken ? `${appUrl}/estimate/approve/${estimate.approvalToken}` : null;

  const vehicleText = estimate.vehicle
    ? [estimate.vehicle.year, estimate.vehicle.make, estimate.vehicle.model].filter(Boolean).join(" ") ||
      (estimate.vehicle.unitNumber ? `Unit #${estimate.vehicle.unitNumber}` : "Vehicle")
    : null;

  return (
    <div>
      <PageHeader
        title={estimate.estimateNumber}
        backHref="/estimates"
        action={
          <div className="flex items-center gap-1">
            <Link href={`/print/estimate/${id}`} className="text-sm text-[#004787] font-medium px-2 py-1">PDF</Link>
            {!locked && <Link href={`/estimates/${id}/edit`} className="text-sm text-[#004787] font-medium px-2 py-1">Edit</Link>}
          </div>
        }
      />

      <DeliveryNotice notice={notice} />

      <div className="py-4 space-y-4">
        {/* Summary */}
        <div className="industrial-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <EstimateStatusBadge status={estimate.status} />
            {estimate.expiryDate && (
              <span className="text-xs text-[#858b98]">Expires {fmtDate(estimate.expiryDate)}</span>
            )}
          </div>
          <div>
            <Link href={`/customers/${estimate.customerId}`} className="text-base font-semibold text-[#191c20]">
              {estimate.customer.name}
            </Link>
            {vehicleText && (
              <p className="text-sm text-[#5f6673]">
                {vehicleText}
                {estimate.vehicle?.plate ? ` · ${estimate.vehicle.plate}` : ""}
              </p>
            )}
          </div>
          {estimate.complaint && (
            <p className="text-sm text-[#5f6673] pt-1"><span className="text-[#858b98]">Complaint: </span>{estimate.complaint}</p>
          )}
          {estimate.recommendedWork && (
            <p className="text-sm text-[#5f6673]"><span className="text-[#858b98]">Recommended: </span>{estimate.recommendedWork}</p>
          )}
        </div>

        {/* Approval link (when sent) */}
        {estimate.status === "sent" && approvalUrl && (
          <div className="bg-[#fff3e8] border border-[#f2862e]/40 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-[#9b4c10]">Share this approval link</p>
            <CopyLink url={approvalUrl} />
            <p className="text-xs text-[#9b4c10]">
              The customer can review, approve, or decline. Link expires {estimate.approvalTokenExpiresAt ? fmtDate(estimate.approvalTokenExpiresAt) : "in 30 days"}.
            </p>
          </div>
        )}

        {/* Lines */}
        <div>
          <h2 className="industrial-label mb-2">Line items</h2>
          {!locked && (
            <div className="mb-2 space-y-2">
              <AiCapture kind="estimate" docId={id} transcriptionEnabled={transcriptionEnabled} extractionEnabled={extractionEnabled} />
              <PartsPurchaseCapture kind="estimate" docId={id} extractionEnabled={extractionEnabled} />
            </div>
          )}
          <LineEditor
            docId={id}
            idFieldName="estimateId"
            lines={lines}
            items={items}
            readOnly={locked}
            addAction={addEstimateLine}
            updateAction={updateEstimateLine}
            deleteAction={deleteEstimateLine}
          />
        </div>

        {/* Totals */}
        <div className="industrial-card p-4 space-y-1.5">
          <Total label="Subtotal" value={formatCurrency(estimate.subtotal)} />
          <Total label="Tax" value={formatCurrency(estimate.taxAmount)} />
          <div className="border-t border-[#eef0f5] pt-1.5">
            <Total label="Total" value={formatCurrency(estimate.total)} bold />
          </div>
        </div>

        {/* Notes */}
        {(estimate.customerNotes || estimate.internalNotes) && (
          <div className="industrial-card p-4 space-y-2">
            {estimate.customerNotes && (
              <p className="text-sm text-[#5f6673]"><span className="text-[#858b98]">Customer note: </span>{estimate.customerNotes}</p>
            )}
            {estimate.internalNotes && (
              <p className="text-sm text-[#5f6673]"><span className="text-[#858b98]">Internal: </span>{estimate.internalNotes}</p>
            )}
          </div>
        )}

        {/* Linked work order / invoice */}
        {estimate.workOrder && (
          <Link href={`/work-orders/${estimate.workOrder.id}`} className="flex items-center justify-between industrial-card p-4 active:bg-[#f1f3f9]">
            <span className="text-sm font-medium text-[#191c20]">View work order</span>
            <Chevron />
          </Link>
        )}
        {estimate.invoice && (
          <Link href={`/invoices/${estimate.invoice.id}`} className="flex items-center justify-between industrial-card p-4 active:bg-[#f1f3f9]">
            <span className="text-sm font-medium text-[#191c20]">View invoice {estimate.invoice.invoiceNumber}</span>
            <Chevron />
          </Link>
        )}

        {/* Status actions */}
        <div className="space-y-2 pt-1">
          {estimate.status === "draft" && (
            <>
              <form action={sendEstimate.bind(null, id)}>
                <Button type="submit" size="lg" className="w-full" disabled={!hasLines}>
                  Send for approval
                </Button>
              </form>
              {!hasLines && <p className="text-xs text-[#858b98] text-center">Add at least one line to send.</p>}
              <form action={markEstimateApproved.bind(null, id)}>
                <Button type="submit" variant="secondary" size="md" className="w-full" disabled={!hasLines}>
                  Mark approved (verbal)
                </Button>
              </form>
            </>
          )}

          {estimate.status === "sent" && (
            <>
              {emailEnabled && (
                <form action={emailEstimate.bind(null, id)}>
                  <Button type="submit" size="md" variant="secondary" className="w-full" disabled={!estimate.customer.email}>
                    {estimate.customer.email ? "Email approval link to customer" : "No customer email on file"}
                  </Button>
                </form>
              )}
              <div className="grid grid-cols-2 gap-2">
                <form action={markEstimateApproved.bind(null, id)}>
                  <Button type="submit" size="md" className="w-full">Mark approved</Button>
                </form>
                <form action={markEstimateDeclined.bind(null, id)}>
                  <Button type="submit" variant="secondary" size="md" className="w-full">Mark declined</Button>
                </form>
              </div>
            </>
          )}

          {estimate.status === "approved" && (
            <form action={convertEstimateToInvoice.bind(null, id)}>
              <Button type="submit" size="lg" className="w-full">Create invoice from estimate</Button>
            </form>
          )}

          {(estimate.status === "draft" || estimate.status === "sent") && (
            <form action={cancelEstimate.bind(null, id)}>
              <ConfirmSubmit message="Cancel this estimate?" variant="ghost" size="sm" className="w-full">
                Cancel estimate
              </ConfirmSubmit>
            </form>
          )}

          {estimate.status === "draft" && (
            <form action={deleteEstimate.bind(null, id)}>
              <ConfirmSubmit message="Delete this draft estimate? This cannot be undone." variant="ghost" size="sm" className="w-full text-[#d32f2f]">
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

function Chevron() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#c2c6d3]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

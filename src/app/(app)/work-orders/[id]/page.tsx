import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getWorkOrder } from "@/lib/queries/work-orders";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { WorkOrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, toNum } from "@/lib/money";
import { setWorkOrderStatus, updateWorkOrderNotes } from "@/lib/actions/work-orders";
import { convertWorkOrderToInvoice } from "@/lib/actions/invoices";

const TYPE_LABEL: Record<string, string> = { labour: "Labour", part: "Part", fee: "Fee" };

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const wo = await getWorkOrder(id, dbUser.companyId);
  if (!wo) notFound();

  const est = wo.estimate;
  const v = est.vehicle;
  const vehicleText = v ? [v.year, v.make, v.model].filter(Boolean).join(" ") || (v.unitNumber ? `Unit #${v.unitNumber}` : "Vehicle") : null;
  const notesUpdate = updateWorkOrderNotes.bind(null, id);

  return (
    <div>
      <PageHeader title="Work Order" backHref="/work-orders" />

      <div className="py-4 space-y-4">
        <div className="industrial-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <WorkOrderStatusBadge status={wo.status} />
            <Link href={`/estimates/${est.id}`} className="text-xs text-[#004787] font-medium">{est.estimateNumber}</Link>
          </div>
          <div>
            <Link href={`/customers/${est.customerId}`} className="text-base font-semibold text-[#191c20]">{est.customer.name}</Link>
            {vehicleText && <p className="text-sm text-[#5f6673]">{vehicleText}{v?.plate ? ` · ${v.plate}` : ""}</p>}
          </div>
          {est.complaint && <p className="text-sm text-[#5f6673] pt-1"><span className="text-[#858b98]">Complaint: </span>{est.complaint}</p>}
        </div>

        {/* Lines (read-only — the approved scope) */}
        <div>
          <h2 className="industrial-label mb-2">Approved scope</h2>
          <div className="space-y-2">
            {est.lines.map((l) => (
              <div key={l.id} className="industrial-card p-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-[#858b98] uppercase tracking-wide">{TYPE_LABEL[l.type]}</span>
                  <p className="text-sm text-[#191c20]">{l.description}</p>
                  <p className="text-xs text-[#5f6673] mt-0.5">{toNum(l.quantity)} × {formatCurrency(l.unitPrice)}</p>
                </div>
                <span className="text-sm font-semibold text-[#191c20] flex-shrink-0">{formatCurrency(l.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="industrial-card p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#191c20]">Estimate total</span>
          <span className="text-sm font-bold text-[#191c20]">{formatCurrency(est.total)}</span>
        </div>

        {/* Notes */}
        <form action={notesUpdate} className="space-y-2">
          <Textarea label="Work notes" name="notes" defaultValue={wo.notes ?? ""} placeholder="Notes from the job (parts used, findings…)" />
          <Button type="submit" variant="secondary" size="sm">Save notes</Button>
        </form>

        {/* Invoice link */}
        {wo.invoice && (
          <Link href={`/invoices/${wo.invoice.id}`} className="flex items-center justify-between industrial-card p-4 active:bg-[#f1f3f9]">
            <span className="text-sm font-medium text-[#191c20]">View invoice {wo.invoice.invoiceNumber}</span>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#c2c6d3]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Status actions */}
        <div className="space-y-2 pt-1">
          {wo.status === "approved" && (
            <form action={setWorkOrderStatus.bind(null, id, "in_progress")}>
              <Button type="submit" size="lg" className="w-full">Start work</Button>
            </form>
          )}
          {wo.status === "in_progress" && (
            <form action={setWorkOrderStatus.bind(null, id, "done")}>
              <Button type="submit" size="lg" className="w-full">Mark work done</Button>
            </form>
          )}
          {wo.status === "done" && !wo.invoice && (
            <form action={convertWorkOrderToInvoice.bind(null, id)}>
              <Button type="submit" size="lg" className="w-full">Create invoice</Button>
            </form>
          )}
          {wo.status === "invoiced" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Badge variant="success">Invoiced</Badge>
              <span className="text-sm text-[#5f6673]">This job has been billed.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

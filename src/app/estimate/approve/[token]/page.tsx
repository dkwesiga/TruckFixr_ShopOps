import { getEstimateByToken } from "@/lib/queries/estimates";
import { approveByToken, declineByToken } from "@/lib/actions/approval";
import { Button } from "@/components/ui/button";
import { formatCurrency, toNum } from "@/lib/money";

const TYPE_LABEL: Record<string, string> = { labour: "Labour", part: "Part", fee: "Fee" };

export default async function EstimateApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const estimate = await getEstimateByToken(token);

  if (!estimate) {
    return <Shell><Message title="Link not found" body="This approval link is invalid or has been removed." /></Shell>;
  }

  const expired = estimate.approvalTokenExpiresAt != null && estimate.approvalTokenExpiresAt < new Date();
  const vehicleText = estimate.vehicle
    ? [estimate.vehicle.year, estimate.vehicle.make, estimate.vehicle.model].filter(Boolean).join(" ") ||
      (estimate.vehicle.unitNumber ? `Unit #${estimate.vehicle.unitNumber}` : null)
    : null;

  const pending = estimate.status === "sent" && !expired;

  return (
    <Shell>
      <div className="text-center mb-6">
        <p className="text-xs font-semibold text-[#004787] uppercase tracking-wider">{estimate.company.name}</p>
        <h1 className="text-xl font-bold text-[#191c20] mt-1">Estimate {estimate.estimateNumber}</h1>
        <p className="text-sm text-[#5f6673] mt-0.5">for {estimate.customer.companyName || estimate.customer.name}</p>
      </div>

      {/* Outcome banners */}
      {done === "approved" || estimate.status === "approved" || estimate.status === "converted" ? (
        <Banner tone="success" text="This estimate has been approved. Thank you — the shop has been notified." />
      ) : done === "declined" || estimate.status === "declined" ? (
        <Banner tone="error" text="This estimate has been declined." />
      ) : expired ? (
        <Banner tone="warning" text="This approval link has expired. Please contact the shop for an updated estimate." />
      ) : estimate.status === "cancelled" ? (
        <Banner tone="warning" text="This estimate has been cancelled by the shop." />
      ) : null}

      {vehicleText && (
        <div className="industrial-card p-4 mb-3">
          <p className="text-xs text-[#858b98]">Vehicle</p>
          <p className="text-sm text-[#191c20]">{vehicleText}{estimate.vehicle?.plate ? ` · ${estimate.vehicle.plate}` : ""}</p>
        </div>
      )}

      {estimate.complaint && (
        <div className="industrial-card p-4 mb-3">
          <p className="text-xs text-[#858b98]">Complaint</p>
          <p className="text-sm text-[#191c20]">{estimate.complaint}</p>
        </div>
      )}

      {/* Lines */}
      <div className="space-y-2 mb-3">
        {estimate.lines.map((l) => (
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

      {/* Totals */}
      <div className="industrial-card p-4 space-y-1.5 mb-3">
        <Row label="Subtotal" value={formatCurrency(estimate.subtotal)} />
        <Row label="Tax" value={formatCurrency(estimate.taxAmount)} />
        <div className="border-t border-[#eef0f5] pt-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#191c20]">Total</span>
          <span className="text-base font-bold text-[#191c20]">{formatCurrency(estimate.total)}</span>
        </div>
      </div>

      {estimate.customerNotes && (
        <div className="industrial-card p-4 mb-3">
          <p className="text-xs text-[#858b98]">Note</p>
          <p className="text-sm text-[#191c20]">{estimate.customerNotes}</p>
        </div>
      )}

      <div className="text-center mt-4">
        <a href={`/estimate/approve/${token}/print`} className="text-sm text-[#004787] font-medium">
          View / download PDF
        </a>
      </div>

      {/* Approve / decline */}
      {pending && (
        <div className="space-y-2 mt-5">
          <form action={approveByToken.bind(null, token)}>
            <Button type="submit" size="lg" className="w-full">Approve this estimate</Button>
          </form>
          <form action={declineByToken.bind(null, token)}>
            <Button type="submit" variant="secondary" size="md" className="w-full">Decline</Button>
          </form>
        </div>
      )}

      <p className="text-[11px] text-[#858b98] text-center mt-6">
        Tax shown is an estimate and should be confirmed on the final invoice. Secured by a private link.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f1f3f9]">
      <div className="max-w-md mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#5f6673]">{label}</span>
      <span className="text-sm text-[#424955]">{value}</span>
    </div>
  );
}

function Banner({ tone, text }: { tone: "success" | "error" | "warning"; text: string }) {
  const styles = {
    success: "bg-[#e8f5e9] border-[#2e7d32]/40 text-[#2e7d32]",
    error: "bg-[#fdecec] border-[#d32f2f]/40 text-red-800",
    warning: "bg-[#fff3e8] border-[#f2862e]/40 text-[#9b4c10]",
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm mb-4 ${styles}`}>{text}</div>;
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-16">
      <h1 className="text-lg font-semibold text-[#191c20]">{title}</h1>
      <p className="text-sm text-[#5f6673] mt-1">{body}</p>
    </div>
  );
}

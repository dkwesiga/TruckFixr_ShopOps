import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EstimateStatusBadge, InvoiceStatusBadge } from "@/components/ui/status-badge";
import { extractionEnabled } from "@/lib/ai/config";

interface JobLink {
  id: string;
  href: string;
  number: string;
  customer: string;
  badge: React.ReactNode;
}

export default async function PartsPurchasePickerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === DEMO_USER_ID) {
    return (
      <PartsPurchaseSurface
        invoices={[
          { id: "demo-inv", href: "/invoices", number: "INV-1048", customer: "Maple Ridge Fleet", badge: <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-semibold text-[#004787]">Sent</span> },
        ]}
        estimates={[
          { id: "demo-est", href: "/estimates", number: "EST-219", customer: "Northline Logistics", badge: <span className="rounded-full bg-[#fff3e8] px-2.5 py-1 text-xs font-semibold text-[#b95c14]">Review</span> },
        ]}
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const [estimates, invoices] = await Promise.all([
    prisma.estimate.findMany({
      where: { companyId: dbUser.companyId, status: { in: ["draft", "sent", "approved"] } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { companyId: dbUser.companyId, status: { in: ["draft", "sent", "partially_paid"] } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return (
    <PartsPurchaseSurface
      invoices={invoices.map((inv) => ({
        id: inv.id,
        href: `/invoices/${inv.id}`,
        number: inv.invoiceNumber,
        customer: inv.customer.name,
        badge: <InvoiceStatusBadge status={inv.status} />,
      }))}
      estimates={estimates.map((estimate) => ({
        id: estimate.id,
        href: `/estimates/${estimate.id}`,
        number: estimate.estimateNumber,
        customer: estimate.customer.name,
        badge: <EstimateStatusBadge status={estimate.status} />,
      }))}
    />
  );
}

function PartsPurchaseSurface({ invoices, estimates }: { invoices: JobLink[]; estimates: JobLink[] }) {
  const empty = estimates.length === 0 && invoices.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Record a Parts Purchase" backHref="/dashboard" />

      <div className="rounded-lg border border-[#f2862e] bg-[#fff3e8] p-4">
        <p className="text-sm leading-5 text-[#9b4c10]">
          Open the job you bought parts for, then tap <span className="font-bold">Add parts from invoice photo</span>.
          Snap the vendor invoice and ShopOps extracts the lines for review.
        </p>
        {!extractionEnabled && (
          <p className="mt-2 text-xs font-semibold text-[#9b4c10]">
            AI extraction is not configured yet. You can still add parts manually on any job.
          </p>
        )}
      </div>

      {empty ? (
        <EmptyState
          title="No open jobs"
          description="Create an estimate or invoice first, then add parts to it."
          actionLabel="New invoice"
          actionHref="/invoices/new"
        />
      ) : (
        <>
          {invoices.length > 0 && <JobList title="Open invoices" jobs={invoices} />}
          {estimates.length > 0 && <JobList title="Open estimates" jobs={estimates} />}
        </>
      )}
    </div>
  );
}

function JobList({ title, jobs }: { title: string; jobs: JobLink[] }) {
  return (
    <section className="space-y-3">
      <h2 className="industrial-label">{title}</h2>
      <div className="space-y-3">
        {jobs.map((job) => (
          <Link key={job.id} href={job.href} className="industrial-card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#191c20]">{job.number}</span>
                {job.badge}
              </div>
              <p className="truncate text-sm text-[#5f6673]">{job.customer}</p>
            </div>
            <Chevron />
          </Link>
        ))}
      </div>
    </section>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-[#858b98]">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    </svg>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { EstimateStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getEstimates } from "@/lib/queries/estimates";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EstimateStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";

const TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
];

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { q, status } = await searchParams;
  const estimates = await getEstimates(dbUser.companyId, {
    status: (status as EstimateStatus) || undefined,
    search: q,
  });

  return (
    <div>
      <PageHeader
        title="Estimates"
        action={
          <Link href="/estimates/new" className="inline-flex items-center rounded-xl bg-[#004787] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e5fa8] min-h-9">
            + New
          </Link>
        }
      />

      <div className="py-3 space-y-3">
        <form method="GET">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search estimates…"
            className="w-full rounded-xl border border-[#c2c6d3] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </form>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {TABS.map((t) => {
            const active = (status ?? "") === t.value;
            const href = t.value ? `/estimates?status=${t.value}` : "/estimates";
            return (
              <Link
                key={t.value}
                href={href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-[#191c20] text-white" : "bg-white text-[#5f6673] border border-[#c2c6d3]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {estimates.length === 0 ? (
        <EmptyState
          title={q || status ? "No estimates match" : "No estimates yet"}
          description={q || status ? undefined : "Create your first estimate to quote a job."}
          actionLabel="New estimate"
          actionHref="/estimates/new"
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {estimates.map((e) => (
            <li key={e.id}>
              <Link href={`/estimates/${e.id}`} className="block industrial-card p-4 active:bg-[#f1f3f9]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#191c20]">{e.estimateNumber}</span>
                      <EstimateStatusBadge status={e.status} />
                    </div>
                    <p className="text-sm text-[#424955] mt-0.5 truncate">{e.customer.name}</p>
                    {(e.vehicle || e.complaint) && (
                      <p className="text-xs text-[#858b98] mt-0.5 truncate">
                        {[
                          e.vehicle && ([e.vehicle.year, e.vehicle.make, e.vehicle.model].filter(Boolean).join(" ") || (e.vehicle.unitNumber ? `#${e.vehicle.unitNumber}` : null)),
                          e.complaint,
                        ].filter(Boolean).join(" — ")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[#191c20] flex-shrink-0">{formatCurrency(e.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

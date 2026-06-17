import Link from "next/link";
import { redirect } from "next/navigation";
import type { WorkOrderStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getWorkOrders } from "@/lib/queries/work-orders";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkOrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/money";

const TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { status } = await searchParams;
  const workOrders = await getWorkOrders(dbUser.companyId, (status as WorkOrderStatus) || undefined);

  return (
    <div>
      <PageHeader title="Work Orders" backHref="/more" />

      <div className="py-3">
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {TABS.map((t) => {
            const active = (status ?? "") === t.value;
            const href = t.value ? `/work-orders?status=${t.value}` : "/work-orders";
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

      {workOrders.length === 0 ? (
        <EmptyState
          title="No work orders"
          description="Work orders are created automatically when an estimate is approved."
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {workOrders.map((w) => {
            const v = w.estimate.vehicle;
            const vehicleText = v
              ? [v.year, v.make, v.model].filter(Boolean).join(" ") || (v.unitNumber ? `#${v.unitNumber}` : "")
              : "";
            return (
              <li key={w.id}>
                <Link href={`/work-orders/${w.id}`} className="block industrial-card p-4 active:bg-[#f1f3f9]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#191c20]">{w.estimate.estimateNumber}</span>
                        <WorkOrderStatusBadge status={w.status} />
                      </div>
                      <p className="text-sm text-[#424955] mt-0.5 truncate">{w.estimate.customer.name}</p>
                      {vehicleText && <p className="text-xs text-[#858b98] mt-0.5 truncate">{vehicleText}</p>}
                    </div>
                    <span className="text-sm font-semibold text-[#191c20] flex-shrink-0">{formatCurrency(w.estimate.total)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

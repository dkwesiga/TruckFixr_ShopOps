import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getVehicles } from "@/lib/queries/vehicles";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { q } = await searchParams;
  const vehicles = await getVehicles(dbUser.companyId, q);

  return (
    <div>
      <PageHeader
        title="Vehicles"
        action={
          <Link href="/vehicles/new" className="inline-flex items-center rounded-xl bg-[#004787] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e5fa8] min-h-9">
            + Add
          </Link>
        }
      />

      <div className="py-3">
        <form method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search vehicles…"
            className="w-full rounded-xl border border-[#c2c6d3] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </form>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          title={q ? "No vehicles match your search" : "No vehicles yet"}
          description={q ? undefined : "Add vehicles from here or from a customer's profile."}
          actionLabel="Add vehicle"
          actionHref="/vehicles/new"
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {vehicles.map((v) => (
            <li key={v.id}>
              <Link
                href={`/vehicles/${v.id}`}
                className="flex items-center gap-3 industrial-card p-4 active:bg-[#f1f3f9]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#eef0f5] flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[#5f6673]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 17a2 2 0 01-2-2v-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1l2-4h10l2 4h1a1 1 0 011 1v4a1 1 0 01-1 1h-2v1a2 2 0 01-2 2M8 17a2 2 0 002 2h4a2 2 0 002-2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#191c20] text-sm truncate">
                    {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                  </p>
                  <p className="text-xs text-[#5f6673] mt-0.5">
                    {v.customer.name}
                    {v.unitNumber && ` · #${v.unitNumber}`}
                    {v.plate && ` · ${v.plate}`}
                  </p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#c2c6d3] flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

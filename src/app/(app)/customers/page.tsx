import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCustomers } from "@/lib/queries/customers";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CustomersPage({
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
  const customers = await getCustomers(dbUser.companyId, q);

  return (
    <div>
      <PageHeader
        title="Customers"
        action={
          <Link href="/customers/new" className="inline-flex items-center rounded-xl bg-[#004787] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e5fa8] min-h-9">
            + Add
          </Link>
        }
      />

      <div className="py-3">
        <form method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search customers…"
            className="w-full rounded-xl border border-[#c2c6d3] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </form>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title={q ? "No customers match your search" : "No customers yet"}
          description={q ? undefined : "Add your first customer or create one inline when writing an estimate."}
          actionLabel="Add customer"
          actionHref="/customers/new"
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="flex items-center gap-3 industrial-card p-4 active:bg-[#f1f3f9]"
              >
                <div className="w-10 h-10 rounded-full bg-[#eef4ff] flex items-center justify-center flex-shrink-0 text-[#004787] font-semibold text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#191c20] text-sm truncate">{c.name}</p>
                  {c.companyName && (
                    <p className="text-xs text-[#5f6673] truncate">{c.companyName}</p>
                  )}
                  <p className="text-xs text-[#858b98] mt-0.5">
                    {c._count.vehicles} vehicle{c._count.vehicles !== 1 ? "s" : ""} · {c._count.invoices} invoice{c._count.invoices !== 1 ? "s" : ""}
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

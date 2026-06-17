import Link from "next/link";
import { redirect } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getInvoices } from "@/lib/queries/invoices";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, toNum } from "@/lib/money";

const TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partial" },
  { value: "paid", label: "Paid" },
];

export default async function InvoicesPage({
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
  const invoices = await getInvoices(dbUser.companyId, {
    status: (status as InvoiceStatus) || undefined,
    search: q,
  });

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={
          <Link href="/invoices/new" className="inline-flex items-center rounded-xl bg-[#004787] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e5fa8] min-h-9">
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
            placeholder="Search invoices…"
            className="w-full rounded-xl border border-[#c2c6d3] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
        </form>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {TABS.map((t) => {
            const active = (status ?? "") === t.value;
            const href = t.value ? `/invoices?status=${t.value}` : "/invoices";
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

      {invoices.length === 0 ? (
        <EmptyState
          title={q || status ? "No invoices match" : "No invoices yet"}
          description={q || status ? undefined : "Bill a completed job by creating an invoice."}
          actionLabel="New invoice"
          actionHref="/invoices/new"
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {invoices.map((inv) => {
            const balance = toNum(inv.balanceDue);
            return (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="block industrial-card p-4 active:bg-[#f1f3f9]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#191c20]">{inv.invoiceNumber}</span>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                      <p className="text-sm text-[#424955] mt-0.5 truncate">{inv.customer.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-[#191c20]">{formatCurrency(inv.total)}</p>
                      {balance > 0 && inv.status !== "void" && (
                        <p className="text-xs text-[#d32f2f] mt-0.5">{formatCurrency(balance)} due</p>
                      )}
                    </div>
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

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/money";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");
  const companyId = dbUser.companyId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [month, year, outstanding] = await Promise.all([
    prisma.invoice.aggregate({ where: { companyId, status: { not: "void" }, invoiceDate: { gte: monthStart } }, _sum: { taxAmount: true, total: true } }),
    prisma.invoice.aggregate({ where: { companyId, status: { not: "void" }, invoiceDate: { gte: yearStart } }, _sum: { taxAmount: true, total: true } }),
    prisma.invoice.aggregate({ where: { companyId, status: { in: ["sent", "partially_paid", "overdue"] } }, _sum: { balanceDue: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Reports & Export" backHref="/more" />

      <div className="py-4 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Tax this month" value={formatCurrency(month._sum.taxAmount)} />
          <Stat label="Sales this month" value={formatCurrency(month._sum.total)} />
          <Stat label="Tax this year" value={formatCurrency(year._sum.taxAmount)} />
          <Stat label="Sales this year" value={formatCurrency(year._sum.total)} />
        </div>
        <Stat label="Outstanding (owed to you)" value={formatCurrency(outstanding._sum.balanceDue)} accent />

        <ExportGroup
          heading="For your accountant"
          items={[
            { label: "Receivables & aging", href: "/api/exports/receivables", note: "All open invoices with balances" },
            { label: "Tax summary — this month", href: "/api/exports/tax-summary?period=month" },
            { label: "Tax summary — this year", href: "/api/exports/tax-summary?period=year" },
            { label: "Sales by customer — this year", href: "/api/exports/sales-by-customer?period=year" },
          ]}
        />

        <ExportGroup
          heading="QuickBooks Desktop (CSV import)"
          items={[
            { label: "Invoices — this month", href: "/api/exports/quickbooks?period=month" },
            { label: "Invoices — this year", href: "/api/exports/quickbooks?period=year" },
            { label: "Invoices — all time", href: "/api/exports/quickbooks?period=all" },
          ]}
        />

        <p className="text-[11px] text-[#858b98] text-center pt-1">
          CSV exports are line-level and formatted for import tools (Transaction Pro, SaasAnt). Tax figures are estimates — review with your accountant or bookkeeper before filing.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-lg p-4 bg-[#004787]" : "industrial-card p-4"}>
      <p className={`text-xs ${accent ? "text-[#d7e7ff]" : "text-[#5f6673]"}`}>{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accent ? "text-white" : "text-[#191c20]"}`}>{value}</p>
    </div>
  );
}

function ExportGroup({ heading, items }: { heading: string; items: { label: string; href: string; note?: string }[] }) {
  return (
    <div>
      <h2 className="industrial-label mb-2">{heading}</h2>
      <div className="space-y-2">
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            className="industrial-card flex items-center justify-between p-4 active:bg-[#f1f3f9]"
          >
            <div>
              <p className="text-sm font-semibold text-[#191c20]">{it.label}</p>
              {it.note && <p className="text-xs text-[#5f6673] mt-0.5">{it.note}</p>}
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-[#858b98] flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { formatCurrency, toNum } from "@/lib/money";

interface InvoiceCard {
  id: string;
  href: string;
  number: string;
  customer: string;
  due: string;
  amount: number;
  state: "overdue" | "pending" | "sent";
}

interface ReceivableMetric {
  label: string;
  value: string;
  tone?: "primary" | "warning" | "success";
}

const demoInvoices: InvoiceCard[] = [
  { id: "demo-1", href: "/invoices", number: "INV-1048", customer: "Maple Ridge Fleet", due: "Due Jun 20", amount: 1840, state: "sent" },
  { id: "demo-2", href: "/invoices", number: "INV-1039", customer: "Northline Logistics", due: "8 days overdue", amount: 3275.5, state: "overdue" },
  { id: "demo-3", href: "/invoices", number: "INV-1033", customer: "Ironwood Transport", due: "Due this week", amount: 945.2, state: "pending" },
];

export default async function ReceivablesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === DEMO_USER_ID) {
    return (
      <ReceivablesSurface
        metrics={[
          { label: "Outstanding", value: "$6,060.70", tone: "primary" },
          { label: "Overdue", value: "$3,275.50", tone: "warning" },
          { label: "Tax this month", value: "$812.35" },
          { label: "Open invoices", value: "3", tone: "success" },
        ]}
        invoices={demoInvoices}
        footer="Demo receivables use Stitch sample data until real database credentials are configured."
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const { getReceivables } = await import("@/lib/queries/receivables");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { openInvoices, taxThisMonth, salesThisMonth } = await getReceivables(dbUser.companyId);
  const now = new Date();
  const totalOutstanding = openInvoices.reduce((sum, inv) => sum + toNum(inv.balanceDue), 0);
  const overdueTotal = openInvoices.reduce((sum, inv) => {
    const ref = inv.dueDate ?? inv.invoiceDate;
    return ref < now ? sum + toNum(inv.balanceDue) : sum;
  }, 0);

  return (
    <ReceivablesSurface
      metrics={[
        { label: "Outstanding", value: formatCurrency(totalOutstanding), tone: "primary" },
        { label: "Overdue", value: formatCurrency(overdueTotal), tone: overdueTotal > 0 ? "warning" : undefined },
        { label: "Tax this month", value: formatCurrency(taxThisMonth) },
        { label: "Sales this month", value: formatCurrency(salesThisMonth), tone: "success" },
      ]}
      invoices={openInvoices.map((inv) => {
        const ref = inv.dueDate ?? inv.invoiceDate;
        const overdue = ref < now;
        return {
          id: inv.id,
          href: `/invoices/${inv.id}`,
          number: inv.invoiceNumber,
          customer: inv.customer.name,
          due: inv.dueDate ? `Due ${fmtDate(inv.dueDate)}` : `Issued ${fmtDate(inv.invoiceDate)}`,
          amount: toNum(inv.balanceDue),
          state: overdue ? "overdue" : "sent",
        };
      })}
      footer="Tax totals are estimates. Review with your accountant or bookkeeper before filing."
    />
  );
}

function ReceivablesSurface({
  metrics,
  invoices,
  footer,
}: {
  metrics: ReceivableMetric[];
  invoices: InvoiceCard[];
  footer: string;
}) {
  return (
    <div className="space-y-6">
      <section className="pt-2">
        <h1 className="text-[32px] font-bold leading-10 text-[#191c20]">Receivables</h1>
        <p className="mt-1 text-base leading-6 text-[#5f6673]">Track money owed, overdue balances, and tax exposure.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="industrial-label">Open invoices</h2>
          <Link href="/invoices/new" className="rounded-lg bg-[#f2862e] px-3 py-2 text-sm font-bold text-white">
            New
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="industrial-card p-5 text-center">
            <p className="text-base font-bold text-[#191c20]">Nothing outstanding</p>
            <p className="mt-1 text-sm text-[#5f6673]">All sent invoices are paid.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Link key={invoice.id} href={invoice.href} className="industrial-card flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eef4ff] text-[#004787]">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.75h11v16.5l-2.75-1.5-2.75 1.5-2.75-1.5-2.75 1.5V3.75Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.5h6M9 12h6M9 15.5h3.5" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-bold text-[#191c20]">{invoice.number}</p>
                    <StatusPill state={invoice.state} />
                  </div>
                  <p className="truncate text-sm text-[#5f6673]">{invoice.customer}</p>
                  <p className={`text-sm font-semibold ${invoice.state === "overdue" ? "text-[#d32f2f]" : "text-[#5f6673]"}`}>
                    {invoice.due}
                  </p>
                </div>
                <p className="text-base font-bold text-[#191c20]">{formatCurrency(invoice.amount)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="rounded-lg border border-[#c2c6d3] bg-white px-4 py-3 text-center text-xs leading-5 text-[#5f6673]">
        {footer}
      </p>
    </div>
  );
}

function Metric({ label, value, tone }: ReceivableMetric) {
  const toneClass =
    tone === "primary"
      ? "border-[#004787] bg-[#004787] text-white"
      : tone === "warning"
        ? "border-[#f2862e] bg-[#fff3e8] text-[#191c20]"
        : tone === "success"
          ? "border-[#2e7d32] bg-[#e8f5e9] text-[#191c20]"
          : "border-[#c2c6d3] bg-white text-[#191c20]";

  return (
    <div className={`rounded-lg border p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] ${toneClass}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.04em] ${tone === "primary" ? "text-[#d7e7ff]" : "text-[#5f6673]"}`}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold leading-8">{value}</p>
    </div>
  );
}

function StatusPill({ state }: { state: InvoiceCard["state"] }) {
  const classes = {
    overdue: "bg-[#fdecec] text-[#d32f2f]",
    pending: "bg-[#fff3e8] text-[#b95c14]",
    sent: "bg-[#eef4ff] text-[#004787]",
  };
  const labels = {
    overdue: "Overdue",
    pending: "Pending",
    sent: "Sent",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${classes[state]}`}>{labels[state]}</span>;
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(d);
}

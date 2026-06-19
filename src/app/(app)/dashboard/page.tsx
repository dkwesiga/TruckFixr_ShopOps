import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID, isPlaceholderDatabaseEnv } from "@/lib/demo-auth";
import { getCompanyNameByUserId } from "@/lib/live-records";
import { RoutePrefetcher } from "@/components/navigation/route-prefetcher";

const tasks = [
  {
    href: "/estimates/new",
    label: "Create Estimate",
    description: "Start with voice, text, or typed job details.",
    icon: "doc",
  },
  {
    href: "/invoices/new",
    label: "Create Invoice",
    description: "Bill a completed job and collect payment faster.",
    icon: "invoice",
  },
  {
    href: "/parts-purchase/new",
    label: "Scan Parts Purchase",
    description: "Capture vendor invoices and receipts by photo.",
    icon: "camera",
  },
  {
    href: "/receivables",
    label: "Review Receivables",
    description: "See overdue balances, taxes, and open invoices.",
    icon: "chart",
  },
];

const activity = [
  { title: "INV-1048 sent to Maple Ridge Fleet", meta: "12 min ago", status: "Sent" },
  { title: "Estimate approved for Northline Logistics", meta: "Today", status: "Approved" },
  { title: "Parts receipt needs review", meta: "Yesterday", status: "Review" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === DEMO_USER_ID && isPlaceholderDatabaseEnv()) {
    return <DashboardSurface name="Dickson" demo />;
  }

  const companyName = await getCompanyNameByUserId(user.id);
  if (!companyName) redirect("/onboarding");

  return <DashboardSurface name={companyName} />;
}

function DashboardSurface({ name, demo = false }: { name: string; demo?: boolean }) {
  return (
    <div className="space-y-7">
      <RoutePrefetcher routes={["/estimates/new", "/invoices/new", "/parts-purchase/new", "/receivables"]} />
      <section className="pt-2">
        <h1 className="text-[32px] font-bold leading-10 text-[#191c20]">Good afternoon, {name}</h1>
        <p className="mt-1 text-base leading-6 text-[#5f6673]">Here&apos;s what&apos;s happening at the shop today.</p>
      </section>

      <section className="space-y-3">
        <h2 className="industrial-label">Choose a task</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            demo ? (
              <Link
                key={task.href}
                href={task.href}
                className="industrial-card flex items-center gap-4 p-4 transition-transform active:scale-[0.99]"
              >
                <TaskIcon name={task.icon} />
                <TaskCopy label={task.label} description={task.description} />
                <span className="rounded-full bg-[#eef0f5] px-2.5 py-1 text-xs font-semibold text-[#5f6673]">Demo</span>
              </Link>
            ) : (
              <Link
                key={task.href}
                href={task.href}
                className="industrial-card flex items-center gap-4 p-4 transition-transform active:scale-[0.99]"
              >
                <TaskIcon name={task.icon} />
                <TaskCopy label={task.label} description={task.description} />
                <Chevron />
              </Link>
            )
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="industrial-label">Recent activity</h2>
        <div className="industrial-card divide-y divide-[#e3e6ee]">
          {activity.map((item) => (
            <div key={item.title} className="flex items-center gap-3 p-4">
              <div className="h-2.5 w-2.5 rounded-full bg-[#f2862e]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#191c20]">{item.title}</p>
                <p className="text-xs text-[#5f6673]">{item.meta}</p>
              </div>
              <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-semibold text-[#004787]">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {demo && (
        <div className="rounded-lg border border-[#b7c8e8] bg-[#eef4ff] px-4 py-3 text-sm leading-5 text-[#004787]">
          Demo mode is running with the Stitch interface and local demo auth. Add real Supabase and Postgres values to enable live records.
        </div>
      )}

      <button
        type="button"
        className="fixed bottom-24 right-4 z-20 rounded-full bg-[#191c20] px-4 py-3 text-sm font-semibold text-white shadow-lg md:right-[calc(50%-32rem)]"
      >
        Something off? Tell us
      </button>
    </div>
  );
}

function TaskCopy({ label, description }: { label: string; description: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-base font-bold leading-6 text-[#191c20]">{label}</p>
      <p className="mt-0.5 text-sm leading-5 text-[#5f6673]">{description}</p>
    </div>
  );
}

function TaskIcon({ name }: { name: string }) {
  return (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-[#004787]">
      {name === "doc" && (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h6.5L18 8.25v12H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75V8.25H18M8.5 12.25h7M8.5 16h5" />
        </svg>
      )}
      {name === "invoice" && (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.75h11v16.5l-2.75-1.5-2.75 1.5-2.75-1.5-2.75 1.5V3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.5h6M9 12h6M9 15.5h3.5" />
        </svg>
      )}
      {name === "camera" && (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.25a2 2 0 0 1 2-2h2.1l1.15-1.5h5.5l1.15 1.5H18a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
        </svg>
      )}
      {name === "chart" && (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5M5 19h14" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 16v-4M12 16V8M15.5 16v-6" />
        </svg>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-[#858b98]">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    </svg>
  );
}

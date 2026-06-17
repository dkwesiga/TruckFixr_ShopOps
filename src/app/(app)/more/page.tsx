import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { CaptureNavLink } from "@/components/offline/capture-nav-link";
import { DraftsNavLink } from "@/components/offline/drafts-nav-link";

const SECTIONS: { heading: string; links: { href: string; label: string; description: string }[] }[] = [
  {
    heading: "Money",
    links: [
      { href: "/receivables", label: "Receivables", description: "Who owes you, aging & tax this month" },
      { href: "/reports", label: "Reports & Export", description: "Tax summary, sales, QuickBooks CSV" },
      { href: "/work-orders", label: "Work Orders", description: "Jobs approved and in progress" },
    ],
  },
  {
    heading: "Records",
    links: [
      { href: "/customers", label: "Customers", description: "People and companies you bill" },
      { href: "/vehicles", label: "Vehicles", description: "Trucks and units you service" },
      { href: "/items", label: "Items & Labour", description: "Parts, labour rates and templates" },
    ],
  },
  {
    heading: "Shop",
    links: [
      { href: "/settings", label: "Shop settings", description: "Details, branding, tax & rates" },
    ],
  },
];

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: { select: { name: true } } },
  });
  if (!dbUser) redirect("/onboarding");

  return (
    <div>
      <PageHeader title="More" />

      <div className="py-4 space-y-6">
        <div className="industrial-card p-4">
          <p className="text-xs text-[#858b98]">Shop</p>
          <p className="text-base font-semibold text-[#191c20]">{dbUser.company.name}</p>
          <p className="text-xs text-[#5f6673] mt-0.5">{dbUser.email}</p>
        </div>

        <CaptureNavLink />
        <DraftsNavLink />

        {SECTIONS.map((section) => (
          <div key={section.heading}>
            <h2 className="industrial-label mb-2">{section.heading}</h2>
            <div className="space-y-2">
              {section.links.map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center justify-between industrial-card p-4 active:bg-[#f1f3f9]">
                  <div>
                    <p className="text-sm font-medium text-[#191c20]">{link.label}</p>
                    <p className="text-xs text-[#5f6673] mt-0.5">{link.description}</p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#c2c6d3] flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-2">
          <FeedbackWidget />
        </div>
      </div>
    </div>
  );
}

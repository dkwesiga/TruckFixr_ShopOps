import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { CaptureInbox } from "@/components/offline/capture-inbox";

export default async function CapturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Customers for the "turn capture into a document" picker. Tolerate demo/no-DB.
  let customers: { id: string; name: string; companyName: string | null; vehicles: { id: string; label: string }[] }[] = [];
  try {
    const { prisma } = await import("@/lib/prisma");
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
    if (dbUser) {
      const rows = await prisma.customer.findMany({
        where: { companyId: dbUser.companyId },
        select: {
          id: true,
          name: true,
          companyName: true,
          vehicles: { select: { id: true, unitNumber: true, year: true, make: true, model: true, plate: true }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { name: "asc" },
      });
      customers = rows.map((c) => ({
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        vehicles: c.vehicles.map((v) => ({
          id: v.id,
          label: ([v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle") + (v.unitNumber ? ` · #${v.unitNumber}` : v.plate ? ` · ${v.plate}` : ""),
        })),
      }));
    }
  } catch {
    customers = [];
  }

  return (
    <div>
      <PageHeader
        title="Capture inbox"
        action={
          <Link href="/capture/new" className="inline-flex items-center rounded-xl bg-[#004787] px-3 py-1.5 text-sm font-medium text-white">+ New</Link>
        }
      />
      <div className="py-4">
        <CaptureInbox customers={customers} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStartForm } from "@/components/documents/document-start-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { customerId, error } = await searchParams;

  const [{ prisma }, { getCustomersWithVehicles }, { createInvoice }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/queries/customers"),
    import("@/lib/actions/invoices"),
  ]);
  if (user.id === DEMO_USER_ID) {
    const { ensureDemoAccount } = await import("@/lib/demo-account");
    await ensureDemoAccount();
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const customers = await getCustomersWithVehicles(dbUser.companyId);

  return (
    <div className="space-y-4">
      <PageHeader title="New Invoice" backHref="/invoices" />
      {error && (
        <div className="rounded-lg border border-[#d32f2f] bg-[#fdecec] px-3 py-2 text-sm font-semibold text-[#d32f2f]">
          {error}
        </div>
      )}
      <DocumentStartForm
        customers={customers}
        action={createInvoice}
        initialCustomerId={customerId}
        complaintLabel="Work done (note)"
        complaintPlaceholder="Quick description of the job - you'll add labour and parts lines next"
        submitLabel="Start invoice"
      />
    </div>
  );
}

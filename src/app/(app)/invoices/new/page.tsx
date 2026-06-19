import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStartForm } from "@/components/documents/document-start-form";
import { getDbUserById } from "@/lib/live-records";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { customerId, error } = await searchParams;

  const [{ getCustomersWithVehicles }, { createInvoice }] = await Promise.all([
    import("@/lib/queries/customers"),
    import("@/lib/actions/invoices"),
  ]);
  const dbUser = await getDbUserById(user.id);
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

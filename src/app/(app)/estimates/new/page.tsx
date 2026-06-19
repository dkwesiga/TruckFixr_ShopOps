import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStartForm } from "@/components/documents/document-start-form";
import { getCustomersWithVehicles } from "@/lib/queries/customers";
import { createEstimate } from "@/lib/actions/estimates";
import { getDbUserById } from "@/lib/live-records";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { customerId, error } = await searchParams;

  const dbUser = await getDbUserById(user.id);
  if (!dbUser) redirect("/onboarding");

  const customersPromise = getCustomersWithVehicles(dbUser.companyId);

  return (
    <div className="space-y-4">
      <PageHeader title="New Estimate" backHref="/estimates" />
      {error && (
        <div className="rounded-lg border border-[#d32f2f] bg-[#fdecec] px-3 py-2 text-sm font-semibold text-[#d32f2f]">
          {error}
        </div>
      )}
      <Suspense fallback={<EstimateFormSkeleton />}>
        <EstimateStartForm customersPromise={customersPromise} initialCustomerId={customerId} />
      </Suspense>
    </div>
  );
}

async function EstimateStartForm({
  customersPromise,
  initialCustomerId,
}: {
  customersPromise: ReturnType<typeof getCustomersWithVehicles>;
  initialCustomerId?: string;
}) {
  const customers = await customersPromise;

  return (
    <DocumentStartForm
      customers={customers}
      action={createEstimate}
      initialCustomerId={initialCustomerId}
      complaintLabel="Complaint / scope"
      complaintPlaceholder="What does the customer want looked at? (you'll add labour and parts next)"
      submitLabel="Start estimate"
    />
  );
}

function EstimateFormSkeleton() {
  return (
    <div className="industrial-card space-y-4 p-5">
      <div className="h-4 w-48 rounded bg-[#e3e6ee]" />
      <div className="h-12 rounded-lg border border-[#c2c6d3] bg-white" />
      <div className="h-32 rounded-lg border border-[#e3e6ee] bg-white" />
      <div className="h-24 rounded-lg border border-[#c2c6d3] bg-white" />
      <div className="h-12 rounded-lg bg-[#004787]" />
    </div>
  );
}

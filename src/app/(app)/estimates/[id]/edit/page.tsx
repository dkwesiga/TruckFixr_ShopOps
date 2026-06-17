import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getEstimate } from "@/lib/queries/estimates";
import { updateEstimateHeader } from "@/lib/actions/estimates";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const estimate = await getEstimate(id, dbUser.companyId);
  if (!estimate) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: dbUser.companyId, customerId: estimate.customerId },
    select: { id: true, unitNumber: true, year: true, make: true, model: true, plate: true },
    orderBy: { createdAt: "desc" },
  });

  const update = updateEstimateHeader.bind(null, id);
  const expiryValue = estimate.expiryDate ? estimate.expiryDate.toISOString().slice(0, 10) : "";

  return (
    <div>
      <PageHeader title={`Edit ${estimate.estimateNumber}`} backHref={`/estimates/${id}`} />

      <form action={update} className="px-4 py-5 space-y-4">
        <Select
          label="Vehicle / unit"
          name="vehicleId"
          defaultValue={estimate.vehicleId ?? ""}
          placeholder={vehicles.length ? "Select vehicle (optional)…" : "No vehicles on file"}
          disabled={vehicles.length === 0}
          options={vehicles.map((v) => ({
            value: v.id,
            label:
              ([v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle") +
              ([v.unitNumber && `#${v.unitNumber}`, v.plate].filter(Boolean).join(" · ") ? ` (${[v.unitNumber && `#${v.unitNumber}`, v.plate].filter(Boolean).join(" · ")})` : ""),
          }))}
        />

        <Textarea label="Complaint / scope" name="complaint" defaultValue={estimate.complaint ?? ""} placeholder="What the customer wants looked at" />
        <Textarea label="Recommended work" name="recommendedWork" defaultValue={estimate.recommendedWork ?? ""} placeholder="What you recommend doing" />

        <Input label="Expiry date" name="expiryDate" type="date" defaultValue={expiryValue} />

        <Textarea label="Customer note" name="customerNotes" defaultValue={estimate.customerNotes ?? ""} placeholder="Shown to the customer" />
        <Textarea label="Internal note" name="internalNotes" defaultValue={estimate.internalNotes ?? ""} placeholder="Private — not shown to customer" />

        <Button type="submit" size="lg" className="w-full mt-2">Save changes</Button>
      </form>
    </div>
  );
}

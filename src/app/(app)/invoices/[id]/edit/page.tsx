import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getInvoice } from "@/lib/queries/invoices";
import { updateInvoiceHeader } from "@/lib/actions/invoices";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PAYMENT_TERMS_OPTIONS } from "@/lib/constants";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const invoice = await getInvoice(id, dbUser.companyId);
  if (!invoice) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: dbUser.companyId, customerId: invoice.customerId },
    select: { id: true, unitNumber: true, year: true, make: true, model: true, plate: true },
    orderBy: { createdAt: "desc" },
  });

  const update = updateInvoiceHeader.bind(null, id);
  const dueValue = invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "";

  return (
    <div>
      <PageHeader title={`Edit ${invoice.invoiceNumber}`} backHref={`/invoices/${id}`} />

      <form action={update} className="px-4 py-5 space-y-4">
        <Select
          label="Vehicle / unit"
          name="vehicleId"
          defaultValue={invoice.vehicleId ?? ""}
          placeholder={vehicles.length ? "Select vehicle (optional)…" : "No vehicles on file"}
          disabled={vehicles.length === 0}
          options={vehicles.map((v) => ({
            value: v.id,
            label: [v.year, v.make, v.model].filter(Boolean).join(" ") || (v.unitNumber ? `#${v.unitNumber}` : "Vehicle"),
          }))}
        />

        <Select
          label="Payment terms"
          name="paymentTerms"
          defaultValue={invoice.paymentTerms ?? ""}
          placeholder="Select terms…"
          options={PAYMENT_TERMS_OPTIONS}
        />

        <Input label="Due date" name="dueDate" type="date" defaultValue={dueValue} />

        <Textarea label="Customer note" name="customerNotes" defaultValue={invoice.customerNotes ?? ""} placeholder="Shown to the customer" />
        <Textarea label="Internal note" name="internalNotes" defaultValue={invoice.internalNotes ?? ""} placeholder="Private — not shown to customer" />

        <Button type="submit" size="lg" className="w-full mt-2">Save changes</Button>
      </form>
    </div>
  );
}

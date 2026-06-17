import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/queries/customers";
import { updateCustomer } from "@/lib/actions/customers";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PAYMENT_TERMS_OPTIONS } from "@/lib/constants";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const customer = await getCustomer(id, dbUser.companyId);
  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Customer" backHref={`/customers/${id}`} />

      <form action={action} className="py-5 space-y-4">
        <Input label="Name" name="name" required defaultValue={customer.name} />
        <Input label="Company name" name="companyName" defaultValue={customer.companyName ?? ""} />
        <Input label="Contact person" name="contactPerson" defaultValue={customer.contactPerson ?? ""} />
        <Input label="Phone" name="phone" type="tel" defaultValue={customer.phone ?? ""} />
        <Input label="Email" name="email" type="email" defaultValue={customer.email ?? ""} />
        <Textarea label="Billing address" name="billingAddress" defaultValue={customer.billingAddress ?? ""} />
        <Textarea label="Service address" name="serviceAddress" defaultValue={customer.serviceAddress ?? ""} />
        <Select
          label="Payment terms"
          name="paymentTerms"
          options={PAYMENT_TERMS_OPTIONS}
          placeholder="Select terms…"
          defaultValue={customer.paymentTerms ?? ""}
        />
        <label className="flex items-center gap-3 py-1">
          <input type="checkbox" name="taxExempt" value="true" defaultChecked={customer.taxExempt} className="w-4 h-4 rounded border-[#c2c6d3] text-[#004787] focus:ring-[#004787]" />
          <span className="text-sm text-[#424955]">Tax exempt (no tax on this customer’s documents)</span>
        </label>
        <Textarea label="Notes" name="notes" defaultValue={customer.notes ?? ""} />

        <Button type="submit" size="lg" className="w-full mt-2">
          Save changes
        </Button>
      </form>
    </div>
  );
}

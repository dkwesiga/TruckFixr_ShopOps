import { createCustomer } from "@/lib/actions/customers";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PAYMENT_TERMS_OPTIONS } from "@/lib/constants";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <div>
      <PageHeader title="New Customer" backHref={returnTo ?? "/customers"} />

      <form action={createCustomer} className="py-5 space-y-4">
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

        <Input label="Name" name="name" required placeholder="e.g. John Smith" autoFocus />
        <Input label="Company name" name="companyName" placeholder="e.g. Smith Logistics" />
        <Input label="Contact person" name="contactPerson" placeholder="If different from name" />
        <Input label="Phone" name="phone" type="tel" placeholder="(555) 000-0000" />
        <Input label="Email" name="email" type="email" placeholder="john@example.com" />
        <Textarea label="Billing address" name="billingAddress" placeholder="Street, City, Province, Postal code" />
        <Textarea label="Service address" name="serviceAddress" placeholder="Leave blank if same as billing" />
        <Select
          label="Payment terms"
          name="paymentTerms"
          options={PAYMENT_TERMS_OPTIONS}
          placeholder="Select terms…"
        />
        <label className="flex items-center gap-3 py-1">
          <input type="checkbox" name="taxExempt" value="true" className="w-4 h-4 rounded border-[#c2c6d3] text-[#004787] focus:ring-[#004787]" />
          <span className="text-sm text-[#424955]">Tax exempt (no tax on this customer’s documents)</span>
        </label>
        <Textarea label="Notes" name="notes" placeholder="Internal notes about this customer" />

        <Button type="submit" size="lg" className="w-full mt-2">
          Save customer
        </Button>
      </form>
    </div>
  );
}

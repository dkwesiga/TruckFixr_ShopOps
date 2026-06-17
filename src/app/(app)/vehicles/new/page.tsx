import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCustomerOptions } from "@/lib/queries/customers";
import { createVehicle } from "@/lib/actions/vehicles";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; returnTo?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { customerId, returnTo } = await searchParams;
  const customers = await getCustomerOptions(dbUser.companyId);

  return (
    <div>
      <PageHeader title="New Vehicle" backHref={returnTo ?? (customerId ? `/customers/${customerId}` : "/vehicles")} />

      <form action={createVehicle} className="px-4 py-5 space-y-4">
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

        <Select
          label="Customer"
          name="customerId"
          required
          defaultValue={customerId ?? ""}
          placeholder="Select customer…"
          options={customers.map((c) => ({
            value: c.id,
            label: c.companyName ? `${c.name} (${c.companyName})` : c.name,
          }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Unit number" name="unitNumber" placeholder="e.g. T-12" />
          <Input label="Plate" name="plate" placeholder="e.g. ABC 123" />
        </div>

        <Input
          label="VIN"
          name="vin"
          placeholder="17-character VIN"
          hint="Year/make/model auto-fill from VIN in Milestone 3"
          maxLength={17}
        />

        <div className="grid grid-cols-3 gap-3">
          <Input label="Year" name="year" type="number" placeholder="2019" min="1900" max="2099" />
          <Input label="Make" name="make" placeholder="Kenworth" className="col-span-1" />
          <Input label="Model" name="model" placeholder="T680" />
        </div>

        <Input label="Engine" name="engine" placeholder="e.g. PACCAR MX-13" />
        <Input label="Transmission" name="transmission" placeholder="e.g. Eaton Fuller 10-spd" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Odometer (km)" name="odometer" type="number" placeholder="0" />
          <Input label="Engine hours" name="engineHours" type="number" placeholder="0" />
        </div>

        <Textarea label="Notes" name="notes" placeholder="Any notes about this vehicle" />

        <Button type="submit" size="lg" className="w-full mt-2">
          Save vehicle
        </Button>
      </form>
    </div>
  );
}

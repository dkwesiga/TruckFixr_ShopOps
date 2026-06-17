import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getVehicle } from "@/lib/queries/vehicles";
import { getCustomerOptions } from "@/lib/queries/customers";
import { updateVehicle } from "@/lib/actions/vehicles";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const [vehicle, customers] = await Promise.all([
    getVehicle(id, dbUser.companyId),
    getCustomerOptions(dbUser.companyId),
  ]);
  if (!vehicle) notFound();

  const action = updateVehicle.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Vehicle" backHref={`/vehicles/${id}`} />

      <form action={action} className="px-4 py-5 space-y-4">
        <Select
          label="Customer"
          name="customerId"
          required
          defaultValue={vehicle.customerId}
          options={customers.map((c) => ({
            value: c.id,
            label: c.companyName ? `${c.name} (${c.companyName})` : c.name,
          }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Unit number" name="unitNumber" defaultValue={vehicle.unitNumber ?? ""} />
          <Input label="Plate" name="plate" defaultValue={vehicle.plate ?? ""} />
        </div>

        <Input label="VIN" name="vin" defaultValue={vehicle.vin ?? ""} maxLength={17} />

        <div className="grid grid-cols-3 gap-3">
          <Input label="Year" name="year" type="number" defaultValue={vehicle.year ?? ""} />
          <Input label="Make" name="make" defaultValue={vehicle.make ?? ""} />
          <Input label="Model" name="model" defaultValue={vehicle.model ?? ""} />
        </div>

        <Input label="Engine" name="engine" defaultValue={vehicle.engine ?? ""} />
        <Input label="Transmission" name="transmission" defaultValue={vehicle.transmission ?? ""} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Odometer (km)" name="odometer" type="number" defaultValue={vehicle.odometer ?? ""} />
          <Input label="Engine hours" name="engineHours" type="number" defaultValue={vehicle.engineHours ?? ""} />
        </div>

        <Textarea label="Notes" name="notes" defaultValue={vehicle.notes ?? ""} />

        <Button type="submit" size="lg" className="w-full mt-2">
          Save changes
        </Button>
      </form>
    </div>
  );
}

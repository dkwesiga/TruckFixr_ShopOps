import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getVehicle } from "@/lib/queries/vehicles";
import { deleteVehicle } from "@/lib/actions/vehicles";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const vehicle = await getVehicle(id, dbUser.companyId);
  if (!vehicle) notFound();

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  const deleteWithId = deleteVehicle.bind(null, id);

  return (
    <div>
      <PageHeader
        title={title}
        backHref="/vehicles"
        action={
          <Link href={`/vehicles/${id}/edit`} className="text-sm text-[#004787] font-medium px-2 py-1">
            Edit
          </Link>
        }
      />

      <div className="py-4 space-y-4">
        <div className="industrial-card p-4 space-y-3">
          <Row label="Customer">
            <Link href={`/customers/${vehicle.customer.id}`} className="text-sm text-[#004787]">
              {vehicle.customer.name}
            </Link>
          </Row>
          {vehicle.unitNumber && <Row label="Unit #" value={vehicle.unitNumber} />}
          {vehicle.vin && <Row label="VIN" value={vehicle.vin} mono />}
          {vehicle.plate && <Row label="Plate" value={vehicle.plate} />}
          {vehicle.engine && <Row label="Engine" value={vehicle.engine} />}
          {vehicle.transmission && <Row label="Trans." value={vehicle.transmission} />}
          {vehicle.odometer != null && <Row label="Odometer" value={`${vehicle.odometer.toLocaleString()} km`} />}
          {vehicle.engineHours != null && <Row label="Eng. hrs" value={`${vehicle.engineHours.toLocaleString()} hr`} />}
          {vehicle.notes && <Row label="Notes" value={vehicle.notes} />}
        </div>

        <div className="pt-2">
          <form action={deleteWithId}>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={(e) => {
                if (!confirm("Delete this vehicle? This cannot be undone.")) e.preventDefault();
              }}
            >
              Delete vehicle
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, children, mono,
}: {
  label: string; value?: string | null; children?: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#858b98] w-16 flex-shrink-0 pt-0.5">{label}</span>
      {children ?? (
        <span className={`text-sm text-[#424955] flex-1 whitespace-pre-wrap ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}

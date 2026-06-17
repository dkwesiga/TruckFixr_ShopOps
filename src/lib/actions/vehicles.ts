"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionContext, withRLS } from "@/lib/rls";

export async function createVehicle(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const customerId = str(formData.get("customerId"));
  if (!customerId) redirect("/vehicles/new?error=Customer+is+required");

  const returnTo = formData.get("returnTo") as string | null;

  const vehicle = await withRLS(userId, companyId, (tx) =>
    tx.vehicle.create({
      data: {
        companyId,
        customerId,
        unitNumber: str(formData.get("unitNumber")),
        vin: str(formData.get("vin")),
        plate: str(formData.get("plate")),
        year: num(formData.get("year")),
        make: str(formData.get("make")),
        model: str(formData.get("model")),
        engine: str(formData.get("engine")),
        transmission: str(formData.get("transmission")),
        odometer: num(formData.get("odometer")),
        engineHours: num(formData.get("engineHours")),
        notes: str(formData.get("notes")),
      },
    })
  );

  revalidatePath("/vehicles");
  revalidatePath(`/customers/${customerId}`);
  redirect(returnTo ? `${returnTo}?vehicleId=${vehicle.id}` : `/vehicles/${vehicle.id}`);
}

export async function updateVehicle(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const customerId = str(formData.get("customerId"));
  if (!customerId) redirect(`/vehicles/${id}/edit?error=Customer+is+required`);

  await withRLS(userId, companyId, (tx) =>
    tx.vehicle.update({
      where: { id, companyId },
      data: {
        customerId,
        unitNumber: str(formData.get("unitNumber")),
        vin: str(formData.get("vin")),
        plate: str(formData.get("plate")),
        year: num(formData.get("year")),
        make: str(formData.get("make")),
        model: str(formData.get("model")),
        engine: str(formData.get("engine")),
        transmission: str(formData.get("transmission")),
        odometer: num(formData.get("odometer")),
        engineHours: num(formData.get("engineHours")),
        notes: str(formData.get("notes")),
      },
    })
  );

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}

export async function deleteVehicle(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const vehicle = await prisma.vehicle.findUnique({ where: { id, companyId }, select: { customerId: true } });

  await withRLS(userId, companyId, (tx) =>
    tx.vehicle.delete({ where: { id, companyId } })
  );

  revalidatePath("/vehicles");
  if (vehicle) revalidatePath(`/customers/${vehicle.customerId}`);
  redirect("/vehicles");
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

function num(val: FormDataEntryValue | null): number | null {
  const n = parseInt((val as string | null) ?? "", 10);
  return isNaN(n) ? null : n;
}

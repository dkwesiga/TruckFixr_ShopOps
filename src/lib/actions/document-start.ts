import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

interface DocumentStartResult {
  customerId: string;
  vehicleId: string | null;
}

export async function resolveDocumentStart(
  tx: Prisma.TransactionClient,
  companyId: string,
  formData: FormData,
  errorPath: string
): Promise<DocumentStartResult> {
  const customerMode = str(formData.get("customerMode"));
  let customerId = str(formData.get("customerId"));

  if (customerMode === "new" || !customerId) {
    const name = str(formData.get("newCustomerName"));
    if (!name) redirect(`${errorPath}?error=Customer+name+is+required`);

    const customer = await tx.customer.create({
      data: {
        companyId,
        name,
        companyName: str(formData.get("newCustomerCompanyName")),
        phone: str(formData.get("newCustomerPhone")),
        email: str(formData.get("newCustomerEmail")),
      },
      select: { id: true },
    });
    customerId = customer.id;
  } else {
    const customer = await tx.customer.findUnique({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    if (!customer) redirect(`${errorPath}?error=Pick+a+valid+customer`);
  }

  let vehicleId: string | null = null;
  const vehicleMode = str(formData.get("vehicleMode"));
  const submittedVehicleId = str(formData.get("vehicleId"));

  if (vehicleMode === "existing" && submittedVehicleId) {
    const vehicle = await tx.vehicle.findUnique({
      where: { id: submittedVehicleId, companyId },
      select: { id: true, customerId: true },
    });
    if (!vehicle || vehicle.customerId !== customerId) {
      redirect(`${errorPath}?error=Pick+a+valid+vehicle`);
    }
    vehicleId = vehicle.id;
  } else if (vehicleMode === "new" || hasNewVehicleData(formData)) {
    const vehicle = await tx.vehicle.create({
      data: {
        companyId,
        customerId,
        unitNumber: str(formData.get("newVehicleUnitNumber")),
        vin: str(formData.get("newVehicleVin")),
        plate: str(formData.get("newVehiclePlate")),
        year: num(formData.get("newVehicleYear")),
        make: str(formData.get("newVehicleMake")),
        model: str(formData.get("newVehicleModel")),
      },
      select: { id: true },
    });
    vehicleId = vehicle.id;
  }

  return { customerId, vehicleId };
}

function hasNewVehicleData(formData: FormData): boolean {
  return [
    "newVehicleUnitNumber",
    "newVehicleVin",
    "newVehiclePlate",
    "newVehicleYear",
    "newVehicleMake",
    "newVehicleModel",
  ].some((key) => Boolean(str(formData.get(key))));
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

function num(val: FormDataEntryValue | null): number | null {
  const n = parseInt((val as string | null) ?? "", 10);
  return Number.isNaN(n) ? null : n;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, withRLS } from "@/lib/rls";
import { uploadCompanyLogo } from "@/lib/storage";
import { PROVINCE_TAX } from "@/lib/constants";

const DEFAULT_LABOUR_TEMPLATES = [
  { name: "Oil & Filter Change", description: "Engine oil and filter service", defaultTime: 1.0 },
  { name: "Brake Inspection & Adjustment", description: "Inspect and adjust foundation brakes", defaultTime: 2.0 },
  { name: "Tire Rotation & Inspection", description: "Rotate tires, inspect tread and sidewalls", defaultTime: 1.5 },
  { name: "Air Filter Replacement", description: "Replace engine air filter", defaultTime: 0.5 },
  { name: "Coolant Flush & Fill", description: "Drain, flush, and refill cooling system", defaultTime: 2.0 },
  { name: "DPF Cleaning / Regen Service", description: "Diesel particulate filter service", defaultTime: 3.0 },
  { name: "Electrical Diagnosis", description: "Scan codes, trace fault, document findings", defaultTime: 2.0 },
  { name: "PM Service (Annual / CVIP Prep)", description: "Full preventive maintenance inspection", defaultTime: 4.0 },
];

export async function createCompany(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim();
  const province = (formData.get("province") as string | null) ?? "ON";
  const defaultLabourRateRaw = formData.get("defaultLabourRate") as string | null;

  if (!name) redirect("/onboarding?error=Company+name+is+required");

  const defaultLabourRate = parseFloat(defaultLabourRateRaw ?? "0");
  if (isNaN(defaultLabourRate) || defaultLabourRate <= 0) {
    redirect("/onboarding?error=Enter+a+valid+labour+rate");
  }

  const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (existingUser) redirect("/dashboard");

  const tax = PROVINCE_TAX[province] ?? PROVINCE_TAX["ON"];

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name, province, defaultLabourRate },
    });

    await tx.user.create({
      data: { id: user.id, companyId: company.id, email: user.email ?? "" },
    });

    await tx.taxRate.create({
      data: { companyId: company.id, name: tax.name, rate: tax.rate, province, isDefault: true },
    });

    await tx.labourTemplate.createMany({
      data: DEFAULT_LABOUR_TEMPLATES.map((t) => ({
        companyId: company.id,
        name: t.name,
        description: t.description,
        defaultTime: t.defaultTime,
        defaultRate: defaultLabourRate,
      })),
    });
  });

  redirect("/dashboard");
}

/**
 * Update shop details shown on documents (name, contact info, branding) and tax
 * province. Changing the province re-syncs the default tax rate to that
 * province's combined rate.
 */
export async function updateCompanyDetails(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/settings?error=Shop+name+is+required");

  const province = (formData.get("province") as string | null) ?? "ON";
  const labourRate = parseFloat((formData.get("defaultLabourRate") as string | null) ?? "");

  await withRLS(userId, companyId, async (tx) => {
    const current = await tx.company.findUnique({ where: { id: companyId }, select: { province: true } });

    await tx.company.update({
      where: { id: companyId },
      data: {
        name,
        province,
        address: str(formData.get("address")),
        phone: str(formData.get("phone")),
        email: str(formData.get("email")),
        numberingPrefix: str(formData.get("numberingPrefix")),
        termsText: str(formData.get("termsText")),
        warrantyText: str(formData.get("warrantyText")),
        ...(isNaN(labourRate) || labourRate <= 0 ? {} : { defaultLabourRate: labourRate }),
      },
    });

    // Re-sync the default tax rate when the province changes.
    if (current && current.province !== province) {
      const tax = PROVINCE_TAX[province] ?? PROVINCE_TAX["ON"];
      const existing = await tx.taxRate.findFirst({ where: { companyId, isDefault: true } });
      if (existing) {
        await tx.taxRate.update({ where: { id: existing.id }, data: { name: tax.name, rate: tax.rate, province } });
      } else {
        await tx.taxRate.create({ data: { companyId, name: tax.name, rate: tax.rate, province, isDefault: true } });
      }
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}

export async function uploadLogo(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) redirect("/settings?error=Choose+an+image+file");
  if (file.size > 2_000_000) redirect("/settings?error=Logo+must+be+under+2MB");

  let url: string;
  try {
    url = await uploadCompanyLogo(companyId, file);
  } catch {
    redirect("/settings?error=Logo+upload+failed+(check+storage+config)");
  }

  await withRLS(userId, companyId, (tx) => tx.company.update({ where: { id: companyId }, data: { logoUrl: url } }));
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function removeLogo(): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) => tx.company.update({ where: { id: companyId }, data: { logoUrl: null } }));
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

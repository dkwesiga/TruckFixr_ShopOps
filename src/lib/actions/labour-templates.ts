"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionContext, withRLS } from "@/lib/rls";

export async function createLabourTemplate(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/settings/labour-templates?error=Name+is+required");

  const defaultTime = num(formData.get("defaultTime"));
  let defaultRate = num(formData.get("defaultRate"));

  await withRLS(userId, companyId, async (tx) => {
    if (defaultRate == null) {
      const company = await tx.company.findUnique({ where: { id: companyId }, select: { defaultLabourRate: true } });
      defaultRate = company ? Number(company.defaultLabourRate) : 0;
    }
    await tx.labourTemplate.create({
      data: {
        companyId,
        name,
        description: str(formData.get("description")),
        defaultTime: defaultTime ?? 1,
        defaultRate: defaultRate ?? 0,
      },
    });
  });

  revalidatePath("/settings/labour-templates");
  redirect("/settings/labour-templates");
}

export async function updateLabourTemplate(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect(`/settings/labour-templates/${id}/edit?error=Name+is+required`);

  await withRLS(userId, companyId, (tx) =>
    tx.labourTemplate.update({
      where: { id, companyId },
      data: {
        name,
        description: str(formData.get("description")),
        defaultTime: num(formData.get("defaultTime")) ?? 1,
        defaultRate: num(formData.get("defaultRate")) ?? 0,
      },
    })
  );

  revalidatePath("/settings/labour-templates");
  redirect("/settings/labour-templates");
}

export async function deleteLabourTemplate(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) => tx.labourTemplate.delete({ where: { id, companyId } }));
  revalidatePath("/settings/labour-templates");
  redirect("/settings/labour-templates");
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

function num(val: FormDataEntryValue | null): number | null {
  const n = parseFloat((val as string | null) ?? "");
  return isNaN(n) ? null : n;
}

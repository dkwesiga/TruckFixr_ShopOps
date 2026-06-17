"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ItemType } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";

export async function createItem(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const type = (formData.get("type") as ItemType | null) ?? "part";
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/items/new?error=Name+is+required");

  const returnTo = formData.get("returnTo") as string | null;

  const item = await withRLS(userId, companyId, (tx) =>
    tx.item.create({
      data: {
        companyId,
        type,
        name,
        description: str(formData.get("description")),
        partNumber: type === "part" ? str(formData.get("partNumber")) : null,
        cost: dec(formData.get("cost")),
        sellPrice: dec(formData.get("sellPrice")),
        defaultRate: type === "labour" ? dec(formData.get("defaultRate")) : null,
        defaultTime: type === "labour" ? dec(formData.get("defaultTime")) : null,
        taxable: formData.get("taxable") !== null,
        qtyOnHand: type === "part" ? dec(formData.get("qtyOnHand")) : null,
        fitmentMake: type === "part" ? str(formData.get("fitmentMake")) : null,
        fitmentModel: type === "part" ? str(formData.get("fitmentModel")) : null,
        fitmentYearFrom: type === "part" ? num(formData.get("fitmentYearFrom")) : null,
        fitmentYearTo: type === "part" ? num(formData.get("fitmentYearTo")) : null,
      },
    })
  );

  revalidatePath("/items");
  redirect(returnTo ? `${returnTo}?itemId=${item.id}` : `/items/${item.id}`);
}

export async function updateItem(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const type = (formData.get("type") as ItemType | null) ?? "part";
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect(`/items/${id}/edit?error=Name+is+required`);

  await withRLS(userId, companyId, (tx) =>
    tx.item.update({
      where: { id, companyId },
      data: {
        type,
        name,
        description: str(formData.get("description")),
        partNumber: type === "part" ? str(formData.get("partNumber")) : null,
        cost: dec(formData.get("cost")),
        sellPrice: dec(formData.get("sellPrice")),
        defaultRate: type === "labour" ? dec(formData.get("defaultRate")) : null,
        defaultTime: type === "labour" ? dec(formData.get("defaultTime")) : null,
        taxable: formData.get("taxable") !== null,
        qtyOnHand: type === "part" ? dec(formData.get("qtyOnHand")) : null,
        fitmentMake: type === "part" ? str(formData.get("fitmentMake")) : null,
        fitmentModel: type === "part" ? str(formData.get("fitmentModel")) : null,
        fitmentYearFrom: type === "part" ? num(formData.get("fitmentYearFrom")) : null,
        fitmentYearTo: type === "part" ? num(formData.get("fitmentYearTo")) : null,
      },
    })
  );

  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

export async function deleteItem(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.item.delete({ where: { id, companyId } })
  );
  revalidatePath("/items");
  redirect("/items");
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

function dec(val: FormDataEntryValue | null): number | null {
  const n = parseFloat((val as string | null) ?? "");
  return isNaN(n) ? null : n;
}

function num(val: FormDataEntryValue | null): number | null {
  const n = parseInt((val as string | null) ?? "", 10);
  return isNaN(n) ? null : n;
}

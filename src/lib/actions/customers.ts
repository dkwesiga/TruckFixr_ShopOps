"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionContext, withRLS } from "@/lib/rls";

export async function createCustomer(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/customers/new?error=Customer+name+is+required");

  const returnTo = formData.get("returnTo") as string | null;

  const customer = await withRLS(userId, companyId, (tx) =>
    tx.customer.create({
      data: {
        companyId,
        name,
        companyName: str(formData.get("companyName")),
        contactPerson: str(formData.get("contactPerson")),
        phone: str(formData.get("phone")),
        email: str(formData.get("email")),
        billingAddress: str(formData.get("billingAddress")),
        serviceAddress: str(formData.get("serviceAddress")),
        paymentTerms: str(formData.get("paymentTerms")),
        taxExempt: formData.get("taxExempt") !== null,
        notes: str(formData.get("notes")),
      },
    })
  );

  revalidatePath("/customers");
  redirect(returnTo ? `${returnTo}?customerId=${customer.id}` : `/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect(`/customers/${id}/edit?error=Customer+name+is+required`);

  await withRLS(userId, companyId, (tx) =>
    tx.customer.update({
      where: { id, companyId },
      data: {
        name,
        companyName: str(formData.get("companyName")),
        contactPerson: str(formData.get("contactPerson")),
        phone: str(formData.get("phone")),
        email: str(formData.get("email")),
        billingAddress: str(formData.get("billingAddress")),
        serviceAddress: str(formData.get("serviceAddress")),
        paymentTerms: str(formData.get("paymentTerms")),
        taxExempt: formData.get("taxExempt") !== null,
        notes: str(formData.get("notes")),
      },
    })
  );

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.customer.delete({ where: { id, companyId } })
  );
  revalidatePath("/customers");
  redirect("/customers");
}

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { WorkOrderStatus } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";

/** Advance a work order's status (Draft → Approved → In Progress → Done → Invoiced). */
export async function setWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.workOrder.update({ where: { id, companyId }, data: { status } })
  );
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/work-orders");
  redirect(`/work-orders/${id}`);
}

export async function updateWorkOrderNotes(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  await withRLS(userId, companyId, (tx) =>
    tx.workOrder.update({ where: { id, companyId }, data: { notes } })
  );
  revalidatePath(`/work-orders/${id}`);
  redirect(`/work-orders/${id}`);
}

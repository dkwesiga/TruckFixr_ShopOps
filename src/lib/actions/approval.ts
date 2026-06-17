"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Public estimate approval actions, driven by the magic-link token. There is no
 * authenticated session here, so these use `prisma` directly — the unguessable
 * token is the security boundary (Section 9). Only a still-pending ("sent"),
 * unexpired estimate can be approved or declined.
 */

export async function approveByToken(token: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const est = await tx.estimate.findUnique({
      where: { approvalToken: token },
      select: { id: true, companyId: true, status: true, vehicleId: true, approvalTokenExpiresAt: true },
    });
    if (!est || est.status !== "sent") return;
    if (est.approvalTokenExpiresAt && est.approvalTokenExpiresAt < new Date()) return;

    await tx.estimate.update({
      where: { id: est.id },
      data: { status: "approved", approvedAt: new Date() },
    });
    const existing = await tx.workOrder.findUnique({ where: { estimateId: est.id } });
    if (!existing) {
      await tx.workOrder.create({
        data: { companyId: est.companyId, estimateId: est.id, vehicleId: est.vehicleId, status: "approved" },
      });
    }
  });

  revalidatePath(`/estimate/approve/${token}`);
  redirect(`/estimate/approve/${token}?done=approved`);
}

export async function declineByToken(token: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const est = await tx.estimate.findUnique({
      where: { approvalToken: token },
      select: { id: true, status: true, approvalTokenExpiresAt: true },
    });
    if (!est || est.status !== "sent") return;
    if (est.approvalTokenExpiresAt && est.approvalTokenExpiresAt < new Date()) return;

    await tx.estimate.update({
      where: { id: est.id },
      data: { status: "declined", declinedAt: new Date() },
    });
  });

  revalidatePath(`/estimate/approve/${token}`);
  redirect(`/estimate/approve/${token}?done=declined`);
}

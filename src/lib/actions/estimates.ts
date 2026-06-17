"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma, ItemType } from "@prisma/client";
import { getSessionContext, withRLS } from "@/lib/rls";
import {
  nextEstimateNumber,
  recalcEstimateTotals,
} from "@/lib/documents";
import { resolveDocumentStart } from "@/lib/actions/document-start";
import { lineTotal } from "@/lib/money";
import { emailEnabled } from "@/lib/email/config";
import { dispatchEstimateEmail } from "@/lib/email/dispatch";

const APPROVAL_LINK_TTL_DAYS = 30;

/**
 * Best-effort email send that maps the outcome to a `?notice=` query param the
 * detail page renders as a banner. Never throws — email failure must not block
 * the status change.
 */
async function tryEmail(fn: () => Promise<"sent" | "no-email">): Promise<string> {
  if (!emailEnabled) return "";
  try {
    const result = await fn();
    return result === "sent" ? "?notice=emailed" : "?notice=noemail";
  } catch {
    return "?notice=emailfail";
  }
}

// ---------------------------------------------------------------------------
// Header create / update
// ---------------------------------------------------------------------------

export async function createEstimate(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();

  const estimate = await withRLS(userId, companyId, async (tx) => {
    const { customerId, vehicleId } = await resolveDocumentStart(tx, companyId, formData, "/estimates/new");
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { numberingPrefix: true },
    });
    return tx.estimate.create({
      data: {
        companyId,
        estimateNumber: await nextEstimateNumber(tx, companyId, company?.numberingPrefix),
        customerId,
        vehicleId,
        complaint: str(formData.get("complaint")),
        recommendedWork: str(formData.get("recommendedWork")),
      },
    });
  });

  revalidatePath("/estimates");
  redirect(`/estimates/${estimate.id}`);
}

export async function updateEstimateHeader(id: string, formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.estimate.update({
      where: { id, companyId },
      data: {
        vehicleId: str(formData.get("vehicleId")),
        complaint: str(formData.get("complaint")),
        recommendedWork: str(formData.get("recommendedWork")),
        customerNotes: str(formData.get("customerNotes")),
        internalNotes: str(formData.get("internalNotes")),
        expiryDate: date(formData.get("expiryDate")),
      },
    })
  );
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
}

// ---------------------------------------------------------------------------
// Line management
// ---------------------------------------------------------------------------

export async function addEstimateLine(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const estimateId = str(formData.get("estimateId"));
  const description = str(formData.get("description"));
  if (!estimateId || !description) redirect(`/estimates/${estimateId ?? ""}?error=Line+needs+a+description`);

  const quantity = dec(formData.get("quantity")) ?? 1;
  const unitPrice = dec(formData.get("unitPrice")) ?? 0;
  const type = (str(formData.get("type")) as ItemType | null) ?? "part";

  await withRLS(userId, companyId, async (tx) => {
    // Guard cross-company access via the estimate's own companyId scope.
    const est = await tx.estimate.findUnique({ where: { id: estimateId!, companyId }, select: { id: true } });
    if (!est) return;
    const count = await tx.estimateLine.count({ where: { estimateId: estimateId! } });
    await tx.estimateLine.create({
      data: {
        estimateId: estimateId!,
        itemId: str(formData.get("itemId")),
        type,
        description: description!,
        quantity,
        unitPrice,
        total: lineTotal(quantity, unitPrice),
        taxable: formData.get("taxable") !== null,
        sortOrder: count,
      },
    });
    await recalcEstimateTotals(tx, estimateId!, companyId);
  });

  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/estimates/${estimateId}`);
}

export async function updateEstimateLine(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const lineId = str(formData.get("lineId"));
  const estimateId = str(formData.get("estimateId"));
  if (!lineId || !estimateId) redirect(`/estimates/${estimateId ?? ""}`);

  const quantity = dec(formData.get("quantity")) ?? 1;
  const unitPrice = dec(formData.get("unitPrice")) ?? 0;

  await withRLS(userId, companyId, async (tx) => {
    const est = await tx.estimate.findUnique({ where: { id: estimateId!, companyId }, select: { id: true } });
    if (!est) return;
    await tx.estimateLine.update({
      where: { id: lineId! },
      data: {
        description: str(formData.get("description")) ?? "",
        quantity,
        unitPrice,
        total: lineTotal(quantity, unitPrice),
        taxable: formData.get("taxable") !== null,
      },
    });
    await recalcEstimateTotals(tx, estimateId!, companyId);
  });

  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/estimates/${estimateId}`);
}

export async function deleteEstimateLine(formData: FormData): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const lineId = str(formData.get("lineId"));
  const estimateId = str(formData.get("estimateId"));
  if (!lineId || !estimateId) redirect(`/estimates/${estimateId ?? ""}`);

  await withRLS(userId, companyId, async (tx) => {
    const est = await tx.estimate.findUnique({ where: { id: estimateId!, companyId }, select: { id: true } });
    if (!est) return;
    await tx.estimateLine.delete({ where: { id: lineId! } });
    await recalcEstimateTotals(tx, estimateId!, companyId);
  });

  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/estimates/${estimateId}`);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function sendEstimate(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.estimate.update({
      where: { id, companyId },
      data: {
        status: "sent",
        sentAt: new Date(),
        approvalToken: randomBytes(24).toString("hex"),
        approvalTokenExpiresAt: addDays(new Date(), APPROVAL_LINK_TTL_DAYS),
      },
    })
  );
  const notice = await tryEmail(() => dispatchEstimateEmail(id, companyId));
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}${notice}`);
}

/** Explicitly (re)send the approval email to the customer. */
export async function emailEstimate(id: string): Promise<void> {
  const { companyId } = await getSessionContext();
  const notice = await tryEmail(() => dispatchEstimateEmail(id, companyId));
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}${notice}`);
}

/** Owner records approval directly (e.g. verbal/phone approval). */
export async function markEstimateApproved(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) => approveEstimateTx(tx, id, companyId));
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
}

export async function markEstimateDeclined(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.estimate.update({
      where: { id, companyId },
      data: { status: "declined", declinedAt: new Date() },
    })
  );
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
}

export async function cancelEstimate(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.estimate.update({ where: { id, companyId }, data: { status: "cancelled" } })
  );
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
}

export async function deleteEstimate(id: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  await withRLS(userId, companyId, (tx) =>
    tx.estimate.delete({ where: { id, companyId } })
  );
  revalidatePath("/estimates");
  redirect("/estimates");
}

/**
 * Approve an estimate and auto-create its lightweight work order (Section 3.2).
 * Shared by the owner's "mark approved" action and the public magic-link approval.
 * Idempotent on the work order via the estimateId unique constraint.
 */
export async function approveEstimateTx(
  tx: Prisma.TransactionClient,
  estimateId: string,
  companyId: string
): Promise<void> {
  const estimate = await tx.estimate.update({
    where: { id: estimateId, companyId },
    data: { status: "approved", approvedAt: new Date() },
    select: { id: true, vehicleId: true },
  });
  const existing = await tx.workOrder.findUnique({ where: { estimateId } });
  if (!existing) {
    await tx.workOrder.create({
      data: {
        companyId,
        estimateId,
        vehicleId: estimate.vehicleId,
        status: "approved",
      },
    });
  }
}

// ---------------------------------------------------------------------------
// FormData coercion helpers
// ---------------------------------------------------------------------------

function str(val: FormDataEntryValue | null): string | null {
  const s = (val as string | null)?.trim();
  return s || null;
}

function dec(val: FormDataEntryValue | null): number | null {
  const n = parseFloat((val as string | null) ?? "");
  return isNaN(n) ? null : n;
}

function date(val: FormDataEntryValue | null): Date | null {
  const s = (val as string | null)?.trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

import { prisma } from "@/lib/prisma";
import type { EstimateStatus } from "@prisma/client";
import { getEstimateLive } from "@/lib/live-records";

export async function getEstimates(
  companyId: string,
  opts?: { status?: EstimateStatus; search?: string }
) {
  return prisma.estimate.findMany({
    where: {
      companyId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.search
        ? {
            OR: [
              { estimateNumber: { contains: opts.search, mode: "insensitive" } },
              { customer: { name: { contains: opts.search, mode: "insensitive" } } },
              { complaint: { contains: opts.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, companyName: true } },
      vehicle: { select: { id: true, unitNumber: true, year: true, make: true, model: true } },
    },
  });
}

export async function getEstimate(id: string, companyId: string) {
  return getEstimateLive(id, companyId);
}

/** Full estimate by magic-link token, shaped like getEstimate, for the public print view. */
export async function getEstimateForPrintByToken(token: string) {
  return prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      customer: true,
      vehicle: true,
      lines: { orderBy: { sortOrder: "asc" } },
      company: true,
    },
  });
}

/** Look up an estimate by its public magic-link token (no company scope — token is the guard). */
export async function getEstimateByToken(token: string) {
  return prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      company: { select: { name: true, logoUrl: true } },
      customer: { select: { name: true, companyName: true } },
      vehicle: true,
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
}

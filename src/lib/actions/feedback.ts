"use server";

import { getSessionContext, withRLS } from "@/lib/rls";

/**
 * Record a low-friction "Something off? Tell us" submission (Section 6.5).
 * Callable directly from a client component; no redirect.
 */
export async function submitFeedback(message: string, context?: string): Promise<void> {
  const { userId, companyId } = await getSessionContext();
  const msg = message?.trim();
  if (!msg) return;

  await withRLS(userId, companyId, (tx) =>
    tx.feedback.create({
      data: {
        companyId,
        userId,
        message: msg.slice(0, 2000),
        context: context?.trim()?.slice(0, 200) || null,
      },
    })
  );
}

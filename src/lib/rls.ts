import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID, isPlaceholderDatabaseEnv } from "@/lib/demo-auth";
import type { Prisma } from "@prisma/client";

/**
 * Wraps a Prisma transaction with per-request JWT claims so that Postgres RLS
 * policies can enforce company-level isolation.
 *
 * Every server action or API route that touches shop data must use this wrapper
 * instead of calling prisma directly.
 *
 * Usage:
 *   const result = await withRLS(session.user.id, session.user.companyId, (tx) =>
 *     tx.customer.findMany()
 *   );
 */
export async function withRLS<T>(
  userId: string,
  companyId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId, company_id: companyId });
    await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    return fn(tx);
  });
}

/**
 * Resolves the current user's session and returns userId + companyId.
 * Throws if no authenticated session is found.
 * Used at the top of every server action.
 */
export async function getSessionContext() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  if (user.id === DEMO_USER_ID && !isPlaceholderDatabaseEnv()) {
    const { ensureDemoAccount } = await import("@/lib/demo-account");
    await ensureDemoAccount();
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyId: true },
  });

  if (!dbUser) {
    throw new Error("User record not found");
  }

  return { userId: user.id, companyId: dbUser.companyId };
}

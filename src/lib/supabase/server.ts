import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  DEMO_COOKIE_NAME,
  getDemoUser,
  isPlaceholderSupabaseEnv,
  isValidDemoSession,
} from "@/lib/demo-auth";

export async function createClient() {
  const cookieStore = await cookies();

  if (isValidDemoSession(cookieStore.get(DEMO_COOKIE_NAME)?.value)) {
    const user = getDemoUser();

    return {
      auth: {
        async getUser() {
          return { data: { user }, error: null };
        },
        async exchangeCodeForSession() {
          return { error: new Error("Supabase auth is not configured for this local demo.") };
        },
      },
    };
  }

  if (isPlaceholderSupabaseEnv()) {
    return {
      auth: {
        async getUser() {
          return { data: { user: null }, error: null };
        },
        async exchangeCodeForSession() {
          return { error: new Error("Supabase auth is not configured.") };
        },
      },
    };
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookie mutation is a no-op.
            // Middleware handles session refresh in that case.
          }
        },
      },
    }
  );
}

// Admin client using service role — bypasses RLS; use only in trusted server contexts
// with explicit company-scoping via withRLS() or manual WHERE clauses.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

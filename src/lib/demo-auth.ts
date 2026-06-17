export const DEMO_EMAIL = "demo@shopops.com";
export const DEMO_PASSWORD = "password123";
export const DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_COOKIE_NAME = "shopops-demo-session";
export const DEMO_COOKIE_VALUE = "local-demo";

export function isPlaceholderSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    !url ||
    !anonKey ||
    url.includes("your-project.supabase.co") ||
    anonKey === "your-anon-key"
  );
}

export function isPlaceholderDatabaseEnv() {
  const databaseUrl = process.env.DATABASE_URL;

  return (
    !databaseUrl ||
    databaseUrl.includes("postgres.xxxx") ||
    databaseUrl.includes("aws-0-xx-east-1.pooler.supabase.com")
  );
}

export function isDemoAuthEnabled() {
  if (process.env.ENABLE_DEMO_AUTH === "true") return true;
  if (process.env.ENABLE_DEMO_AUTH === "false") return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const isLocalApp =
    !appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

  return process.env.NODE_ENV !== "production"
    ? isPlaceholderSupabaseEnv()
    : isLocalApp && isPlaceholderSupabaseEnv();
}

export function isValidDemoSession(value: string | undefined | null) {
  return isDemoAuthEnabled() && value === DEMO_COOKIE_VALUE;
}

export function getDemoUser() {
  return {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
  };
}

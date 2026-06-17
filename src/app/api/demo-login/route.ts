import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_COOKIE_NAME,
  DEMO_COOKIE_VALUE,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  isPlaceholderDatabaseEnv,
  isDemoAuthEnabled,
} from "@/lib/demo-auth";

export async function POST(request: NextRequest) {
  if (!isDemoAuthEnabled()) {
    return NextResponse.json({ error: "Demo login is not enabled." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  if (body?.email?.toLowerCase() !== DEMO_EMAIL || body.password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: "Invalid demo credentials." }, { status: 401 });
  }

  if (!isPlaceholderDatabaseEnv()) {
    const { ensureDemoAccount } = await import("@/lib/demo-account");
    await ensureDemoAccount();
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

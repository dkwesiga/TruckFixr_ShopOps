import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_COOKIE_NAME,
  isPlaceholderSupabaseEnv,
  isValidDemoSession,
} from "@/lib/demo-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = [
    "/login",
    "/signup",
    "/onboarding",
    "/auth/callback",
    "/estimate/approve",
    "/api/demo-login",
    "/offline",
  ];

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const hasDemoSession = isValidDemoSession(request.cookies.get(DEMO_COOKIE_NAME)?.value);

  if (hasDemoSession) {
    if (pathname === "/login" || pathname === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  if (isPlaceholderSupabaseEnv()) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

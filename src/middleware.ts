import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
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

  if (isPublic) {
    return NextResponse.next({ request });
  }

  const { createServerClient } = await import("@supabase/ssr");
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required for Server Components to read auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineProvider } from "@/lib/offline/provider";
import { LocalDocsProvider } from "@/lib/offline/local-docs-provider";
import { DEMO_USER_ID, isPlaceholderDatabaseEnv } from "@/lib/demo-auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === DEMO_USER_ID && isPlaceholderDatabaseEnv()) {
    return (
      <OfflineProvider>
        <LocalDocsProvider>
          <div className="min-h-screen bg-[#f9f9ff]">
            <AppTopBar />
            <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-20">{children}</main>
            <BottomNav />
          </div>
        </LocalDocsProvider>
      </OfflineProvider>
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (user.id === DEMO_USER_ID) {
    const { ensureDemoAccount } = await import("@/lib/demo-account");
    await ensureDemoAccount();
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyId: true },
  });
  if (!dbUser) redirect("/onboarding");

  return (
    <OfflineProvider>
      <div className="min-h-screen bg-[#f9f9ff]">
        <AppTopBar />
        <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-20">{children}</main>
        <BottomNav />
      </div>
    </OfflineProvider>
  );
}

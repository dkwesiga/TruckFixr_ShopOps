import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineProvider } from "@/lib/offline/provider";
import { LocalDocsProvider } from "@/lib/offline/local-docs-provider";
import { DEMO_USER_ID, isPlaceholderDatabaseEnv } from "@/lib/demo-auth";
import { getCompanyNameByUserId, getDbUserById } from "@/lib/live-records";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === DEMO_USER_ID && isPlaceholderDatabaseEnv()) {
    return (
      <OfflineProvider>
        <LocalDocsProvider>
          <div className="min-h-screen bg-[#f9f9ff]">
            <AppTopBar email={user.email} companyName="TruckFixr Demo Shop" />
            <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-20">{children}</main>
            <BottomNav />
          </div>
        </LocalDocsProvider>
      </OfflineProvider>
    );
  }

  const dbUser = await getDbUserById(user.id);
  if (!dbUser) redirect("/onboarding");
  const companyName = await getCompanyNameByUserId(user.id);

  return (
    <OfflineProvider>
      <LocalDocsProvider>
        <div className="min-h-screen bg-[#f9f9ff]">
          <AppTopBar email={user.email} companyName={companyName} />
          <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-20">{children}</main>
          <BottomNav />
        </div>
      </LocalDocsProvider>
    </OfflineProvider>
  );
}

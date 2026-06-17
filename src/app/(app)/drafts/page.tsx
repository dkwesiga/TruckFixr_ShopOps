import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { LocalDocsList } from "@/components/offline/local-docs-list";

export default async function DraftsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Offline drafts"
        action={<Link href="/drafts/new" className="inline-flex items-center rounded-lg bg-[#004787] px-3 py-1.5 text-sm font-semibold text-white">+ New</Link>}
      />
      <div className="py-4">
        <LocalDocsList />
      </div>
    </div>
  );
}

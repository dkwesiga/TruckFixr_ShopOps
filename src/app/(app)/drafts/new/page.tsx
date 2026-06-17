import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { LocalDocEditor } from "@/components/offline/local-doc-editor";

export default async function NewDraftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader title="New draft" backHref="/drafts" />
      <div className="py-4">
        <LocalDocEditor />
      </div>
    </div>
  );
}

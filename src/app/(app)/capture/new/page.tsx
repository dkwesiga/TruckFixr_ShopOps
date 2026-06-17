import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { CaptureComposer } from "@/components/offline/capture-composer";

export default async function NewCapturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader title="New capture" backHref="/capture" />
      <div className="py-4">
        <CaptureComposer />
      </div>
    </div>
  );
}

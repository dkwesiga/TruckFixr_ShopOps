import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateLabourTemplate } from "@/lib/actions/labour-templates";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toNum } from "@/lib/money";

export default async function EditLabourTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const template = await prisma.labourTemplate.findUnique({ where: { id, companyId: dbUser.companyId } });
  if (!template) notFound();

  const update = updateLabourTemplate.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit template" backHref="/settings/labour-templates" />
      <form action={update} className="py-5 space-y-4">
        <Input label="Name" name="name" required defaultValue={template.name} />
        <Textarea label="Description" name="description" rows={2} defaultValue={template.description ?? ""} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Default time (h)" name="defaultTime" type="number" step="0.25" min="0" defaultValue={toNum(template.defaultTime).toString()} />
          <Input label="Rate ($/hr)" name="defaultRate" type="number" step="0.01" min="0" defaultValue={toNum(template.defaultRate).toString()} />
        </div>
        <Button type="submit" size="lg" className="w-full">Save template</Button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createLabourTemplate, deleteLabourTemplate } from "@/lib/actions/labour-templates";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { formatCurrency, toNum } from "@/lib/money";

export default async function LabourTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { error } = await searchParams;
  const templates = await prisma.labourTemplate.findMany({
    where: { companyId: dbUser.companyId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Labour templates" backHref="/settings" />

      {error && (
        <div className="mb-4 rounded-lg bg-[#fdecec] border border-[#d32f2f]/30 px-3 py-2 text-sm text-[#d32f2f]">{error}</div>
      )}

      <div className="py-4 space-y-4">
        <p className="text-sm text-[#5f6673]">Common jobs ShopOps suggests during AI capture. Add or edit freely.</p>

        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="industrial-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#191c20]">{t.name}</p>
                {t.description && <p className="text-xs text-[#5f6673] mt-0.5">{t.description}</p>}
                <p className="text-xs text-[#858b98] mt-0.5">{toNum(t.defaultTime)} h · {formatCurrency(t.defaultRate)}/h</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/settings/labour-templates/${t.id}/edit`} className="text-xs text-[#004787] font-semibold">Edit</Link>
                <form action={deleteLabourTemplate.bind(null, t.id)}>
                  <ConfirmSubmit message={`Delete "${t.name}"?`} variant="ghost" size="sm" className="text-[#d32f2f] px-1">Delete</ConfirmSubmit>
                </form>
              </div>
            </div>
          ))}
        </div>

        {/* Add */}
        <form action={createLabourTemplate} className="rounded-lg border border-dashed border-[#9cb6dc] bg-[#eef4ff]/50 p-4 space-y-3">
          <p className="industrial-label">Add template</p>
          <Input label="Name" name="name" required placeholder="e.g. Clutch Replacement" />
          <Textarea label="Description" name="description" rows={2} placeholder="Optional" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Default time (h)" name="defaultTime" type="number" step="0.25" min="0" placeholder="2.0" />
            <Input label="Rate ($/hr)" name="defaultRate" type="number" step="0.01" min="0" placeholder="Shop default" />
          </div>
          <Button type="submit" size="md" className="w-full">Add template</Button>
        </form>
      </div>
    </div>
  );
}

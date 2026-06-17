import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getEstimate } from "@/lib/queries/estimates";
import { buildEstimatePrint } from "@/lib/print-data";
import { PrintDocument } from "@/components/documents/print-document";
import { PrintToolbar } from "@/components/documents/print-button";

export default async function EstimatePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const [estimate, company] = await Promise.all([
    getEstimate(id, dbUser.companyId),
    prisma.company.findUnique({ where: { id: dbUser.companyId } }),
  ]);
  if (!estimate || !company) notFound();

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/estimates/${id}`} backLabel="Estimate" />
      <div className="py-6 px-2">
        <PrintDocument {...buildEstimatePrint(estimate, company)} />
      </div>
    </div>
  );
}

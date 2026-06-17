import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getInvoice } from "@/lib/queries/invoices";
import { buildInvoicePrint } from "@/lib/print-data";
import { PrintDocument } from "@/components/documents/print-document";
import { PrintToolbar } from "@/components/documents/print-button";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const [invoice, company] = await Promise.all([
    getInvoice(id, dbUser.companyId),
    prisma.company.findUnique({ where: { id: dbUser.companyId } }),
  ]);
  if (!invoice || !company) notFound();

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/invoices/${id}`} backLabel="Invoice" />
      <div className="py-6 px-2">
        <PrintDocument {...buildInvoicePrint(invoice, company)} />
      </div>
    </div>
  );
}

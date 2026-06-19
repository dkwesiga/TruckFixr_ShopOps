import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvoice } from "@/lib/queries/invoices";
import { buildInvoicePrint } from "@/lib/print-data";
import { PrintDocument } from "@/components/documents/print-document";
import { PrintToolbar } from "@/components/documents/print-button";
import { getCompanyLive, getDbUserById } from "@/lib/live-records";
import { sendInvoice } from "@/lib/actions/invoices";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getDbUserById(user.id);
  if (!dbUser) redirect("/onboarding");

  const [invoice, company] = await Promise.all([
    getInvoice(id, dbUser.companyId),
    getCompanyLive(dbUser.companyId),
  ]);
  if (!invoice || !company) notFound();

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/invoices/${id}`} backLabel="Invoice" />
      {invoice.status === "draft" && (
        <div className="no-print border-b border-gray-200 bg-white px-4 py-3">
          <form action={sendInvoice.bind(null, id)} className="mx-auto flex max-w-[800px] items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Review this preview, then send the invoice when it looks right.</p>
            <ConfirmSubmit
              message="Send this invoice now? Make sure you have reviewed the preview first."
              variant="primary"
              size="md"
              className="shrink-0"
              disabled={invoice.lines.length === 0}
            >
              Send invoice
            </ConfirmSubmit>
          </form>
        </div>
      )}
      <div className="py-6 px-2">
        <PrintDocument {...buildInvoicePrint(invoice, company)} />
      </div>
    </div>
  );
}

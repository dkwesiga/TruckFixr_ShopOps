import { getEstimateForPrintByToken } from "@/lib/queries/estimates";
import { buildEstimatePrint } from "@/lib/print-data";
import { PrintDocument } from "@/components/documents/print-document";
import { PrintToolbar } from "@/components/documents/print-button";

export default async function ApprovalPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estimate = await getEstimateForPrintByToken(token);

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <p className="text-sm text-gray-500">This document link is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/estimate/approve/${token}`} backLabel="Back to estimate" />
      <div className="py-6 px-2">
        <PrintDocument {...buildEstimatePrint(estimate, estimate.company)} />
      </div>
    </div>
  );
}

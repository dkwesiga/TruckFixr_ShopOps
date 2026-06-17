"use client";

/** Toolbar shown above a print document (hidden when printing via the no-print class). */
export function PrintToolbar({ backHref, backLabel = "Back" }: { backHref: string; backLabel?: string }) {
  return (
    <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      <a href={backHref} className="text-sm text-gray-600 font-medium">← {backLabel}</a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useLocalDocs } from "@/lib/offline/local-docs-provider";

/** More-page entry for offline drafts, surfacing the unsynced count. */
export function DraftsNavLink() {
  const { unsyncedCount, online } = useLocalDocs();
  return (
    <Link href="/drafts" className="industrial-card flex items-center justify-between p-4 active:bg-[#f1f3f9]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#191c20]">Offline drafts</p>
        <p className="text-xs text-[#5f6673] mt-0.5">
          {online ? "Create estimates & invoices offline — they sync automatically" : "Offline — drafts saved on this device"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {unsyncedCount > 0 && (
          <span className="rounded-full bg-[#fff3e8] text-[#b95c14] text-[10px] font-semibold px-2 py-0.5">{unsyncedCount} unsynced</span>
        )}
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#858b98]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

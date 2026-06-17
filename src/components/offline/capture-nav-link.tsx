"use client";

import Link from "next/link";
import { useOffline } from "@/lib/offline/provider";

/** Capture-inbox entry that surfaces on-device pending / ready counts. */
export function CaptureNavLink() {
  const { pendingCount, readyCount, online } = useOffline();

  return (
    <Link href="/capture" className="industrial-card flex items-center justify-between p-4 active:bg-[#f1f3f9]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#191c20]">Capture inbox</p>
        <p className="text-xs text-[#5f6673] mt-0.5">
          {online ? "Quick voice / photo / note capture — works offline" : "Offline — captures saved on this device"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {pendingCount > 0 && (
          <span className="rounded-full bg-[#fff3e8] text-[#b95c14] text-[10px] font-semibold px-2 py-0.5">{pendingCount} pending</span>
        )}
        {readyCount > 0 && (
          <span className="rounded-full bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-semibold px-2 py-0.5">{readyCount} ready</span>
        )}
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#858b98]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

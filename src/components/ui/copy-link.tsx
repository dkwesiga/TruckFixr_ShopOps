"use client";

import { useState } from "react";

/** Read-only URL field with a copy button — used for estimate approval links. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — selection still works.
    }
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 rounded-lg border border-[#c2c6d3] bg-[#f1f3f9] px-2.5 py-2 text-xs text-[#5f6673] focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />
      <button
        type="button"
        onClick={copy}
        className="flex-shrink-0 rounded-lg bg-[#004787] px-3 py-2 text-xs font-medium text-white hover:bg-[#1e5fa8]"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

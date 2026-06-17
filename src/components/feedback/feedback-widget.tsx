"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitFeedback } from "@/lib/actions/feedback";

/**
 * Persistent, low-friction feedback control (Section 6.5). Pass `context` to tag
 * the submission (e.g. "ai-draft"); defaults to the current path.
 */
export function FeedbackWidget({ context }: { context?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit() {
    if (!message.trim()) return;
    setState("sending");
    try {
      await submitFeedback(message, context ?? pathname);
      setMessage("");
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setState("idle"); }}
        className="w-full flex items-center justify-center gap-2 industrial-card px-4 py-3 text-sm font-semibold text-[#5f6673] active:bg-[#f1f3f9]"
      >
        💬 Something off? Tell us
      </button>
    );
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-[#2e7d32]/30 bg-[#e8f5e9] p-4 text-center">
        <p className="text-sm text-[#2e7d32]">Thanks — we got it.</p>
        <button type="button" onClick={() => { setOpen(false); setState("idle"); }} className="text-xs text-[#2e7d32] mt-1">Close</button>
      </div>
    );
  }

  return (
    <div className="industrial-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#191c20]">Tell us what’s off</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[#858b98]">Cancel</button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="A wrong total, a clunky step, an AI miss — anything."
        className="w-full rounded-lg border border-[#c2c6d3] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />
      {state === "error" && <p className="text-xs text-[#d32f2f]">Couldn’t send — try again.</p>}
      <Button type="button" size="md" className="w-full" onClick={submit} disabled={state === "sending" || !message.trim()}>
        {state === "sending" ? "Sending…" : "Send feedback"}
      </Button>
    </div>
  );
}

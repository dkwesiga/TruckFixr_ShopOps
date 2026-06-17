const NOTICES: Record<string, { tone: "success" | "warning" | "error"; text: string }> = {
  emailed: { tone: "success", text: "Emailed to the customer." },
  noemail: { tone: "warning", text: "No email address on file for this customer — share the link instead." },
  emailfail: { tone: "error", text: "Couldn’t send the email. Check your email settings, or share the link instead." },
};

const TONE: Record<string, string> = {
  success: "bg-[#e8f5e9] border-[#2e7d32]/30 text-[#2e7d32]",
  warning: "bg-[#fff3e8] border-[#f2862e]/40 text-[#9b4c10]",
  error: "bg-[#fdecec] border-[#d32f2f]/30 text-[#d32f2f]",
};

/** Renders a one-line banner from a `?notice=` delivery outcome code. */
export function DeliveryNotice({ notice }: { notice?: string }) {
  if (!notice) return null;
  const n = NOTICES[notice];
  if (!n) return null;
  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${TONE[n.tone]}`}>{n.text}</div>
  );
}

const GST_HST_PREFIX = "GST/HST number:";
const GST_HST_LINE = /^GST\/HST\s*(?:number|#)?:\s*(.+)$/i;

export function sanitizeGstHstNumber(value: FormDataEntryValue | null): string | null {
  const text = (value as string | null)?.trim().replace(/\s+/g, " ").toUpperCase();
  return text || null;
}

export function extractGstHstNumber(termsText: string | null | undefined): string | null {
  if (!termsText) return null;
  for (const line of termsText.split(/\r?\n/)) {
    const match = line.trim().match(GST_HST_LINE);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function stripGstHstNumber(termsText: string | null | undefined): string | null {
  if (!termsText) return null;
  const text = termsText
    .split(/\r?\n/)
    .filter((line) => !GST_HST_LINE.test(line.trim()))
    .join("\n")
    .trim();
  return text || null;
}

export function mergeGstHstNumber(
  termsText: string | null | undefined,
  gstHstNumber: string | null | undefined
): string | null {
  const cleanedTerms = stripGstHstNumber(termsText);
  return [gstHstNumber ? `${GST_HST_PREFIX} ${gstHstNumber}` : null, cleanedTerms]
    .filter(Boolean)
    .join("\n");
}

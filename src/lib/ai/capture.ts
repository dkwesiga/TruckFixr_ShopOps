import type { ItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPENROUTER_MODEL } from "./config";
import { chatJSON, parseJsonLoose, type ChatContent } from "./openrouter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftLine {
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  confidence: number; // 0..1
  matchedItemId: string | null;
}

export interface DraftResult {
  complaint: string | null;
  recommendedWork: string | null;
  customerNote: string | null;
  internalNote: string | null;
  lines: DraftLine[];
}

export interface VendorLine {
  description: string;
  partNumber: string | null;
  quantity: number;
  unitCost: number;
  confidence: number;
}

export interface VendorExtractResult {
  vendorName: string | null;
  lines: VendorLine[];
}

// ---------------------------------------------------------------------------
// Document line drafting (voice transcript / typed text / job photo)
// ---------------------------------------------------------------------------

const VALID_TYPES: ItemType[] = ["labour", "part", "fee"];

export async function draftDocument(input: {
  companyId: string;
  kind: "estimate" | "invoice";
  text?: string | null;
  imageDataUrl?: string | null;
  appUrl?: string;
  estimateId?: string;
  invoiceId?: string;
}): Promise<DraftResult> {
  const { companyId, kind, text, imageDataUrl, appUrl } = input;

  const [items, labourTemplates, corrections] = await Promise.all([
    prisma.item.findMany({
      where: { companyId },
      select: { id: true, type: true, name: true, partNumber: true, sellPrice: true, defaultRate: true, defaultTime: true, taxable: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.labourTemplate.findMany({
      where: { companyId },
      select: { name: true, defaultTime: true, defaultRate: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.aiCorrectionLog.findMany({
      where: { companyId, fieldName: "description" },
      select: { originalValue: true, correctedValue: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultLabourRate: true },
  });
  const defaultRate = company ? Number(company.defaultLabourRate) : 0;

  const itemCatalog = items
    .map((i) => {
      const price = i.type === "labour" ? Number(i.defaultRate ?? 0) : Number(i.sellPrice ?? 0);
      return `- id=${i.id} | ${i.type} | "${i.name}"${i.partNumber ? ` (PN ${i.partNumber})` : ""} | price ${price} | taxable ${i.taxable}`;
    })
    .join("\n");

  const labourList = labourTemplates
    .map((t) => `- "${t.name}" | ${Number(t.defaultTime)}h @ ${Number(t.defaultRate)}/h`)
    .join("\n");

  const correctionHints = corrections.length
    ? corrections.map((c) => `- "${c.originalValue ?? ""}" → "${c.correctedValue}"`).join("\n")
    : "(none yet)";

  const system = [
    "You are an experienced heavy-duty truck repair service writer for a shop's billing software.",
    `You convert a technician's description of work into draft ${kind} line items.`,
    "Rules:",
    "- Use the shop's item library and labour templates for descriptions and pricing whenever they match. Set matchedItemId to the library id when you use one; otherwise null.",
    "- Labour lines: quantity = hours, unitPrice = hourly rate. Part lines: quantity = count, unitPrice = sell price per unit.",
    `- If you cannot determine a labour rate, use the shop default rate of ${defaultRate}/h.`,
    "- NEVER invent part numbers, VINs, or prices you are unsure of. If a value is uncertain, give your best estimate and lower the confidence.",
    "- confidence is 0..1 (1 = certain). Flag genuinely ambiguous lines with confidence <= 0.5.",
    "- If the input is too unclear to draft any line, return an empty lines array.",
    "Respond ONLY with a JSON object of this exact shape:",
    '{"complaint": string|null, "recommendedWork": string|null, "customerNote": string|null, "internalNote": string|null, "lines": [{"type": "labour"|"part"|"fee", "description": string, "quantity": number, "unitPrice": number, "taxable": boolean, "confidence": number, "matchedItemId": string|null}]}',
  ].join("\n");

  const userText = [
    "ITEM LIBRARY:",
    itemCatalog || "(empty)",
    "",
    "LABOUR TEMPLATES:",
    labourList || "(empty)",
    "",
    "KNOWN CORRECTIONS (prefer the corrected wording):",
    correctionHints,
    "",
    "TECHNICIAN INPUT:",
    text?.trim() || (imageDataUrl ? "(see attached photo)" : "(no text)"),
  ].join("\n");

  const userContent: ChatContent = imageDataUrl
    ? [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : userText;

  const startedAt = Date.now();
  let result: DraftResult;
  try {
    const { content, inputTokens, outputTokens } = await chatJSON({ system, user: userContent, appUrl });
    const parsed = parseJsonLoose<Partial<DraftResult>>(content);
    const validItemIds = new Set(items.map((i) => i.id));

    const lines: DraftLine[] = (parsed.lines ?? [])
      .map((l) => normalizeLine(l, validItemIds, items, defaultRate))
      .filter((l): l is DraftLine => l !== null);

    result = {
      complaint: cleanStr(parsed.complaint),
      recommendedWork: cleanStr(parsed.recommendedWork),
      customerNote: cleanStr(parsed.customerNote),
      internalNote: cleanStr(parsed.internalNote),
      lines,
    };

    await logCapture(input, "success", inputTokens, outputTokens, Date.now() - startedAt, null);
  } catch (err) {
    await logCapture(input, "failure", undefined, undefined, Date.now() - startedAt, errMessage(err));
    throw err;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Vendor invoice extraction (parts purchase photo)
// ---------------------------------------------------------------------------

export async function extractVendorInvoice(input: {
  companyId: string;
  imageDataUrl: string;
  appUrl?: string;
}): Promise<VendorExtractResult> {
  const system = [
    "You extract line items from a photo of a vendor's parts invoice for a truck repair shop.",
    "For each part line, capture: description, part number (if printed), quantity, and the vendor's cost per unit (unit cost, not the line total).",
    "Also capture the vendor/supplier name if visible.",
    "Do not guess part numbers or prices that are not legible — lower confidence instead.",
    "Respond ONLY with JSON of this shape:",
    '{"vendorName": string|null, "lines": [{"description": string, "partNumber": string|null, "quantity": number, "unitCost": number, "confidence": number}]}',
  ].join("\n");

  const userContent: ChatContent = [
    { type: "text", text: "Extract the parts and vendor from this invoice photo." },
    { type: "image_url", image_url: { url: input.imageDataUrl } },
  ];

  const startedAt = Date.now();
  try {
    const { content, inputTokens, outputTokens } = await chatJSON({ system, user: userContent, appUrl: input.appUrl });
    const parsed = parseJsonLoose<Partial<VendorExtractResult>>(content);
    const lines: VendorLine[] = (parsed.lines ?? [])
      .map((l) => ({
        description: cleanStr(l.description) ?? "",
        partNumber: cleanStr(l.partNumber),
        quantity: numOr(l.quantity, 1),
        unitCost: numOr(l.unitCost, 0),
        confidence: clamp01(numOr(l.confidence, 0.5)),
      }))
      .filter((l) => l.description.length > 0);

    await logCaptureRaw(input.companyId, "image_extraction", "success", inputTokens, outputTokens, Date.now() - startedAt, null);
    return { vendorName: cleanStr(parsed.vendorName), lines };
  } catch (err) {
    await logCaptureRaw(input.companyId, "image_extraction", "failure", undefined, undefined, Date.now() - startedAt, errMessage(err));
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeLine(
  raw: Partial<DraftLine>,
  validItemIds: Set<string>,
  items: { id: string; type: ItemType; sellPrice: unknown; defaultRate: unknown; taxable: boolean }[],
  defaultRate: number
): DraftLine | null {
  const description = cleanStr(raw.description);
  if (!description) return null;

  const type: ItemType = VALID_TYPES.includes(raw.type as ItemType) ? (raw.type as ItemType) : "part";
  const matchedItemId = raw.matchedItemId && validItemIds.has(raw.matchedItemId) ? raw.matchedItemId : null;

  let unitPrice = numOr(raw.unitPrice, 0);
  // Fill a missing price from the matched library item where possible.
  if (unitPrice <= 0 && matchedItemId) {
    const item = items.find((i) => i.id === matchedItemId);
    if (item) unitPrice = item.type === "labour" ? Number(item.defaultRate ?? 0) : Number(item.sellPrice ?? 0);
  }
  if (unitPrice <= 0 && type === "labour") unitPrice = defaultRate;

  return {
    type,
    description,
    quantity: numOr(raw.quantity, 1),
    unitPrice,
    taxable: raw.taxable !== false,
    confidence: clamp01(numOr(raw.confidence, 0.7)),
    matchedItemId,
  };
}

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function numOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message.slice(0, 480) : "Unknown error";
}

async function logCapture(
  input: { companyId: string; text?: string | null; imageDataUrl?: string | null; estimateId?: string; invoiceId?: string },
  status: "success" | "failure",
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  latencyMs: number,
  errorMessage: string | null
): Promise<void> {
  const captureType = input.imageDataUrl ? "image_extraction" : "text_extraction";
  try {
    await prisma.aiCaptureLog.create({
      data: {
        companyId: input.companyId,
        estimateId: input.estimateId ?? null,
        invoiceId: input.invoiceId ?? null,
        captureType,
        provider: "openrouter",
        model: OPENROUTER_MODEL,
        status,
        inputTokens: inputTokens ?? null,
        outputTokens: outputTokens ?? null,
        latencyMs,
        errorMessage,
      },
    });
  } catch {
    // Logging is best-effort; never block capture on a log write.
  }
}

async function logCaptureRaw(
  companyId: string,
  captureType: "transcription" | "text_extraction" | "image_extraction",
  status: "success" | "failure",
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  latencyMs: number,
  errorMessage: string | null
): Promise<void> {
  try {
    await prisma.aiCaptureLog.create({
      data: {
        companyId,
        captureType,
        provider: "openrouter",
        model: OPENROUTER_MODEL,
        status,
        inputTokens: inputTokens ?? null,
        outputTokens: outputTokens ?? null,
        latencyMs,
        errorMessage,
      },
    });
  } catch {
    // best-effort
  }
}

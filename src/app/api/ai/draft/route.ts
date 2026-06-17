import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/rls";
import { extractionEnabled } from "@/lib/ai/config";
import { draftDocument } from "@/lib/ai/capture";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await getSessionContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!extractionEnabled) {
    return NextResponse.json({ error: "AI drafting is not configured." }, { status: 503 });
  }

  let body: { kind?: string; text?: string; image?: string; estimateId?: string; invoiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const kind = body.kind === "invoice" ? "invoice" : "estimate";
  if (!body.text?.trim() && !body.image) {
    return NextResponse.json({ error: "Provide a description or a photo." }, { status: 400 });
  }

  try {
    const result = await draftDocument({
      companyId,
      kind,
      text: body.text ?? null,
      imageDataUrl: body.image ?? null,
      estimateId: body.estimateId,
      invoiceId: body.invoiceId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Drafting failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

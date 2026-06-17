import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/rls";
import { prisma } from "@/lib/prisma";
import { extractionEnabled } from "@/lib/ai/config";
import { extractVendorInvoice } from "@/lib/ai/capture";

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
    return NextResponse.json({ error: "AI extraction is not configured." }, { status: 503 });
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.image) {
    return NextResponse.json({ error: "Provide a photo of the vendor invoice." }, { status: 400 });
  }

  try {
    const extracted = await extractVendorInvoice({
      companyId,
      imageDataUrl: body.image,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });

    // Suggest a sell price from the item library when this part was bought before.
    const lines = await Promise.all(
      extracted.lines.map(async (l) => {
        const match = await findExistingPart(companyId, l.partNumber, l.description);
        return {
          ...l,
          matchedItemId: match?.id ?? null,
          suggestedSellPrice: match?.sellPrice != null ? Number(match.sellPrice) : null,
        };
      })
    );

    return NextResponse.json({ vendorName: extracted.vendorName, lines });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function findExistingPart(companyId: string, partNumber: string | null, description: string) {
  if (partNumber) {
    const byPn = await prisma.item.findFirst({
      where: { companyId, type: "part", partNumber: { equals: partNumber, mode: "insensitive" } },
      select: { id: true, sellPrice: true },
    });
    if (byPn) return byPn;
  }
  if (description) {
    return prisma.item.findFirst({
      where: { companyId, type: "part", name: { equals: description, mode: "insensitive" } },
      select: { id: true, sellPrice: true },
    });
  }
  return null;
}

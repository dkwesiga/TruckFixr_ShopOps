import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/rls";
import { transcriptionEnabled } from "@/lib/ai/config";
import { transcribeAudio } from "@/lib/ai/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await getSessionContext(); // require an authenticated shop user
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!transcriptionEnabled) {
    return NextResponse.json({ error: "Voice transcription is not configured." }, { status: 503 });
  }

  let file: FormDataEntryValue | null;
  try {
    const form = await req.formData();
    file = form.get("audio");
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const filename = file instanceof File && file.name ? file.name : "recording.webm";
    const text = await transcribeAudio(buffer, filename, file.type || "audio/webm");
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

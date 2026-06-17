import { GROQ_API_KEY, GROQ_WHISPER_MODEL, GROQ_ENDPOINT } from "./config";

/**
 * Transcribe an audio recording via Groq's Whisper endpoint.
 * Runs server-side only (the API key is secret).
 */
export async function transcribeAudio(
  audio: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Transcription is not configured (missing GROQ_API_KEY).");

  const form = new FormData();
  form.append("file", new Blob([audio], { type: mimeType }), filename);
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("response_format", "text");
  form.append("temperature", "0");

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq transcription failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  return (await res.text()).trim();
}

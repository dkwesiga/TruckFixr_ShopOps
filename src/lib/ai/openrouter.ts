import { OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_ENDPOINT } from "./config";

export type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface ChatResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Call OpenRouter's chat-completions API asking for a JSON object back.
 * The user content may include image parts (data URLs) for vision extraction.
 * Server-side only.
 */
export async function chatJSON({
  system,
  user,
  appUrl,
}: {
  system: string;
  user: ChatContent;
  appUrl?: string;
}): Promise<ChatResult> {
  if (!OPENROUTER_API_KEY) throw new Error("Extraction is not configured (missing OPENROUTER_API_KEY).");

  const res = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter attribution headers (optional but recommended).
      "HTTP-Referer": appUrl || "https://truckfixr.app",
      "X-Title": "TruckFixr ShopOps",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenRouter returned an empty response.");

  return {
    content,
    inputTokens: data?.usage?.prompt_tokens,
    outputTokens: data?.usage?.completion_tokens,
  };
}

/** Best-effort JSON parse that tolerates models wrapping output in code fences. */
export function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Could not parse AI response as JSON.");
  }
}

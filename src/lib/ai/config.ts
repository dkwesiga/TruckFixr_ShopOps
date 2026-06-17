/**
 * AI provider configuration. Keys are optional — when absent the capture
 * features are disabled gracefully (the UI hides them) so local builds and the
 * app work without AI credentials, mirroring the Sentry approach.
 *
 * Providers (per spec / project memory):
 *   - Groq: voice transcription (whisper-large-v3-turbo)
 *   - OpenRouter: text + image extraction (free-tier, vision-capable model)
 */

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const GROQ_WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

// Vision-capable free model on OpenRouter. Override via env if the free roster
// changes (free model IDs on OpenRouter rotate over time).
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-11b-vision-instruct:free";

export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** Voice transcription requires Groq. */
export const transcriptionEnabled = !!GROQ_API_KEY;
/** Text/image line drafting + vendor-invoice extraction require OpenRouter. */
export const extractionEnabled = !!OPENROUTER_API_KEY;
/** Any AI capture surface should show when at least extraction is available. */
export const aiEnabled = extractionEnabled;

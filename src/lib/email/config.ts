/**
 * Email delivery via Resend. Optional — when RESEND_API_KEY is absent, sending
 * is disabled and the app falls back to the copy/share link flow. Feature-flagged
 * like the AI and Sentry integrations.
 */
export const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Resend's shared sandbox sender works without domain verification for testing;
// set RESEND_FROM to a verified domain address for production delivery.
export const RESEND_FROM = process.env.RESEND_FROM || "TruckFixr ShopOps <onboarding@resend.dev>";

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const emailEnabled = !!RESEND_API_KEY;

import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Suppress workspace-root inference warning when the project is nested
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(__dirname, "..") }),
  // Allow an isolated build output dir (e.g. for CI or building while `next dev`
  // holds the default .next). Defaults to .next so dev/prod are unaffected.
  distDir: process.env.SHOPOPS_DIST_DIR || ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

// All three must be present for Sentry CLI release/sourcemap operations to run.
// Without this gate, builds without credentials fail on `sentry-cli releases new`.
const sentryEnabled = !!(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

const configWithSentry = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: !sentryEnabled,
  },
  release: {
    create: sentryEnabled,
    finalize: sentryEnabled,
  },
  silent: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});

export default process.env.NODE_ENV === "development" ? nextConfig : configWithSentry;

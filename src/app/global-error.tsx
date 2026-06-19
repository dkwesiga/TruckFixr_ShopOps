"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error);
      })
      .catch(() => {
        // Keep the recovery UI available even if Sentry cannot load in dev.
      });
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-4 bg-[#f1f3f9]">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-[#191c20] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#5f6673] mb-6">
            The error has been reported. Please try again.
          </p>
          <button
            onClick={reset}
            className="bg-[#004787] text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

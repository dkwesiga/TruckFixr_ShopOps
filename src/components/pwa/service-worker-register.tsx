"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only, so it never interferes with
 * the dev server's hot-reload / fresh fetches.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal — the app still works online.
    });
  }, []);

  return null;
}

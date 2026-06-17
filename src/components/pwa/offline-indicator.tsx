"use client";

import { useEffect, useState } from "react";

/** Thin banner shown when the device loses connectivity. */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="no-print fixed top-0 inset-x-0 z-50 bg-[#f2862e] text-white text-xs font-semibold text-center py-1.5">
      Offline — you can keep working; changes will sync when you reconnect.
    </div>
  );
}

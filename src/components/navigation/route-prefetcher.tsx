"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoutePrefetcher({ routes }: { routes: string[] }) {
  const router = useRouter();

  useEffect(() => {
    routes.forEach((route) => router.prefetch(route));
  }, [router, routes]);

  return null;
}

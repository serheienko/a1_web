"use client";

// Штаб сам обновляется раз в минуту, пока открыт (09.10.2026).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ShtabRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs]);
  return null;
}

"use client";

// components/site-footer-gate.tsx
//
// Подвал (components/site-footer.tsx) рендерится на сервере, а решать, где
// его не показывать, может только клиент: корневой layout не знает адреса.
// Подвал приходит сюда готовым (children), так что его HTML всё равно в
// разметке страницы -- здесь лишь выключатель.
//
// Без подвала: полноэкранные чаты, игры и карта-игра, вход, онбординг,
// админка, /download (своя страница-плакат, там и так кнопки магазинов).

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HIDDEN_PREFIXES = ["/chats", "/game", "/sign-in", "/onboarding", "/admin", "/blocked", "/resolve", "/claim"];

export function SiteFooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if ((pathname === "/download" || pathname === "/download-new")) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || (p === "/game" && pathname.startsWith("/game-map")))) {
    return null;
  }
  return <>{children}</>;
}

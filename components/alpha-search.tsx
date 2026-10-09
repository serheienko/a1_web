// components/alpha-search.tsx
//
// 09.10.2026 (Александр: «участник Alpha должен видеть полноценный
// Alpha-поиск с анимацией»). For Alpha members the ordinary search box gets
// the flowing Alpha ring, the separate «Спробуйте Alpha» button goes away,
// and a job-like query shows «Alpha для вас» on top of the suggestions --
// one tap opens the Alpha conversation for that query, starting from what
// Alpha already remembers about the person. Name-like queries keep people
// first (Alpha stays out of the way).
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlphaPaywall } from "@/components/alpha-paywall";
import type { AlphaPortrait } from "@/lib/alpha/types";

type Me = { member: boolean; portrait: AlphaPortrait | null; enabled?: boolean };
let cache: Promise<Me> | null = null;
const listeners = new Set<(m: Me) => void>();

function loadMe(): Promise<Me> {
  cache ??= fetch("/api/alpha/me", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Me>) : { member: false, portrait: null }))
    .catch(() => ({ member: false, portrait: null }));
  return cache;
}

/** 09.10.2026: after a test purchase -- ask again and tell every block on the page. */
export function refreshAlphaMe(): void {
  cache = null;
  void loadMe().then((m) => listeners.forEach((l) => l(m)));
}

/** Is the visitor an Alpha member (+ the remembered portrait). */
export function useAlphaMe(enabled = true): Me {
  const [me, setMe] = useState<Me>({ member: false, portrait: null });
  useEffect(() => {
    // Only signed-in visitors (the display cookie) -- no extra request for
    // everyone else, the public pages stay as light as they were.
    if (!enabled || !document.cookie.includes("a1_user=")) return;
    let alive = true;
    void loadMe().then((m) => alive && setMe(m));
    listeners.add(setMe);
    return () => {
      alive = false;
      listeners.delete(setMe);
    };
  }, [enabled]);
  return me;
}

const ROLE_WORDS =
  /\b(dev|developer|engineer|designer|manager|lead|junior|middle|senior|intern|remote|qa|devops|frontend|backend|fullstack|full-stack|mobile|data|analyst|marketing|sales|hr|recruiter|product|pm|ux|ui|job|jobs|vacanc\w*|hiring|розробни\w*|дизайнер\w*|менеджер\w*|аналітик\w*|аналитик\w*|тестувальни\w*|тестировщи\w*|вакансі\w*|ваканси\w*|робот\w*|работ\w*|віддалено|удалённо|удаленно|офіс|офис|програміст\w*|программист\w*)\b/i;
const TECH =
  /\b(flutter|dart|react|vue|angular|next\.?js|node|typescript|javascript|python|django|java|kotlin|swift|ios|android|go|golang|rust|php|laravel|ruby|rails|c\+\+|c#|\.net|unity|figma|sql|aws|kubernetes|docker|ml|ai)\b/i;

/** "Flutter remote від 4k" -> job-like; "Олена Коваль" -> a name. */
export function looksLikeJobQuery(q: string): boolean {
  const s = q.trim();
  if (s.length < 3) return false;
  if (TECH.test(s) || ROLE_WORDS.test(s) || /\$\s?\d|\d+\s?k\b|\d{3,}/i.test(s)) return true;
  return false;
}

const T = {
  forYou: { uk: "Alpha для Вас", en: "Alpha for you", ru: "Alpha для Вас" },
  find: { uk: "Знайти «{q}» з Alpha", en: "Find “{q}” with Alpha", ru: "Найти «{q}» с Alpha" },
  remembered: { uk: "пам'ятає: ", en: "remembers: ", ru: "помнит: " },
};
type L = "uk" | "en" | "ru";
const lk = (lang: string): L => (lang === "uk" || lang === "ru" ? lang : "en");

/** The animated Alpha ring around a search box (members only). */
export function AlphaRing({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <div className="alpha-ring rounded-full p-[1.5px]">
      <style>{`
        @keyframes alphaRingFlow { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        .alpha-ring { background-image: linear-gradient(100deg,#0148fc 0%,#5a4dff 12.5%,#963fff 25%,#5a4dff 37.5%,#0148fc 50%,#5a4dff 62.5%,#963fff 75%,#5a4dff 87.5%,#0148fc 100%); background-size: 200% 100%; animation: alphaRingFlow 4s linear infinite; }
        .dark .alpha-ring { background-image: linear-gradient(100deg,#0c8ce9 0%,#4f86ff 12.5%,#9a5cff 25%,#4f86ff 37.5%,#0c8ce9 50%,#4f86ff 62.5%,#9a5cff 75%,#4f86ff 87.5%,#0c8ce9 100%); }
        .alpha-ring input { border-color: transparent !important; }
        @media (prefers-reduced-motion: reduce) { .alpha-ring { animation: none; } }
      `}</style>
      {children}
    </div>
  );
}

/** The «Alpha для Вас» row on top of the search suggestions. */
export function AlphaForYouRow({ query, lang, portrait, onOpen }: { query: string; lang: string; portrait: AlphaPortrait | null; onOpen: (q: string) => void }) {
  const l = lk(lang);
  const q = query.trim();
  const mem = portrait && portrait.stack.length ? [portrait.stack.slice(0, 2).join(", "), portrait.format, portrait.money ? `$${Math.round(portrait.money / 100) / 10}k` : null].filter(Boolean).join(" · ") : null;
  return (
    <div className="border-b border-neutral-100 py-1 dark:border-neutral-800">
      <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[#6a4dff] dark:text-[#b7a6ff]">✦ {T.forYou[l]}</div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onOpen(q)}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#6a4dff]/[0.07]"
      >
        <span className="alpha-ring grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] text-white">✦</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{T.find[l].replace("{q}", q)}</span>
          {mem && (
            <span className="block truncate text-[12px] text-neutral-400 dark:text-neutral-500">
              Alpha {T.remembered[l]}
              {mem}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** The Alpha window opened from the search box. */
export function AlphaSearchWindow({ query, onClose }: { query: string | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<AlphaPaywall open={query != null} onClose={onClose} onActivate={onClose} initialQuery={query} />, document.body);
}

// components/alpha-nav-button.tsx
//
// 07.10.2026 (Александр): «Try Alpha» в шапке -- на месте бывшего селектора
// страны, рядом с поиском (страна переехала первым элементом в ряд чипов).
// При наведении -- маленькая панель-схема «как работает Alpha», БЕЗ кнопок
// и действий внутри («надо схематическое описание как эта хрень работает»).
// Клик по кнопке открывает окно Alpha. Пока только на тестовой копии сайта
// (site-nav получает alpha=true из layout при PREMIUM_PREVIEW=1).
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlphaPaywall, startAlphaMusic } from "@/components/alpha-paywall";
import { useActiveLocale } from "@/lib/use-active-locale";
import { useHoverPanel } from "@/lib/use-hover-panel";

const FLOW = "linear-gradient(100deg,#0148fc 0%,#5a4dff 25%,#963fff 50%,#5a4dff 75%,#0148fc 100%)";

type L = "uk" | "en" | "ru";
const S = {
  btn: { uk: "Спробуй Alpha", en: "Try Alpha", ru: "Попробуй Alpha" },
  head: { uk: "Як працює Alpha", en: "How Alpha works", ru: "Как работает Alpha" },
  s1: { uk: "Пишеш одне речення", en: "You write one sentence", ru: "Пишешь одно предложение" },
  s2: { uk: "Alpha уточнює до 3 питань", en: "Alpha asks up to 3 questions", ru: "Alpha уточняет до 3 вопросов" },
  s3: { uk: "Складає твій портрет", en: "Builds your portrait", ru: "Собирает твой портрет" },
  s4: { uk: "Показує точні збіги", en: "Shows exact matches", ru: "Показывает точные совпадения" },
  s5: { uk: "Щодня надсилає нові в чат", en: "Sends new ones to chat daily", ru: "Каждый день присылает новые в чат" },
  q: { uk: "Senior Flutter, remote", en: "Senior Flutter, remote", ru: "Senior Flutter, remote" },
  c1: { uk: "Рівень?", en: "Level?", ru: "Уровень?" },
  c2: { uk: "Формат?", en: "Format?", ru: "Формат?" },
  c3: { uk: "Гроші?", en: "Salary?", ru: "Деньги?" },
  p1: { uk: "Senior", en: "Senior", ru: "Senior" },
  p2: { uk: "Віддалено", en: "Remote", ru: "Удалённо" },
  p3: { uk: "від $4k", en: "$4k+", ru: "от $4k" },
  why: { uk: "чому підходить", en: "why it fits", ru: "почему подходит" },
  chat: { uk: "Альфа підбірка", en: "Alpha picks", ru: "Альфа подборка" },
  fresh: { uk: "+3 нові збіги", en: "+3 new matches", ru: "+3 новых совпадения" },
} as const;

function pick(locale: string, v: Record<L, string>): string {
  return locale === "uk" || locale === "ru" ? v[locale] : v.en;
}

function Spark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" opacity=".7" />
    </svg>
  );
}

export function AlphaNavButton() {
  const locale = useActiveLocale();
  const t = (v: Record<L, string>) => pick(locale, v);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  // Шапка -- backdrop-blur, а он делает её «контейнером» для position:fixed:
  // окно Alpha внутри неё обрезалось бы по шапке. Поэтому -- в <body>.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
  ]);

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: t(S.s1),
      body: (
        <span className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <Spark className="h-3.5 w-3.5 text-[#6a4dff]" />
          {t(S.q)}
        </span>
      ),
    },
    {
      title: t(S.s2),
      body: (
        <span className="flex flex-wrap gap-1.5">
          {[S.c1, S.c2, S.c3].map((c, i) => (
            <span key={i} className="rounded-full bg-[#6a4dff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5a4dff] dark:bg-[#8a6dff]/15 dark:text-[#b4a3ff]">
              {t(c)}
            </span>
          ))}
        </span>
      ),
    },
    {
      title: t(S.s3),
      body: (
        <span className="flex flex-wrap gap-1.5">
          {[S.p1, S.p2, S.p3].map((c, i) => (
            <span key={i} className="rounded-md border border-dashed border-[#6a4dff]/40 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
              {t(c)}
            </span>
          ))}
        </span>
      ),
    },
    {
      title: t(S.s4),
      body: (
        <span className="flex flex-col gap-1">
          {[96, 88].map((p) => (
            <span key={p} className="flex items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
              <span className="h-1.5 w-16 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="text-[10px] text-neutral-400">{t(S.why)}</span>
              <span className="ml-auto text-[11px] font-bold tabular-nums text-emerald-500">{p}%</span>
            </span>
          ))}
        </span>
      ),
    },
    {
      title: t(S.s5),
      body: (
        <span className="flex items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1.5 dark:bg-neutral-800">
          <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: FLOW }}>
            <Spark className="h-3 w-3" />
          </span>
          <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">{t(S.chat)}</span>
          <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{t(S.fresh)}</span>
        </span>
      ),
    },
  ];

  return (
    <div ref={wrapRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative hidden shrink-0 sm:block">
      <style>{`@keyframes alphaNavFlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}.alpha-nav-flow{background-image:${FLOW};background-size:200% 100%;animation:alphaNavFlow 4s linear infinite}@media (prefers-reduced-motion:reduce){.alpha-nav-flow{animation:none}}`}</style>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          startAlphaMusic();
          setModal(true);
        }}
        className="alpha-nav-flow flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(90,80,255,0.35)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(110,77,255,0.45)] active:translate-y-0"
      >
        <Spark className="h-4 w-4" />
        {t(S.btn)}
      </button>

      {rendered && (
        <div ref={panelRef} className="absolute left-0 top-full z-50 w-[360px] pt-2 [@media(hover:none)]:hidden">
          <div
            className={
              "rounded-2xl border border-black/5 bg-white p-4 shadow-xl transition duration-200 ease-out dark:border-white/10 dark:bg-neutral-900 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="alpha-nav-flow grid h-6 w-6 place-items-center rounded-full text-white">
                <Spark className="h-3.5 w-3.5" />
              </span>
              <span className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{t(S.head)}</span>
            </div>
            <ol className="relative">
              {steps.map((s, i) => (
                <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < steps.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-[#5a4dff]/50 to-[#963fff]/20" />
                  )}
                  <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#5a4dff]/10 text-[11px] font-bold text-[#5a4dff] ring-1 ring-[#5a4dff]/30 dark:text-[#b4a3ff]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1.5 block text-[13px] font-semibold leading-6 text-neutral-800 dark:text-neutral-100">{s.title}</span>
                    {s.body}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {mounted && createPortal(<AlphaPaywall open={modal} onClose={() => setModal(false)} onActivate={() => setModal(false)} />, document.body)}
    </div>
  );
}

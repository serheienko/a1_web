// components/alpha-feed-card.tsx
//
// 07.10.2026 (Александр: «в мобильной версии всё коллапснулось… надо, чтобы
// и с мобильной люди могли покупать» → выбрал карточку в ленте). Карточка
// Alpha после 3-й вакансии: логотип, одна фраза, «поле» поиска со стрелкой.
// Тап в любое место открывает окно Alpha. Видна на телефоне и планшете
// (до 1024px) -- шире есть кнопка в шапке. Только на тестовой копии.
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlphaPaywall, preloadAlpha, startAlphaMusic } from "@/components/alpha-paywall";
import { useActiveLocale } from "@/lib/use-active-locale";

const FLOW = "linear-gradient(100deg,#0148fc 0%,#5a4dff 25%,#963fff 50%,#5a4dff 75%,#0148fc 100%)";
const FLOW_DARK = "linear-gradient(100deg,#0c8ce9 0%,#4f86ff 25%,#9a5cff 50%,#4f86ff 75%,#0c8ce9 100%)";

type T9 = { uk: string; en: string; ru: string; de: string; es: string; fr: string; pl: string; ptBR: string; zh: string };
const S = {
  title: {
    uk: "Alpha підбере роботу за Вас", en: "Let Alpha find the job for you", ru: "Alpha подберёт работу за Вас",
    de: "Alpha findet den Job für Sie", es: "Alpha encuentra el trabajo por usted", fr: "Alpha trouve le poste pour vous",
    pl: "Alpha znajdzie pracę za Ciebie", ptBR: "O Alpha encontra a vaga por você", zh: "让 Alpha 帮您找工作",
  },
  sub: {
    uk: "Розкажіть, що шукаєте — Alpha поставить кілька запитань і покаже найточніші збіги. Нові — щодня в чат.",
    en: "Tell it what you're looking for — Alpha asks a few questions and shows the closest matches. New ones arrive in chat daily.",
    ru: "Расскажите, что ищете — Alpha задаст пару вопросов и покажет самые точные совпадения. Новые — каждый день в чат.",
    de: "Sagen Sie, was Sie suchen — Alpha stellt ein paar Fragen und zeigt die besten Treffer. Neue kommen täglich in den Chat.",
    es: "Cuente qué busca: Alpha hace unas preguntas y muestra las coincidencias más exactas. Las nuevas llegan al chat cada día.",
    fr: "Dites ce que vous cherchez — Alpha pose quelques questions et montre les meilleures correspondances. Les nouvelles arrivent chaque jour.",
    pl: "Powiedz, czego szukasz — Alpha zada kilka pytań i pokaże najlepsze dopasowania. Nowe codziennie na czacie.",
    ptBR: "Diga o que procura — o Alpha faz algumas perguntas e mostra os resultados mais exatos. Novos chegam no chat todo dia.",
    zh: "告诉它您在找什么——Alpha 会问几个问题并展示最精准的匹配，每天在聊天中推送新的。",
  },
  field: {
    uk: "Senior Flutter, remote, Київ", en: "Senior Flutter, remote, Kyiv", ru: "Senior Flutter, remote, Киев",
    de: "Senior Flutter, remote, Berlin", es: "Senior Flutter, remoto, Madrid", fr: "Senior Flutter, télétravail, Paris",
    pl: "Senior Flutter, zdalnie, Warszawa", ptBR: "Senior Flutter, remoto", zh: "Senior Flutter，远程",
  },
} satisfies Record<string, T9>;

export function AlphaFeedCard() {
  const locale = useActiveLocale();
  const t = (v: T9) => (v as Record<string, string>)[locale] ?? v.en;
  const [modal, setModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const id = window.setTimeout(preloadAlpha, 1500);
    return () => window.clearTimeout(id);
  }, []);
  const open = () => {
    startAlphaMusic();
    setModal(true);
  };

  return (
    <div className="lg:hidden">
      <style>{`@keyframes alphaCardFlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}.alpha-card-flow{background-image:${FLOW};background-size:200% 100%;animation:alphaCardFlow 4s linear infinite}.dark .alpha-card-flow{background-image:${FLOW_DARK}}@media (prefers-reduced-motion:reduce){.alpha-card-flow{animation:none}}`}</style>
      <button
        type="button"
        onClick={open}
        className="alpha-card-flow block w-full rounded-[26px] p-[1.5px] text-left shadow-[0_8px_24px_rgba(90,80,255,0.18)] transition active:scale-[0.99]"
      >
        <span className="block rounded-[24.5px] bg-white p-5 dark:bg-neutral-900">
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/premium/alpha-logo.webp" alt="Alpha" width={405} height={138} className="h-[26px] w-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/premium/alpha-logo-dark.webp" alt="Alpha" width={405} height={138} className="hidden h-[26px] w-auto dark:block" />
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#5a4dff] dark:text-[#c3b6ff]"
              style={{ background: "linear-gradient(100deg, rgba(1,72,252,0.12), rgba(150,63,255,0.16))" }}
            >
              Premium
            </span>
          </span>
          <span className="mt-3 block text-[19px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{t(S.title)}</span>
          <span className="mt-1.5 block text-[14px] leading-snug text-neutral-500 dark:text-neutral-400">{t(S.sub)}</span>
          <span className="alpha-card-flow mt-4 flex rounded-full p-[1.5px]">
            <span className="flex h-12 w-full items-center gap-2 rounded-full bg-white pl-4 pr-1 dark:bg-neutral-900">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 text-[#335ef7] dark:text-[#0c8ce9]"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span className="min-w-0 flex-1 truncate text-[15px] text-neutral-400">{t(S.field)}</span>
              <span className="alpha-card-flow grid h-10 w-10 shrink-0 place-items-center rounded-full text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </span>
          </span>
        </span>
      </button>
      {mounted && createPortal(<AlphaPaywall open={modal} onClose={() => setModal(false)} onActivate={() => setModal(false)} />, document.body)}
    </div>
  );
}

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
import { AlphaPaywall, preloadAlpha, startAlphaMusic } from "@/components/alpha-paywall";
import { useActiveLocale } from "@/lib/use-active-locale";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { useAlphaMe } from "@/components/alpha-search";

const FLOW = "linear-gradient(100deg,#0148fc 0%,#5a4dff 12.5%,#963fff 25%,#5a4dff 37.5%,#0148fc 50%,#5a4dff 62.5%,#963fff 75%,#5a4dff 87.5%,#0148fc 100%)";
const FLOW_DARK = "linear-gradient(100deg,#0c8ce9 0%,#4f86ff 12.5%,#9a5cff 25%,#4f86ff 37.5%,#0c8ce9 50%,#4f86ff 62.5%,#9a5cff 75%,#4f86ff 87.5%,#0c8ce9 100%)";

// 07.10.2026: все 9 языков сайта; обращение на «Ви/Вы» (Александр: «не
// злоупотреблять "ты" в наших культурах»).
type T9 = { uk: string; en: string; ru: string; de: string; es: string; fr: string; pl: string; ptBR: string; zh: string };
const S = {
  btn: { uk: "Спробуйте Alpha", en: "Try Alpha", ru: "Попробуйте Alpha", de: "Alpha testen", es: "Probar Alpha", fr: "Essayer Alpha", pl: "Wypróbuj Alpha", ptBR: "Experimentar Alpha", zh: "试用 Alpha" },
  head: { uk: "Як працює Alpha", en: "How Alpha works", ru: "Как работает Alpha", de: "So funktioniert Alpha", es: "Cómo funciona Alpha", fr: "Comment fonctionne Alpha", pl: "Jak działa Alpha", ptBR: "Como funciona o Alpha", zh: "Alpha 如何运作" },
  s1: { uk: "Розповідаєте про себе", en: "Tell about yourself", ru: "Рассказываете про себя", de: "Sie erzählen von sich", es: "Cuenta sobre usted", fr: "Vous parlez de vous", pl: "Opowiadasz o sobie", ptBR: "Você fala sobre si", zh: "介绍一下您自己" },
  s2: { uk: "Alpha ставить запитання", en: "Alpha asks questions", ru: "Alpha задаёт вопросы", de: "Alpha stellt Fragen", es: "Alpha hace preguntas", fr: "Alpha pose des questions", pl: "Alpha zadaje pytania", ptBR: "O Alpha faz perguntas", zh: "Alpha 提出问题" },
  s3: { uk: "Складає Ваш портрет", en: "Builds your portrait", ru: "Собирает Ваш портрет", de: "Erstellt Ihr Profil", es: "Crea su perfil", fr: "Dresse votre portrait", pl: "Tworzy Twój portret", ptBR: "Monta o seu perfil", zh: "生成您的画像" },
  s4: { uk: "Показує точні збіги", en: "Shows exact matches", ru: "Показывает точные совпадения", de: "Zeigt genaue Treffer", es: "Muestra coincidencias exactas", fr: "Montre les correspondances exactes", pl: "Pokazuje trafne dopasowania", ptBR: "Mostra resultados exatos", zh: "展示精准匹配" },
  s5: { uk: "Щодня надсилає нові в чат", en: "Sends new ones to chat daily", ru: "Каждый день присылает новые в чат", de: "Schickt täglich neue in den Chat", es: "Envía nuevas al chat cada día", fr: "Envoie les nouvelles chaque jour dans le chat", pl: "Codziennie wysyła nowe na czat", ptBR: "Envia novos no chat todo dia", zh: "每天在聊天中推送新匹配" },
  q: { uk: "Senior Flutter, remote", en: "Senior Flutter, remote", ru: "Senior Flutter, remote", de: "Senior Flutter, remote", es: "Senior Flutter, remote", fr: "Senior Flutter, remote", pl: "Senior Flutter, remote", ptBR: "Senior Flutter, remote", zh: "Senior Flutter, remote" },
  c1: { uk: "Рівень?", en: "Level?", ru: "Уровень?", de: "Level?", es: "¿Nivel?", fr: "Niveau ?", pl: "Poziom?", ptBR: "Nível?", zh: "级别？" },
  c2: { uk: "Формат?", en: "Format?", ru: "Формат?", de: "Arbeitsform?", es: "¿Formato?", fr: "Format ?", pl: "Tryb?", ptBR: "Formato?", zh: "形式？" },
  c3: { uk: "Гроші?", en: "Salary?", ru: "Деньги?", de: "Gehalt?", es: "¿Salario?", fr: "Salaire ?", pl: "Pensja?", ptBR: "Salário?", zh: "薪资？" },
  p1: { uk: "Senior", en: "Senior", ru: "Senior", de: "Senior", es: "Senior", fr: "Senior", pl: "Senior", ptBR: "Senior", zh: "Senior" },
  p2: { uk: "Віддалено", en: "Remote", ru: "Удалённо", de: "Remote", es: "Remoto", fr: "À distance", pl: "Zdalnie", ptBR: "Remoto", zh: "远程" },
  p3: { uk: "від $4k", en: "$4k+", ru: "от $4k", de: "ab $4k", es: "desde $4k", fr: "dès 4k $", pl: "od $4k", ptBR: "a partir de $4k", zh: "$4k 起" },
  why: { uk: "чому підходить", en: "why it fits", ru: "почему подходит", de: "warum es passt", es: "por qué encaja", fr: "pourquoi ça colle", pl: "dlaczego pasuje", ptBR: "por que combina", zh: "匹配原因" },
  chat: { uk: "Альфа підбірка", en: "Alpha picks", ru: "Альфа подборка", de: "Alpha-Auswahl", es: "Selección Alpha", fr: "Sélection Alpha", pl: "Wybór Alpha", ptBR: "Seleção Alpha", zh: "Alpha 精选" },
  fresh: { uk: "+3 нові збіги", en: "+3 new matches", ru: "+3 новых совпадения", de: "+3 neue Treffer", es: "+3 nuevas", fr: "+3 nouvelles", pl: "+3 nowe", ptBR: "+3 novos", zh: "+3 新匹配" },
} satisfies Record<string, T9>;

function pick(locale: string, v: T9): string {
  return (v as Record<string, string>)[locale] ?? v.en;
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
  const t = (v: T9) => pick(locale, v);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const openAlpha = () => {
    setOpen(false);
    startAlphaMusic();
    setModal(true);
  };
  // Шапка -- backdrop-blur, а он делает её «контейнером» для position:fixed:
  // окно Alpha внутри неё обрезалось бы по шапке. Поэтому -- в <body>.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // качаем лого и первый кадр банки заранее, когда страница уже открылась
    const t = window.setTimeout(preloadAlpha, 1500);
    return () => window.clearTimeout(t);
  }, []);
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
          <span className="alpha-nav-flow grid h-5 w-5 place-items-center rounded-full text-white">
            <Spark className="h-3 w-3" />
          </span>
          <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">{t(S.chat)}</span>
          <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{t(S.fresh)}</span>
        </span>
      ),
    },
  ];

  return (
    <div ref={wrapRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative hidden shrink-0 lg:block">
      <style>{`@keyframes alphaNavFlow{0%{background-position:0% 50%}100%{background-position:100% 50%}}.alpha-nav-flow{background-image:${FLOW};background-size:200% 100%;animation:alphaNavFlow 4s linear infinite}.dark .alpha-nav-flow{background-image:${FLOW_DARK}}@media (prefers-reduced-motion:reduce){.alpha-nav-flow{animation:none}}`}</style>
      {/* 07.10.2026 (Александр: «кнопку белую, а вокруг фиолетовую
          окантовку — аккуратнее, но продаёт»): белая пилюля в переливающейся
          рамке, текст и искра — тем же градиентом. При наведении рамка
          «заливает» кнопку целиком — продающий акцент остаётся. */}
      <button
        type="button"
        onClick={openAlpha}
        aria-label={t(S.btn)}
        className="alpha-nav-flow group flex h-9 w-9 shrink-0 rounded-full p-[1.5px] xl:w-auto shadow-[0_3px_12px_rgba(90,80,255,0.22)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(110,77,255,0.4)] active:translate-y-0"
      >
        <span className="flex h-full w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white text-sm xl:px-3.5 font-semibold transition-colors duration-200 group-hover:bg-transparent dark:bg-neutral-900 dark:group-hover:bg-transparent">
          <Spark className="h-4 w-4 text-[#5a4dff] transition-colors group-hover:text-white dark:text-[#0c8ce9]" />
          {/* 07.10.2026 (Александр, скриншот iPad/телефона боком: кнопка налезала
              на «Jobs / Talents» по центру): уже 1280px -- только круг с искрой. */}
          <span className="alpha-nav-flow hidden bg-clip-text text-transparent transition-colors group-hover:text-white xl:inline">{t(S.btn)}</span>
        </span>
      </button>

      {rendered && (
        <div ref={panelRef} className="absolute left-0 top-full z-50 w-[360px] pt-2 [@media(hover:none)]:hidden">
          {/* 07.10.2026 (Александр): клик в любую точку схемы открывает
              главное окно Alpha с покупкой Premium. */}
          <div
            role="button"
            tabIndex={-1}
            onClick={openAlpha}
            className={
              "cursor-pointer rounded-2xl border border-black/5 bg-white p-4 shadow-xl transition duration-200 ease-out hover:border-[#5a4dff]/30 hover:shadow-[0_16px_40px_rgba(90,80,255,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:hover:border-[#8a6dff]/40 " +
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

/** 09.10.2026: members already have Alpha inside the search box. */
export function AlphaNavButtonUnlessMember() {
  const me = useAlphaMe();
  return me.member ? null : <AlphaNavButton />;
}

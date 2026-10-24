// components/dribbble-tile.tsx
//
// 18.10.2026 (Александр): плитка Dribbble под ссылками профиля -- только у подтверждённых через
// Dribbble OAuth. У Dribbble нет публичного API, поэтому плитка целиком рисуется из «снимка»
// (profile.dribbbleVerified.snapshot), который бэкенд сохраняет при подтверждении и обновляет
// кнопкой «Оновити» (владельцу профиля). Сетка работ 3 в ряд, как в макете; лайков в данных нет.
// Вид -- как остальные карточки сайта (rounded-card bg-card, тёмная тема как у github-tile.tsx).
"use client";

import { useEffect, useState } from "react";
import { LOCALE_TAG, type Locale } from "@/components/t";
import { useVerifyStrings, type VerifyPhase } from "@/components/verify-cta";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { DribbbleSnapshot } from "@/lib/dribbble/core";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
type Strings = { verified: string; shots: Forms; followers: Forms; open: string; label: string; untitled: string };

const STRINGS: Record<Locale, Strings> = {
  uk: { verified: "Dribbble підтверджено", shots: { one: "робота", few: "роботи", many: "робіт", other: "роботи" }, followers: { one: "підписник", few: "підписники", many: "підписників", other: "підписника" }, open: "Відкрити Dribbble", label: "Роботи на Dribbble", untitled: "Без назви" },
  en: { verified: "Dribbble verified", shots: { one: "shot", other: "shots" }, followers: { one: "follower", other: "followers" }, open: "Open Dribbble", label: "Dribbble shots", untitled: "Untitled" },
  ru: { verified: "Dribbble подтверждён", shots: { one: "работа", few: "работы", many: "работ", other: "работы" }, followers: { one: "подписчик", few: "подписчика", many: "подписчиков", other: "подписчика" }, open: "Открыть Dribbble", label: "Работы на Dribbble", untitled: "Без названия" },
  de: { verified: "Dribbble bestätigt", shots: { one: "Shot", other: "Shots" }, followers: { one: "Follower", other: "Follower" }, open: "Dribbble öffnen", label: "Dribbble-Shots", untitled: "Ohne Titel" },
  es: { verified: "Dribbble verificado", shots: { one: "trabajo", other: "trabajos" }, followers: { one: "seguidor", other: "seguidores" }, open: "Abrir Dribbble", label: "Trabajos en Dribbble", untitled: "Sin título" },
  fr: { verified: "Dribbble vérifié", shots: { one: "projet", other: "projets" }, followers: { one: "abonné", other: "abonnés" }, open: "Ouvrir Dribbble", label: "Projets sur Dribbble", untitled: "Sans titre" },
  pl: { verified: "Dribbble potwierdzony", shots: { one: "praca", few: "prace", many: "prac", other: "pracy" }, followers: { one: "obserwujący", few: "obserwujących", many: "obserwujących", other: "obserwującego" }, open: "Otwórz Dribbble", label: "Prace na Dribbble", untitled: "Bez tytułu" },
  ptBR: { verified: "Dribbble verificado", shots: { one: "trabalho", other: "trabalhos" }, followers: { one: "seguidor", other: "seguidores" }, open: "Abrir o Dribbble", label: "Trabalhos no Dribbble", untitled: "Sem título" },
  zh: { verified: "Dribbble 已验证", shots: { other: "件作品" }, followers: { other: "位关注者" }, open: "打开 Dribbble", label: "Dribbble 作品", untitled: "无标题" },
};

function countLabel(lang: Locale, n: number, forms: Forms, compact = false): string {
  const tag = LOCALE_TAG[lang];
  const rule = new Intl.PluralRules(tag).select(n);
  const num = new Intl.NumberFormat(tag, compact && n >= 1000 ? { notation: "compact", maximumFractionDigits: 1 } : undefined).format(n);
  return `${num} ${forms[rule] ?? forms.other}`;
}

function DribbbleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M5 5.5c4 4 7 9 9 16M2.6 10.5c6 .3 11-1 15-5M8.5 21c2-5 6-8 12.5-7.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function DribbbleTile({
  snapshot,
  onRefresh,
  refreshPhase = "idle",
}: {
  snapshot: DribbbleSnapshot;
  /** Только владельцу профиля: подтвердить заново и обновить снимок. */
  onRefresh?: () => void;
  refreshPhase?: VerifyPhase;
}) {
  const lang = useActiveLocale();
  const s = STRINGS[lang];
  const { s: v } = useVerifyStrings();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const going = refreshPhase === "going";

  return (
    <section
      className={`mt-6 rounded-card bg-card p-4 shadow-sm transition-all duration-500 ease-out hover:shadow-md sm:p-5 dark:border dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ea4c89] text-white">
          <DribbbleMark />
          {snapshot.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshot.avatarUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <a
              href={snapshot.htmlUrl}
              target="_blank"
              rel="me noopener noreferrer"
              className="block min-w-0 truncate font-semibold text-neutral-900 transition-colors hover:text-accent dark:text-neutral-50"
            >
              {snapshot.name || snapshot.login}
            </a>
            <span
              title={s.verified}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              <span className="hidden sm:inline">{s.verified}</span>
              <span className="sr-only sm:hidden">{s.verified}</span>
            </span>
          </div>
          <div className="truncate text-sm text-ink-faint">
            {countLabel(lang, snapshot.shotsCount, s.shots)} · {countLabel(lang, snapshot.followers, s.followers, true)}
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={going}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-200 disabled:cursor-default disabled:opacity-70 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <svg className={going ? "animate-spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 4v5h-5" />
            </svg>
            {v.refresh}
          </button>
        )}
        <a
          href={snapshot.htmlUrl}
          target="_blank"
          rel="me noopener noreferrer"
          aria-label={s.open}
          title={s.open}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-accent dark:hover:text-white"
        >
          <ArrowIcon />
        </a>
      </div>
      {onRefresh && (refreshPhase === "busy" || refreshPhase === "error") && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {refreshPhase === "busy" ? v.busy : v.error}
        </p>
      )}

      <ul aria-label={s.label} className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {snapshot.shots.map((shot) => (
          <li key={shot.id} className="min-w-0">
            <a
              href={shot.htmlUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group block"
            >
              <ShotImage src={shot.imageUrl} alt={shot.title || s.untitled} blur={shot.blurDataUrl} />
              <span className="mt-1.5 block truncate text-xs text-neutral-700 transition-colors group-hover:text-accent sm:text-sm dark:text-neutral-300">
                {shot.title || s.untitled}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 24.10.2026 (Александр: «картинки подгружать через lazy load и сначала
// показывать блюром, чтобы не было пустых мест»). Пока картинка грузится,
// на её месте размытое превью (если оно есть) или серый фон, потом картинка
// плавно проявляется. lazy -- грузится, только когда долистали до плитки.
function ShotImage({ src, alt, blur }: { src: string; alt: string; blur?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span
      className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800"
      style={blur ? { backgroundImage: `url(${blur})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {blur && !loaded && <span aria-hidden className="absolute inset-0 backdrop-blur-md" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        ref={(img) => {
          if (img && img.complete && img.naturalWidth > 0 && !loaded) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}

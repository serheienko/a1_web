"use client";

// components/country-picker.tsx
//
// 30.09.2026 (Конкистадор). Селектор страны у поиска: «🇺🇦 Україна ▾».
// Александр: страна -- это не чип («чипы -- то, что переключаешь»), а
// СОСТОЯНИЕ, в котором ты уже находишься, поэтому живёт не в ряду чипов,
// а рядом с поиском и кнопкой фильтров. Открывается по наведению (как
// фильтры и аватар -- один и тот же lib/use-hover-panel.ts), на телефоне
// -- по тапу. Внутри: флаг · страна · сколько вакансий. Страны без
// вакансий не показываем, чтобы не было пустых экранов.
//
// Страна по умолчанию -- Україна: не фильтр по стране, а лента «для тебе»
// (украинские + мировые с открытой географией, решение 30.09). Любая другая
// страна -- ?country=de: вакансии этой страны, наши и внешние вперемешку.
//
// Пункты -- настоящие <Link>, не router.replace: отфильтрованная выдача и
// так закрыта от индексации (hasActiveFilters), а ссылкой можно поделиться.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { GLASS } from "@/lib/glass";
import { useActiveLocale } from "@/lib/use-active-locale";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { countryByCode, countryName, flagEmoji, DEFAULT_COUNTRY_CODE } from "@/lib/seo/countries";

export type CountryOption = { code: string; count: number };

const STRINGS = {
  label: {
    uk: "Країна", en: "Country", ru: "Страна", de: "Land", es: "País",
    fr: "Pays", pl: "Kraj", ptBR: "País", zh: "国家",
  },
  forYou: {
    uk: "Україна + віддалено по світу", en: "Ukraine + remote worldwide", ru: "Украина + удалённо по миру",
    de: "Ukraine + weltweit remote", es: "Ucrania + remoto global", fr: "Ukraine + télétravail mondial",
    pl: "Ukraina + zdalnie na świecie", ptBR: "Ucrânia + remoto global", zh: "乌克兰 + 全球远程",
  },
} as const;

/**
 * Собирает адрес с новой страной, сохраняя остальные параметры (поиск,
 * категорию, теги, стек), но сбрасывая страницу -- выдача другая.
 */
function hrefFor(basePath: string, code: string, current: URLSearchParams | null, preserve: boolean): string {
  const params = new URLSearchParams(preserve ? (current ?? undefined) : undefined);
  params.delete("page");
  params.delete("top100");
  if (code === DEFAULT_COUNTRY_CODE) params.delete("country");
  else params.set("country", code.toLowerCase());
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function CountryPicker({
  basePath,
  current,
  options,
  compact = false,
  preserveParams = true,
}: {
  basePath: string;
  /** ISO-код выбранной страны; undefined = Україна (лента «для тебе»). */
  current?: string;
  /** Страны с вакансиями, уже отсортированные по убыванию количества. */
  options: CountryOption[];
  /** В шапке (desktop): ниже lg название прячется, остаётся флаг -- иначе
   *  на узком окне кнопка налезает на вкладки «Вакансії / Фахівці». */
  compact?: boolean;
  /** false -- на странице вакансии/профиля чужие параметры адреса
   *  (?page, ?q) в ленту переносить незачем. */
  preserveParams?: boolean;
}) {
  const locale = useActiveLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { rendered, visible, handleMouseEnter, handleMouseLeave, isRecentHoverOpen } = useHoverPanel(
    open,
    setOpen,
    [{ trigger: triggerRef, panel: panelRef }],
  );

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 30.09 (Александр: «при выборе страны надо сразу обновлять страницу и
  // показывать лоадер, иначе выглядит как баг»): выбранная страна
  // показывается в кнопке СРАЗУ, пока лента на сервере пересобирается.
  // Сама пауза читается как загрузка через скелетон карточек
  // (<Suspense> в app/page.tsx), как и на остальных страницах.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  useEffect(() => {
    if (!isPending) setOptimistic(null);
  }, [isPending]);

  const currentCode = optimistic ?? countryByCode(current)?.code ?? DEFAULT_COUNTRY_CODE;
  const currentCountry = countryByCode(currentCode);
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  // Україна всегда первая (это дефолт), дальше -- по количеству вакансий.
  const rows: CountryOption[] = [
    { code: DEFAULT_COUNTRY_CODE, count: options.find((o) => o.code === DEFAULT_COUNTRY_CODE)?.count ?? 0 },
    ...options.filter((o) => o.code !== DEFAULT_COUNTRY_CODE && o.count > 0),
  ];

  return (
    <div
      ref={triggerRef}
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => {
          if (isRecentHoverOpen()) return;
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={STRINGS.label[locale]}
        className={
          "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-neutral-800 transition hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-neutral-50 " +
          // 30.09: явный ховер (Александр: «сделай ховер при наведении на
          // кнопку региона») -- кнопка светлеет/темнеет и слегка
          // приподнимается, как только указатель над ней или над списком.
          (open ? "bg-black/5 dark:bg-white/10 " : "hover:bg-black/5 dark:hover:bg-white/10 ") +
          (compact ? "h-9 " : "") +
          GLASS
        }
      >
        <span aria-hidden="true" className="text-base leading-none">{flagEmoji(currentCode)}</span>
        <span className={"max-w-[9rem] truncate " + (compact ? "hidden lg:inline" : "")}>
          {currentCountry ? countryName(currentCountry, locale) : currentCode}
        </span>
        {isPending ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" className={"h-3.5 w-3.5 text-neutral-400 transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true">
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {rendered && (
        <div
          ref={panelRef}
          role="listbox"
          className={
            "absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-64 max-w-[calc(100vw-2rem)] origin-top-right overflow-y-auto rounded-2xl p-1.5 transition duration-150 ease-out " +
            // 30.09.2026: под списком лежит текст вакансии, и при 55% прозрачности он
            // просвечивал сквозь названия стран. Список -- это поверхность для
            // чтения, а не украшение, поэтому почти непрозрачный фон + размытие.
            "border border-black/5 bg-white/95 shadow-xl backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-neutral-900/95 " +
            (visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")
          }
        >
          {rows.map((row) => {
            const country = countryByCode(row.code);
            if (!country) return null;
            const selected = row.code === currentCode;
            const isDefault = row.code === DEFAULT_COUNTRY_CODE;
            const href = hrefFor(basePath, row.code, search, preserveParams);
            return (
              <Link
                key={row.code}
                href={href}
                role="option"
                aria-selected={selected}
                onClick={(e) => {
                  // Обычный клик с модификатором (новая вкладка) не трогаем.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  setOpen(false);
                  if (selected) return;
                  setOptimistic(row.code);
                  startTransition(() => router.push(href));
                }}
                className={
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition " +
                  (selected
                    ? "bg-accent/10 text-accent"
                    : "text-neutral-700 hover:bg-neutral-900/5 dark:text-neutral-300 dark:hover:bg-white/10")
                }
              >
                <span aria-hidden="true" className="text-lg leading-none">{flagEmoji(row.code)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{countryName(country, locale)}</span>
                  {isDefault && (
                    <span className="block truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                      {STRINGS.forYou[locale]}
                    </span>
                  )}
                </span>
                {row.count > 0 && (
                  <span className="shrink-0 tabular-nums text-xs text-neutral-400">{row.count}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

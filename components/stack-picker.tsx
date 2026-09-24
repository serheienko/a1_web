"use client";

// components/stack-picker.tsx
//
// 2026-09-20 (Александр: «кстати, надо добавить теги по стеку как мы и
// планировали» + «у нас вот так в приложении в хобби реализовано, видишь,
// например»).
//
// ЧТО БЫЛО. Ряд из шестнадцати чипов (components/stack-chips.tsx) -- ровно
// те технологии, по которым есть посадочные страницы. Для главной этого
// хватает, для фильтра -- нет: человек, который ищет Rust или Appium, ищет
// их именно потому, что таких вакансий мало, и отсутствие в списке читает
// как «у вас такого нет».
//
// ЧТО ТЕПЕРЬ. Весь словарь -- семьдесят девять технологий
// (lib/seo/tech-catalog.ts), разложенных по разделам, с поиском сверху, --
// по образцу того, как в приложении сделан выбор хобби. Разделы свёрнуты,
// открыт только первый: восемьдесят чипов разом -- это не выбор, а стена.
//
// ПОЧЕМУ ВИДНЫ ЧИСЛА. На нашей базе больше половины словаря пустые. Без
// числа человек жмёт Appium, получает пустой экран и решает, что сломан
// фильтр. С числом он видит ноль заранее -- и такие чипы вообще не
// нажимаются, тем же приёмом, что и пустые категории («показывай 50%
// прозрачности и не активными», 27.08). Числа приходят отдельным запросом
// (app/api/stack-counts) и только когда список открыли.
//
// Несколько выбранных соединяются через ИЛИ (решение Александра): «умею
// Python и Go -- покажи и то и то». Выбранное живёт в адресе
// (?stack=python&stack=golang), поэтому ссылку на свою выдачу можно
// сохранить и переслать -- её же потом заберёт телеграм-бот.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { TECH_GROUPS, TECH_CATALOG, type TechEntry } from "@/lib/seo/tech-catalog";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";

const STRINGS = {
  heading: {
    uk: "Стек", en: "Stack", ru: "Стек", de: "Stack", es: "Stack",
    fr: "Stack", pl: "Stack", ptBR: "Stack", zh: "技术栈",
  },
  search: {
    uk: "Пошук технології", en: "Search technology", ru: "Поиск технологии",
    de: "Technologie suchen", es: "Buscar tecnología", fr: "Rechercher une techno",
    pl: "Szukaj technologii", ptBR: "Buscar tecnologia", zh: "搜索技术",
  },
  showAll: {
    uk: "Усі технології", en: "All technologies", ru: "Все технологии",
    de: "Alle Technologien", es: "Todas las tecnologías", fr: "Toutes les technos",
    pl: "Wszystkie technologie", ptBR: "Todas as tecnologias", zh: "全部技术",
  },
  collapse: {
    uk: "Згорнути", en: "Collapse", ru: "Свернуть", de: "Einklappen",
    es: "Contraer", fr: "Replier", pl: "Zwiń", ptBR: "Recolher", zh: "收起",
  },
  nothing: {
    uk: "Нічого не знайшлося", en: "Nothing found", ru: "Ничего не нашлось",
    de: "Nichts gefunden", es: "Nada encontrado", fr: "Rien trouvé",
    pl: "Nic nie znaleziono", ptBR: "Nada encontrado", zh: "没有找到",
  },
  clear: {
    uk: "Очистити", en: "Clear", ru: "Очистить", de: "Leeren",
    es: "Limpiar", fr: "Effacer", pl: "Wyczyść", ptBR: "Limpar", zh: "清除",
  },
} satisfies Record<string, Record<Locale, string>>;

const POPULAR_SLUGS = TECH_LANDINGS.map((item) => item.slug);

/** Как технология подписана на чипе -- каноническое имя и есть подпись. */
function labelFor(entry: TechEntry): string {
  return entry.tech;
}

export function StackPicker({
  basePath,
  selected,
  variant = "panel",
  lang: langProp,
}: {
  basePath: string;
  selected: string[];
  /** "row" -- полоса над лентой, "panel" -- блок внутри окна фильтров. */
  variant?: "row" | "panel";
  /** Язык для ПЛЕЙСХОЛДЕРА поиска. Панель фильтров уже знает свой и передаёт
   *  его; на главной компонент стоит сам по себе и определяет язык ниже. */
  lang?: Locale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  // Открытым держим первый раздел -- языки и фреймворки: восемьдесят чипов
  // разом это стена, а закрытые все -- пустой экран.
  const firstGroupId = TECH_GROUPS[0]?.id;
  const [openGroups, setOpenGroups] = useState<string[]>(firstGroupId ? [firstGroupId] : []);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  // <T/> (components/t.tsx) не годится для значения атрибута -- CSS внутри
  // placeholder ничего не выберет, -- поэтому язык читается из класса на
  // <html>, тем же приёмом, что в filters-form.tsx и lang-toggle.tsx.
  // Начальное "uk" совпадает с серверной разметкой, чтобы не расходилась
  // гидратация, и поправляется кадром позже.
  const [langSelf, setLangSelf] = useState<Locale>("uk");
  useEffect(() => {
    if (langProp) return;
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLangSelf(active);
  }, [langProp]);
  const lang = langProp ?? langSelf;

  // 2026-09-20. Появление блока: список категорий должен разъезжаться, а не
  // прыгать («надо чтобы появлялось после выбора IT красивой анимацией,
  // чтобы список разъезжался»). Высота у блока своя и заранее неизвестна,
  // поэтому анимируем grid-rows от 0fr к 1fr -- единственный способ
  // довести до нужной высоты БЕЗ её измерения. Первый кадр рисуется
  // свёрнутым, дальше кадр спустя -- развёрнутым.
  const [shown, setShown] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 2026-09-20. В панели фильтров строка IT стоит под списком локаций и
  // тегов, и раскрывшийся под ней стек оказывается ниже видимой части окна
  // -- ровно та же беда, из-за которой Александр не нашёл блок в первый раз
  // («ну это далеко»). Поэтому по окончании раскрытия подкручиваем окно к
  // блоку. `nearest` -- чтобы сдвинуть ровно настолько, насколько нужно, и
  // не дёргать страницу целиком.
  useEffect(() => {
    if (variant !== "panel") return;
    const id = setTimeout(() => {
      boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 340);
    return () => clearTimeout(id);
  }, [variant]);

  // Числа спрашиваем ровно тогда, когда открыли полный список: на полосе из
  // шестнадцати популярных они не нужны, а запрос не бесплатный.
  useEffect(() => {
    if (!expanded || counts) return;
    let alive = true;

    // Числа считаются по той же комбинации фильтров, в которой человек
    // сейчас стоит: в IT у Python одно число, в «Дизайні» -- другое.
    const params = new URLSearchParams(window.location.search);
    params.delete("stack");
    params.delete("page");
    params.delete("q");

    fetch(`/api/stack-counts?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (alive) setCounts(data.counts ?? {});
      })
      .catch(() => {
        // Без чисел список просто рисуется без чисел -- и ничего не гасит.
        if (alive) setCounts({});
      });

    return () => {
      alive = false;
    };
  }, [expanded, counts]);

  function apply(next: string[]) {
    // Остальные параметры адреса сохраняем как есть: человек мог уже набрать
    // запрос, выбрать категорию или локацию. Читаем из window, а не через
    // useSearchParams -- тот хук заставляет заворачивать компонент в
    // <Suspense> на каждой странице, где он стоит (так же в filters-form.tsx).
    const params = new URLSearchParams(window.location.search);
    params.delete("stack");
    params.delete("page"); // выдача другая -- страница 7 прежней бессмысленна
    for (const s of next) params.append("stack", s);

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  function toggle(slug: string) {
    apply(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  const needle = query.trim().toLowerCase();
  const found = needle
    ? TECH_CATALOG.filter((item) => item.tech.toLowerCase().includes(needle))
    : [];

  // Выбранное, чего нет в популярной полосе, показываем отдельной строкой:
  // иначе выбранный Appium не видно, пока не развернёшь весь список.
  const pinned = selected.filter((slug) => !POPULAR_SLUGS.includes(slug));

  function chip(slug: string, label: string) {
    const active = selected.includes(slug);
    const n = counts?.[slug];
    const empty = counts != null && !n && !active;
    return (
      <button
        key={slug}
        type="button"
        disabled={empty}
        onClick={() => toggle(slug)}
        aria-pressed={active}
        className={
          "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition " +
          (active
            ? "border-accent bg-accent/10 text-accent"
            : empty
              ? "cursor-not-allowed border-neutral-200 text-neutral-400 opacity-50 dark:border-neutral-800 dark:text-neutral-600"
              : "border-neutral-200 text-neutral-600 hover:border-accent/40 hover:bg-accent/5 hover:text-accent dark:border-neutral-800 dark:text-neutral-400")
        }
      >
        {label}
        {n ? <span className="ml-1.5 text-[11px] font-normal opacity-60">{n}</span> : null}
      </button>
    );
  }

  const listClass =
    variant === "panel"
      ? "flex flex-wrap gap-2"
      : "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0";

  return (
    <div
      ref={boxRef}
      className={
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out " +
        (shown ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
      }
    >
      <div className="overflow-hidden">
        <div className={variant === "panel" ? "" : "mb-4"}>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <T {...STRINGS.heading} />
            {/* Показ занятости: стек считается по указателю, и даже
                ускоренный ответ приходит не мгновенно. */}
            {isPending ? (
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-neutral-300 border-t-accent dark:border-neutral-700 dark:border-t-accent"
              />
            ) : null}
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => apply([])}
                className="ml-auto text-[11px] font-medium normal-case tracking-normal text-neutral-400 underline-offset-2 transition hover:text-accent hover:underline"
              >
                <T {...STRINGS.clear} />
              </button>
            ) : null}
          </div>

          <div className={listClass + (isPending ? " opacity-60 transition-opacity" : " transition-opacity")} aria-busy={isPending}>
            {pinned.map((slug) => {
              const entry = TECH_CATALOG.find((item) => item.slug === slug);
              return entry ? chip(entry.slug, labelFor(entry)) : null;
            })}
            {TECH_LANDINGS.map((item) => chip(item.slug, item.label))}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className={
                "shrink-0 rounded-full border border-dashed px-3 py-1.5 text-[13px] font-medium transition " +
                (expanded
                  ? "border-accent/50 text-accent"
                  : "border-neutral-300 text-neutral-500 hover:border-accent/40 hover:text-accent dark:border-neutral-700 dark:text-neutral-400")
              }
            >
              {expanded ? <T {...STRINGS.collapse} /> : <T {...STRINGS.showAll} />}
            </button>
          </div>

          {/* Полный список -- тем же приёмом с grid-rows, что и сам блок. */}
          <div
            className={
              "grid transition-[grid-template-rows] duration-300 ease-out " +
              (expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
            }
          >
            <div className="overflow-hidden">
              <div className="mt-2.5">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  spellCheck={false}
                  placeholder={STRINGS.search[lang]}
                  aria-label={STRINGS.search[lang]}
                  className="mb-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] outline-none transition placeholder:text-neutral-400 focus:border-accent/50 dark:border-neutral-800 dark:bg-neutral-900"
                />

                {needle ? (
                  found.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {found.map((item) => chip(item.slug, labelFor(item)))}
                    </div>
                  ) : (
                    <div className="px-1 py-2 text-[13px] text-neutral-400">
                      <T {...STRINGS.nothing} />
                    </div>
                  )
                ) : (
                  TECH_GROUPS.map((group) => {
                    const isOpen = openGroups.includes(group.id);
                    const chosen = group.items.filter((item) => selected.includes(item.slug)).length;
                    return (
                      <div key={group.id} className="border-t border-neutral-100 py-1.5 first:border-t-0 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((prev) =>
                              prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id],
                            )
                          }
                          aria-expanded={isOpen}
                          className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[12px] font-medium text-neutral-500 transition hover:text-accent dark:text-neutral-400"
                        >
                          <span
                            aria-hidden="true"
                            className={"inline-block transition-transform duration-200 " + (isOpen ? "rotate-90" : "")}
                          >
                            ›
                          </span>
                          <T {...group.title} />
                          {chosen > 0 ? (
                            <span className="rounded-full bg-accent/10 px-1.5 text-[11px] text-accent">{chosen}</span>
                          ) : null}
                        </button>
                        {isOpen ? (
                          <div className="flex flex-wrap gap-2 px-1 pb-1.5 pt-1">
                            {group.items.map((item) => chip(item.slug, labelFor(item)))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

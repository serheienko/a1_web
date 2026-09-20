"use client";

// components/stack-chips.tsx
//
// 2026-09-20 (Александр: «у нас нет возможности выбрать фильтры по стеку,
// давай добавим хотя бы на сайте»). Переключатели стека: 16 технологий из
// lib/seo/tech-landings.ts -- тех же, по которым живут посадочные
// /jobs/stack/<slug>, чтобы список был один, а не два расходящихся.
//
// Где это стоит. Сначала я поставил ряд на главную, всегда видимым.
// Александр посмотрел вживую: «я не уверен, что надо показывать прямо на
// главной вот так... должен при выборе категории IT появляться, если на
// главную мы говорим. Точно так же и в мелких фильтрах». Поэтому теперь два
// места -- панель фильтров и главная, -- и оба показываются ТОЛЬКО когда
// выбрана категория IT. Логика простая: стек это уточнение внутри IT, а не
// ещё одна ось поверх всей ленты.
//
// Почему не пункт внутри панели рядом с ТЕГАМИ. Панель спрашивает бэкенд, а
// стека у бэкенда нет вообще -- он вытаскивается из текста вакансии у нас
// (lib/seo/job-tech-tags.ts). Отбор поэтому идёт локальным обходом ленты и
// стоит дороже остальных фильтров; держать его отдельным блоком честнее.
//
// Несколько выбранных соединяются через ИЛИ (решение Александра): «умею
// Python и Go -- покажи и то и то». «Оба сразу» на нашей базе почти всегда
// даёт пустой экран.
//
// Выбранное живёт в адресе (?stack=python&stack=golang), поэтому ссылку на
// свою выдачу можно сохранить и переслать -- её же потом заберёт телеграм-бот.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { T } from "@/components/t";

export function StackChips({
  basePath,
  selected,
  variant = "row",
}: {
  basePath: string;
  selected: string[];
  /** "row" -- полоса над лентой, "panel" -- блок внутри окна фильтров. */
  variant?: "row" | "panel";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(slug: string) {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];

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

  return (
    <div className={variant === "panel" ? "" : "mb-4"}>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <T uk="Стек" en="Stack" ru="Стек" de="Stack" es="Stack" fr="Stack" pl="Stack" ptBR="Stack" zh="技术栈" />
        {/* 2026-09-20. Тот самый показ занятости, без которого фильтр
            выглядел сломанным: стек считается обходом всей ленты, и даже
            ускоренный ответ приходит не мгновенно. Крутилка появляется
            ровно на время, пока сервер собирает новую выдачу. */}
        {isPending ? (
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-neutral-300 border-t-accent dark:border-neutral-700 dark:border-t-accent"
          />
        ) : null}
      </div>

      {/* Шестнадцать чипов в перенос занимают на телефоне пол-экрана, поэтому
          на узком экране это одна прокручиваемая строка, а с sm -- обычный
          перенос. Внутри панели переносим всегда: она и так узкая. */}
      <div
        className={
          (variant === "panel"
            ? "flex flex-wrap gap-2"
            : "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0") +
          (isPending ? " opacity-60 transition-opacity" : " transition-opacity")
        }
        aria-busy={isPending}
      >
        {TECH_LANDINGS.map((item) => {
          const active = selected.includes(item.slug);
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => toggle(item.slug)}
              aria-pressed={active}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition " +
                (active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-neutral-200 text-neutral-600 hover:border-accent/40 hover:bg-accent/5 hover:text-accent dark:border-neutral-800 dark:text-neutral-400")
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

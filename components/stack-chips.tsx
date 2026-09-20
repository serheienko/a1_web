"use client";

// components/stack-chips.tsx
//
// 2026-09-20 (Александр: «у нас нет возможности выбрать фильтры по стеку,
// давай добавим хотя бы на сайте»). Ряд чипов со стеком над лентой.
//
// Почему отдельным рядом, а не пунктом в панели фильтров. Панель
// (components/filters.tsx) спрашивает бэкенд, а стека у бэкенда нет вообще
// -- он считается из текста вакансии у нас (lib/seo/job-tech-tags.ts).
// Смешать их в одном контроле значило бы делать вид, что это однородные
// вещи. Ряд чипов -- тот же приём, которым уже сделаны формат работы и
// «бронювання/перша робота» выше.
//
// Отличие от тех рядов: там настоящие <Link> на посадочные (роботу нужен
// вес по ссылке), здесь -- переключатели. Выбранное живёт в адресе как
// ?stack=python&stack=golang, поэтому ссылку на свою выдачу можно
// сохранить и переслать -- и именно её потом заберёт телеграм-бот.
//
// Несколько выбранных соединяются через ИЛИ (решение Александра): «умею
// Python и Go -- покажи и то и то». «Оба сразу» на нашей базе почти всегда
// даёт пустой экран, а пустой экран убивает фильтр.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { T } from "@/components/t";

export function StackChips({ basePath, selected }: { basePath: string; selected: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(slug: string) {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];

    // Остальные параметры адреса сохраняем как есть: человек мог уже
    // набрать запрос, выбрать категорию или локацию. Читаем из window, а не
    // через useSearchParams -- тот хук заставляет заворачивать компонент в
    // <Suspense> на каждой странице, где он стоит (так же сделано в
    // components/filters-form.tsx).
    const params = new URLSearchParams(window.location.search);
    params.delete("stack");
    params.delete("page"); // выдача другая -- страница 7 прежней выдачи бессмысленна
    for (const s of next) params.append("stack", s);

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <T uk="Стек" en="Stack" ru="Стек" de="Stack" es="Stack" fr="Stack" pl="Stack" ptBR="Stack" zh="技术栈" />
      </div>

      {/* Шестнадцать чипов в перенос занимают на телефоне пол-экрана, поэтому
          на узком экране это одна прокручиваемая строка, а с sm -- обычный
          перенос. -mx-4 px-4: полоса прокрутки идёт от края до края, иначе
          последний чип упирается в отступ и выглядит обрезанным. */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
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

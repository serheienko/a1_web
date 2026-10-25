"use client";

// components/role-picker.tsx
//
// 25.10.2026 (Александр: «может, нам стоит сделать разбивку не только по
// стекам, а и по ролям... DOU написал Sales, Project Manager, Salesforce,
// Support, SEO»). Блок «Роль» в панели фильтров.
//
// Профессия вакансии считается по её заголовку (lib/seo/job-role.ts) --
// теми же правилами, что и посадочные /jobs/role/<slug>. Несколько
// выбранных соединяются через ИЛИ, как стек: «QA или Support». Выбор живёт
// в адресе (?role=qa&role=support).
//
// Порядок -- по числу вакансий (сверху то, чего больше), пустые роли не
// показываем вовсе: сорок четыре чипа, половина из которых ведёт в пустоту,
// -- это стена, а не выбор. Сначала видны первые двенадцать, остальное по
// кнопке «Усі ролі», раскрытие плавное (grid-rows 0fr -> 1fr).

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { JOB_ROLES, type JobRole } from "@/lib/seo/job-role";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import type { Locale } from "@/components/t";

const FIRST = 12;

const STR: Record<"title" | "all" | "less" | "hub", Record<Locale, string>> = {
  hub: { uk: "Каталог професій", en: "Role catalog", ru: "Каталог профессий", de: "Rollenkatalog", es: "Catálogo de puestos", fr: "Catalogue des métiers", pl: "Katalog stanowisk", ptBR: "Catálogo de funções", zh: "职位目录" },
  title: { uk: "Роль", en: "Role", ru: "Роль", de: "Rolle", es: "Rol", fr: "Rôle", pl: "Rola", ptBR: "Função", zh: "职位类型" },
  all: { uk: "Усі ролі", en: "All roles", ru: "Все роли", de: "Alle Rollen", es: "Todos los roles", fr: "Tous les rôles", pl: "Wszystkie role", ptBR: "Todas as funções", zh: "全部类型" },
  less: { uk: "Згорнути", en: "Show less", ru: "Свернуть", de: "Weniger", es: "Mostrar menos", fr: "Réduire", pl: "Zwiń", ptBR: "Mostrar menos", zh: "收起" },
};

export function RolePicker({ basePath, selected, lang, divider = true }: { basePath: string; selected: string[]; lang: Locale; divider?: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Числа -- по тем фильтрам, в которых человек стоит сейчас (страна,
  // категория, стек), без самих ролей: иначе выбранная роль обнулила бы
  // соседние.
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    params.delete("role");
    params.delete("page");
    params.delete("q");
    fetch(`/api/role-counts?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (alive) setCounts(data.counts ?? {});
      })
      .catch(() => {
        if (alive) setCounts({});
      });
    return () => {
      alive = false;
    };
  }, [selected.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  function apply(next: string[]) {
    const params = new URLSearchParams(window.location.search);
    params.delete("role");
    params.delete("page");
    for (const r of next) params.append("role", r);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }
  const toggle = (slug: string) =>
    apply(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);

  // Пока чисел нет -- показываем выбранное (если есть) и аккуратную заглушку.
  const list: JobRole[] = counts
    ? JOB_ROLES.filter((r) => (counts[r] ?? 0) > 0 || selected.includes(r)).sort(
        (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0),
      )
    : (selected.filter((s) => (JOB_ROLES as string[]).includes(s)) as JobRole[]);
  // Выбранные всегда в первой видимой части, даже если вакансий у них мало.
  const head = [...list.filter((r) => selected.includes(r)), ...list.filter((r) => !selected.includes(r))];
  const first = head.slice(0, Math.max(FIRST, selected.length));
  const rest = head.slice(first.length);

  const chip = (slug: JobRole) => {
    const active = selected.includes(slug);
    const n = counts?.[slug];
    return (
      <button
        key={slug}
        type="button"
        onClick={() => toggle(slug)}
        aria-pressed={active}
        className={
          "rp-chip rounded-full border px-2.5 py-1 text-xs transition active:scale-95 " +
          (active
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800")
        }
      >
        {ROLE_LABELS[slug][lang]}
        {n != null ? <span className="ml-1 tabular-nums opacity-50">{n}</span> : null}
      </button>
    );
  };

  return (
    <>
      {divider ? <div className="my-2 border-t border-neutral-100 dark:border-neutral-800" /> : null}
      <div className="px-1 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {STR.title[lang]}
      </div>
      {counts == null && first.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 px-1 pb-1" aria-hidden="true">
          {[64, 88, 56, 72, 96, 60].map((w, i) => (
            <span key={i} className="h-[26px] animate-pulse rounded-full bg-neutral-200/70 dark:bg-neutral-800" style={{ width: w }} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">{first.map(chip)}</div>
          {rest.length > 0 ? (
            <>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 px-1 pb-1">{rest.map(chip)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="group mx-1 mb-1 inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-xs font-medium text-accent transition hover:opacity-80"
              >
                {expanded ? STR.less[lang] : `${STR.all[lang]} · ${rest.length}`}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={"transition-transform duration-300 " + (expanded ? "rotate-180" : "")}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </>
          ) : null}
          <a href="/jobs/role" className="mx-1 mb-1 ml-2 inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-accent dark:text-neutral-500">
            {STR.hub[lang]} →
          </a>
        </>
      )}
    </>
  );
}

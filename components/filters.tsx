// components/filters.tsx
//
// Phase 3 filter bar. Plain GET <form>, no client JS: submitting it just
// navigates to "<basePath>?q=...&category=...&tag=...", so the filter
// state IS the URL — shareable links and reload-survival (PLAN.md §3.1)
// come for free, and it matches §2.2's "less JS shipped" preference.

import { fetchCategories, fetchTagsForKind } from "@/lib/a1/datasets";
import type { WebPostKind } from "@/types/web-post";

export async function Filters({
  kind,
  basePath,
  currentQuery,
  currentCategory,
  currentTags,
}: {
  kind: WebPostKind;
  basePath: string;
  currentQuery?: string;
  currentCategory?: number;
  currentTags: string[];
}) {
  const [categories, tags] = await Promise.all([fetchCategories(), fetchTagsForKind(kind)]);
  const hasFilters = Boolean(currentQuery || currentCategory || currentTags.length > 0);

  return (
    <form
      method="GET"
      action={basePath}
      className="mb-8 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={currentQuery}
          placeholder="Поиск по тексту..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
        />
        <select
          name="category"
          defaultValue={currentCategory ?? ""}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.text}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Применить
        </button>
        {hasFilters && (
          <a
            href={basePath}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            Сбросить
          </a>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {tags.map((tag) => (
            <label
              key={tag.value}
              className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400"
            >
              <input
                type="checkbox"
                name="tag"
                value={tag.value}
                defaultChecked={currentTags.includes(tag.value)}
                className="rounded border-neutral-300 dark:border-neutral-600"
              />
              {tag.text}
            </label>
          ))}
        </div>
      )}
    </form>
  );
}

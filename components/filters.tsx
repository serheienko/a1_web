// components/filters.tsx
//
// Phase 3 filter bar. Server component: fetches categories/tags (data
// only). The actual interactive form — live auto-apply as you type/click,
// per Aleksandr 2026-08-27 ("попробовать жить без кнопки применить...
// как Гугл") — lives in components/filters-form.tsx, a client component,
// since router.replace() needs the client-side router.

import { fetchCategories, fetchTagsForKind } from "@/lib/a1/datasets";
import type { Category } from "@/lib/a1/datasets";
import type { WebPostKind } from "@/types/web-post";
import { FiltersForm } from "@/components/filters-form";
import { fetchEmptyCategoryValues } from "@/lib/a1/feed";

// Aleksandr, 2026-08-26: "Вынеси IT на самый верх" — the category list
// itself comes verbatim from the backend (dataset.postCategories, see
// lib/a1/datasets.ts), so there's no source-of-truth array here to
// reorder. Pin "IT" to the front client-side instead, leaving the
// backend's own ordering untouched for everything else. Matches on the
// category text with its emoji prefix and any punctuation stripped, so
// it survives the emoji/spacing exactly as the API happens to send it.
function withItFirst(categories: Category[]): Category[] {
  const isIt = (text: string) => text.replace(/[^\p{L}]/gu, "").toLowerCase() === "it";
  const it = categories.find((c) => isIt(c.text));
  if (!it) return categories;
  return [it, ...categories.filter((c) => c !== it)];
}

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
  const [categoriesRaw, tags] = await Promise.all([fetchCategories(), fetchTagsForKind(kind)]);
  const categories = withItFirst(categoriesRaw);
  const emptyCategoryValues = await fetchEmptyCategoryValues(
    kind,
    categories.map((c) => c.value),
  );

  return (
    <FiltersForm
      basePath={basePath}
      categories={categories}
      tags={tags}
      currentQuery={currentQuery}
      currentCategory={currentCategory}
      currentTags={currentTags}
      emptyCategoryValues={emptyCategoryValues}
    />
  );
}

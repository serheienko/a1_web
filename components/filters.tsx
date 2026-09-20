// components/filters.tsx
//
// Phase 3 filter bar. Server component: fetches categories/tags (data
// only). The actual interactive form — live auto-apply as you type/click,
// per Aleksandr 2026-08-27 ("попробовать жить без кнопки применить...
// как Гугл") — lives in components/filters-form.tsx, a client component,
// since router.replace() needs the client-side router.

import { fetchCategories, fetchTagsForKind, withItFirst, itCategoryValue } from "@/lib/a1/datasets";
import type { WebPostKind } from "@/types/web-post";
import { FiltersForm } from "@/components/filters-form";
import { fetchEmptyCategoryValues } from "@/lib/a1/feed";

export async function Filters({
  kind,
  basePath,
  currentQuery,
  currentCategory,
  currentTags,
  currentLocation,
  currentLocationLabel,
  currentStack = [],
}: {
  kind: WebPostKind;
  basePath: string;
  currentQuery?: string;
  currentCategory?: number;
  currentTags: string[];
  currentLocation?: number;
  currentLocationLabel?: string;
  /** Выбранные слаги стека из адреса. Блок стека появляется только внутри
   *  категории IT -- id этой категории знает только сервер (список категорий
   *  приходит с бэкенда), поэтому решение принимается здесь, а не в форме. */
  currentStack?: string[];
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
      currentLocation={currentLocation}
      currentLocationLabel={currentLocationLabel}
      emptyCategoryValues={emptyCategoryValues}
      itCategoryValue={itCategoryValue(categories)}
      currentStack={currentStack}
    />
  );
}

// components/filters-form.tsx
//
// Aleksandr, 2026-08-27: "попробовать жить без кнопки 'применить', чтобы
// поиск давал сразу автоподбор — как Гугл" (try living without an "Apply"
// button — search should auto-filter as you go, like Google). Split out
// of components/filters.tsx, which stays a server component that fetches
// categories/tags (unchanged) and now just hands them to this client
// component for the actually-interactive bit.
//
// Text search is debounced (350ms after the last keystroke) so it
// doesn't fire a navigation on every character; category/tag changes
// apply immediately since those are discrete clicks, not typing. Every
// change does a router.replace with the URL as the new filter state —
// same "the URL IS the filter state" contract the old plain <form> had
// (shareable links, reload-survival), just without the full page
// reload/explicit submit a GET form required.
//
// Same-day follow-up: "тут надо или ниже показывать лоадер, или
// подгружать автоподбор слов вот как гугл делает, таким выпадающим
// списком. Список именно того что у нас уже есть" — living without the
// Apply button meant there was no feedback that anything was happening
// while typing. This adds both things he mentioned rather than picking
// one: a small spinner (via useTransition's isPending — the correct,
// built-in way to know a client-side navigation triggered by this
// component is still in flight, no manual "am I loading" state needed)
// AND a Google-style suggestion dropdown, sourced from "what we already
// have" — the same categories/tags this form already fetched, filtered
// by the typed text, not a live backend autocomplete endpoint (there
// isn't one).
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category, Tag } from "@/lib/a1/datasets";
import { FilterIcon } from "@/components/filter-icon";
import { ClearIcon } from "@/components/clear-icon";

const MAX_SUGGESTIONS_PER_GROUP = 5;

export function FiltersForm({
  basePath,
  categories,
  tags,
  currentQuery,
  currentCategory,
  currentTags,
  emptyCategoryValues = [],
}: {
  basePath: string;
  categories: Category[];
  tags: Tag[];
  currentQuery?: string;
  currentCategory?: number;
  currentTags: string[];
  // Aleksandr, 2026-08-27: "Категории в которых пока пусто показывай 50%
  // прозрачности и не активными" — computed server-side (see
  // lib/a1/feed.ts's fetchEmptyCategoryValues), one real posts.search per
  // category rather than guessed client-side.
  emptyCategoryValues?: number[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(currentQuery ?? "");
  const [inputFocused, setInputFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2026-08-27: "категории... можно их вообще поселить на иконку
  // фильтров, как у нас в приложении" — the category <select> now lives
  // behind a filter-icon button (see components/filter-icon.tsx, traced
  // from the Figma reference he linked) instead of sitting in the main
  // row, so the search box can actually be the wide element. filtersOpen
  // tracks the popover; filtersRef lets a click anywhere outside it
  // close the popover (the search suggestions dropdown gets this for
  // free from the input's onBlur, but a button + popover has no single
  // focusable element to blur from).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtersOpen) return;
    function onDocPointerDown(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [filtersOpen]);

  // <T/> (components/t.tsx) can't help with attribute values or <option>
  // text — CSS can't conditionally show/hide inside those — so this one
  // client component reads the lang-ru class directly, same way
  // components/lang-toggle.tsx does. Defaults to "uk" (matches the SSR
  // markup) and corrects itself after mount to avoid a hydration mismatch;
  // matches the same pattern already used for isDark in theme-toggle.tsx.
  const [lang, setLang] = useState<"uk" | "ru">("uk");
  useEffect(() => {
    setLang(document.documentElement.classList.contains("lang-ru") ? "ru" : "uk");
  }, []);

  // currentQuery only changes when the URL changes from OUTSIDE this
  // component (back/forward nav, a shared link) — keep the input in sync
  // with it then, without fighting the user's own typing.
  //
  // 2026-08-27 fix ("поиск самоотчищается"): every navigate() call is an
  // ASYNC router.replace — when it finally resolves and this component
  // re-renders with the new currentQuery, that's usually just an ECHO of
  // a change we ourselves just pushed, arriving late. Without this
  // guard, that echo would stomp over whatever the user had typed since
  // (occasionally all the way back to "" right after a quick clear+
  // retype). lastPushedQueryRef tracks what WE last put in the URL; only
  // resync from the prop when it doesn't match, i.e. it's a genuine
  // external change (back/forward, a shared link) rather than our own
  // request catching up.
  const lastPushedQueryRef = useRef(currentQuery ?? "");
  useEffect(() => {
    const next = currentQuery ?? "";
    if (next === lastPushedQueryRef.current) return;
    lastPushedQueryRef.current = next;
    setQuery(next);
  }, [currentQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  function navigate(overrides: { q?: string; category?: number | null; tags?: string[] }) {
    const params = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : query;
    const category = overrides.category !== undefined ? overrides.category : currentCategory;
    const nextTags = overrides.tags !== undefined ? overrides.tags : currentTags;

    const trimmedQ = q.trim();
    if (trimmedQ) params.set("q", trimmedQ);
    if (category != null) params.set("category", String(category));
    for (const tag of nextTags) params.append("tag", tag);

    lastPushedQueryRef.current = trimmedQ;

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value }), 350);
  }

  function onCategoryChange(value: string) {
    navigate({ category: value === "" ? null : Number(value) });
  }

  function onTagToggle(value: string, checked: boolean) {
    const next = checked ? [...currentTags, value] : currentTags.filter((t) => t !== value);
    navigate({ tags: next });
  }

  function pickCategorySuggestion(value: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setInputFocused(false);
    navigate({ q: "", category: value });
  }

  function pickTagSuggestion(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setInputFocused(false);
    navigate({ q: "", tags: currentTags.includes(value) ? currentTags : [...currentTags, value] });
  }

  const hasFilters = Boolean(currentQuery || currentCategory || currentTags.length > 0);

  const needle = query.trim().toLowerCase();
  const categorySuggestions = needle
    ? categories.filter((c) => c.text.toLowerCase().includes(needle)).slice(0, MAX_SUGGESTIONS_PER_GROUP)
    : [];
  const tagSuggestions = needle
    ? tags
        .filter((t) => !currentTags.includes(t.value) && t.text.toLowerCase().includes(needle))
        .slice(0, MAX_SUGGESTIONS_PER_GROUP)
    : [];
  const showSuggestions = inputFocused && needle.length > 0 && (categorySuggestions.length > 0 || tagSuggestions.length > 0);

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => {
              // Delayed, not immediate — a suggestion button's onClick
              // needs to still fire after this input blurs to it.
              blurTimeoutRef.current = setTimeout(() => setInputFocused(false), 150);
            }}
            placeholder={lang === "ru" ? "Поиск по тексту..." : "Пошук за текстом..."}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-8 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
          />
          {isPending ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  setQuery("");
                  navigate({ q: "" });
                }}
                aria-label={lang === "ru" ? "Очистить" : "Очистити"}
                className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <ClearIcon className="h-4 w-4" />
              </button>
            )
          )}

          {/* Aleksandr, 2026-08-27: "автоподбор слов вот как гугл делает,
              таким выпадающим списком. Список именно того что у нас уже
              есть" — suggestions from our own already-fetched categories
              and tags, not free-text guesses. Picking one applies it as
              a real filter (not just text in the search box), since
              that's more useful than searching post bodies for the word. */}
          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {categorySuggestions.length > 0 && (
                <div className="border-b border-neutral-100 py-1 last:border-b-0 dark:border-neutral-800">
                  <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {lang === "ru" ? "Категории" : "Категорії"}
                  </div>
                  {categorySuggestions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => pickCategorySuggestion(c.value)}
                      className="block w-full truncate px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              )}
              {tagSuggestions.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {lang === "ru" ? "Теги" : "Теги"}
                  </div>
                  {tagSuggestions.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => pickTagSuggestion(t.value)}
                      className="block w-full truncate px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {t.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative shrink-0" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label={lang === "ru" ? "Фильтры" : "Фільтри"}
            aria-expanded={filtersOpen}
            className={
              "relative flex h-10 w-10 items-center justify-center rounded-full border transition " +
              (currentCategory != null
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-neutral-400 dark:hover:text-neutral-50")
            }
          >
            <FilterIcon className="h-5 w-5" />
            {currentCategory != null && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white dark:ring-black"
                aria-hidden="true"
              />
            )}
          </button>

          {filtersOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <div className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                {lang === "ru" ? "Категория" : "Категорія"}
              </div>
              {categories.map((c) => {
                const isEmpty = emptyCategoryValues.includes(c.value);
                const isSelected = currentCategory === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => {
                      // Selecting the already-selected category again
                      // clears it — the only way back to "all" now that
                      // there's no separate "all categories" row.
                      onCategoryChange(isSelected ? "" : String(c.value));
                      setFiltersOpen(false);
                    }}
                    className={
                      "block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition " +
                      (isEmpty
                        ? "cursor-not-allowed text-neutral-400 opacity-50 dark:text-neutral-600"
                        : isSelected
                          ? "bg-accent/10 font-medium text-accent"
                          : "text-neutral-700 hover:bg-accent/10 hover:text-accent dark:text-neutral-300")
                    }
                  >
                    {c.text}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              lastPushedQueryRef.current = "";
              setQuery("");
              startTransition(() => {
                router.replace(basePath, { scroll: false });
              });
            }}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            {lang === "ru" ? "Сбросить" : "Скинути"}
          </button>
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
                checked={currentTags.includes(tag.value)}
                onChange={(e) => onTagToggle(tag.value, e.target.checked)}
                className="rounded border-neutral-300 accent-accent dark:border-neutral-600"
              />
              {tag.text}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

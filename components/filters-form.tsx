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

const MAX_SUGGESTIONS_PER_GROUP = 5;

export function FiltersForm({
  basePath,
  categories,
  tags,
  currentQuery,
  currentCategory,
  currentTags,
}: {
  basePath: string;
  categories: Category[];
  tags: Tag[];
  currentQuery?: string;
  currentCategory?: number;
  currentTags: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(currentQuery ?? "");
  const [inputFocused, setInputFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  useEffect(() => setQuery(currentQuery ?? ""), [currentQuery]);

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

    if (q.trim()) params.set("q", q.trim());
    if (category != null) params.set("category", String(category));
    for (const tag of nextTags) params.append("tag", tag);

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
          {isPending && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
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
        <select
          value={currentCategory ?? ""}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
        >
          <option value="">{lang === "ru" ? "Все категории" : "Усі категорії"}</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.text}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.replace(basePath, { scroll: false })}
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

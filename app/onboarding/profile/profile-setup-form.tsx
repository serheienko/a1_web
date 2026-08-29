// app/onboarding/profile/profile-setup-form.tsx
//
// Phase 6 (PLAN.md §6.15): the interactive half of the "Настройте
// профиль" step. Three required fields, all confirmed against the real
// data model rather than invented (see PLAN.md §6.15's history of
// corrections):
//   - occupation: the 3-value enum (entrepreneur/professional/
//     freelancer) — Aleksandr's "Я..." field, one of the app's own 3
//     animated cat icons per option (components/occupation-icon.tsx,
//     already proven live on /u/[username]).
//   - expertise: free text — "Роль и навыки".
//   - category: dataset.companyCategories' numeric id — "Отрасль".
//     NOT yet actually saved: the backend rejects a companies[] entry
//     without a "name" (confirmed live, 2026-08-29 — see PLAN.md
//     §6.15 and app/api/account/update-profile/route.ts), and this
//     step collects no company name. Open question for Aleksandr.
//
// Reuses OCCUPATION_LABELS from app/u/[username]/page.tsx (exported
// there for this) instead of a second translation table for the same
// three words.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { OccupationIcon } from "@/components/occupation-icon";
import { LottiePlayer } from "@/components/lottie-player";
import { OCCUPATION_LABELS } from "@/components/occupation-labels";
import type { Category } from "@/lib/a1/datasets";

type OccupationValue = "entrepreneur" | "professional" | "freelancer";
const OCCUPATION_VALUES: OccupationValue[] = ["entrepreneur", "professional", "freelancer"];

type StringKey =
  | "title"
  | "subtitle"
  | "occupationLabel"
  | "occupationPlaceholder"
  | "expertiseLabel"
  | "expertisePlaceholder"
  | "categoryLabel"
  | "categoryPlaceholder"
  | "categoryEmpty"
  | "submit"
  | "errorGeneric";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Налаштуйте профіль", en: "Set up your profile", ru: "Настройте профиль",
    de: "Richten Sie Ihr Profil ein", es: "Configura tu perfil", fr: "Configurez votre profil",
    pl: "Skonfiguruj swój profil", ptBR: "Configure seu perfil", zh: "设置您的资料",
  },
  subtitle: {
    uk: "Усі поля обов'язкові", en: "All fields are required", ru: "Все поля обязательны",
    de: "Alle Felder sind Pflichtfelder", es: "Todos los campos son obligatorios",
    fr: "Tous les champs sont obligatoires", pl: "Wszystkie pola są wymagane",
    ptBR: "Todos os campos são obrigatórios", zh: "所有字段均为必填",
  },
  occupationLabel: {
    uk: "Я...", en: "I am a...", ru: "Я...", de: "Ich bin...", es: "Soy...",
    fr: "Je suis...", pl: "Jestem...", ptBR: "Eu sou...", zh: "我是...",
  },
  occupationPlaceholder: {
    uk: "Оберіть один варіант", en: "Choose one", ru: "Выберите один вариант",
    de: "Eine Option wählen", es: "Elige una opción", fr: "Choisissez une option",
    pl: "Wybierz jedną opcję", ptBR: "Escolha uma opção", zh: "选择一项",
  },
  expertiseLabel: {
    uk: "Роль і навички", en: "Role & skills", ru: "Роль и навыки",
    de: "Rolle & Fähigkeiten", es: "Rol y habilidades", fr: "Rôle et compétences",
    pl: "Rola i umiejętności", ptBR: "Função e habilidades", zh: "角色与技能",
  },
  expertisePlaceholder: {
    uk: "Розробник, Засновник, Дизайнер", en: "Developer, Founder, Designer",
    ru: "Разработчик, Основатель, Дизайнер", de: "Entwickler, Gründer, Designer",
    es: "Desarrollador, Fundador, Diseñador", fr: "Développeur, Fondateur, Designer",
    pl: "Programista, Założyciel, Projektant", ptBR: "Desenvolvedor, Fundador, Designer",
    zh: "开发者、创始人、设计师",
  },
  categoryLabel: {
    uk: "Галузь", en: "Industry", ru: "Отрасль", de: "Branche", es: "Industria",
    fr: "Secteur", pl: "Branża", ptBR: "Setor", zh: "行业",
  },
  categoryPlaceholder: {
    uk: "Пошук галузі", en: "Search industries", ru: "Поиск отрасли",
    de: "Branche suchen", es: "Buscar industria", fr: "Rechercher un secteur",
    pl: "Szukaj branży", ptBR: "Buscar setor", zh: "搜索行业",
  },
  categoryEmpty: {
    uk: "Нічого не знайдено", en: "No matches", ru: "Ничего не найдено",
    de: "Keine Treffer", es: "Sin resultados", fr: "Aucun résultat",
    pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "无匹配结果",
  },
  submit: {
    uk: "Продовжити", en: "Continue", ru: "Продолжить", de: "Weiter",
    es: "Continuar", fr: "Continuer", pl: "Dalej", ptBR: "Continuar", zh: "继续",
  },
  errorGeneric: {
    uk: "Не вдалося зберегти. Спробуйте ще раз.", en: "Couldn't save. Please try again.",
    ru: "Не удалось сохранить. Попробуйте ещё раз.", de: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
    es: "No se pudo guardar. Inténtalo de nuevo.", fr: "Échec de l'enregistrement. Réessayez.",
    pl: "Nie udało się zapisać. Spróbuj ponownie.", ptBR: "Não foi possível salvar. Tente novamente.",
    zh: "保存失败,请重试。",
  },
};

// Same trick as app/sign-in/page.tsx's useActiveLocale — reads the CSS
// lang-XX class app/layout.tsx's anti-flash script already set, no
// separate i18n context to wire up for one client form.
function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-black dark:text-neutral-100";
const labelClass = "text-xs font-medium text-neutral-500 dark:text-neutral-400";

export function ProfileSetupForm({ categories }: { categories: Category[] }) {
  const lang = useActiveLocale();
  const [occupation, setOccupation] = useState<OccupationValue | null>(null);
  const [expertise, setExpertise] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryDropUp, setCategoryDropUp] = useState(false);
  const [categoryMaxHeight, setCategoryMaxHeight] = useState(224);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryBoxRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    const list = q ? categories.filter((c) => c.text.toLowerCase().includes(q)) : categories;
    // Aleksandr, 2026-08-29: "IT ставим на первую строку списка" — IT is
    // the single most common answer on a jobs platform, worth surfacing
    // first rather than wherever it falls alphabetically/by dataset order.
    // `text` carries a leading emoji (lib/a1/datasets.ts: "💾IT", not a
    // bare "IT") — strip everything but letters before comparing, or
    // this match silently never fires.
    const itIndex = list.findIndex((c) => c.text.replace(/[^a-zA-Z]/g, "").toUpperCase() === "IT");
    const ordered = itIndex > 0 ? [list[itIndex]!, ...list.slice(0, itIndex), ...list.slice(itIndex + 1)] : list;
    return ordered.slice(0, 50);
  }, [categories, categoryQuery]);

  const canSubmit = occupation !== null && expertise.trim().length > 0 && category !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occupation, expertise: expertise.trim(), category: category!.value }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setError(STRINGS.errorGeneric[lang]);
        setPending(false);
        return;
      }
      // Full navigation, same convention app/sign-in/page.tsx uses after
      // sign-up/in. Aleksandr, 2026-08-29: "сначала код, потом профиль" —
      // verify-by-code now runs BEFORE this step, so a successful save
      // here is the end of onboarding.
      window.location.href = "/";
    } catch {
      setError(STRINGS.errorGeneric[lang]);
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-12">
      <div className="rounded-card border border-neutral-200 bg-card p-8 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40">
        <div className="mb-6 flex justify-center">
          <LottiePlayer src="/animations/briefcase-profile-setup.json" size={108} />
        </div>

        <h1 className="mb-1 text-center font-sans text-2xl font-bold tracking-tight text-ink dark:text-neutral-50">
          {STRINGS.title[lang]}
        </h1>
        <p className="mb-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
          {STRINGS.subtitle[lang]}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* "Я..." — occupation, 3 options, each with its own cat icon */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{STRINGS.occupationLabel[lang]}</span>
            <div className="grid grid-cols-3 gap-2">
              {OCCUPATION_VALUES.map((value) => {
                const selected = occupation === value;
                const label = OCCUPATION_LABELS[value]?.[lang] ?? value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOccupation(value)}
                    className={
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition " +
                      (selected
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600")
                    }
                    aria-pressed={selected}
                  >
                    <OccupationIcon occupation={value} size={36} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Роль и навыки — free text */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expertise" className={labelClass}>{STRINGS.expertiseLabel[lang]}</label>
            <input
              id="expertise"
              type="text"
              required
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder={STRINGS.expertisePlaceholder[lang]}
              className={inputClass}
            />
          </div>

          {/* Отрасль — searchable dropdown over dataset.companyCategories */}
          <div className="relative flex flex-col gap-1.5" ref={categoryBoxRef}>
            <label htmlFor="category" className={labelClass}>{STRINGS.categoryLabel[lang]}</label>
            <div className="relative">
              <input
                id="category"
                type="text"
                required
                value={categoryOpen ? categoryQuery : (category?.text ?? "")}
                onFocus={(e) => {
                  // Pick whichever side of the input (above/below) has
                  // more room in the viewport right now, and cap the
                  // list's height to what's actually available there —
                  // a fixed max-h-56 dropdown could hang off the bottom
                  // of the screen with no way to see or scroll to its
                  // last items.
                  const rect = e.currentTarget.getBoundingClientRect();
                  const margin = 16;
                  const spaceBelow = window.innerHeight - rect.bottom - margin;
                  const spaceAbove = rect.top - margin;
                  const dropUp = spaceBelow < 160 && spaceAbove > spaceBelow;
                  setCategoryDropUp(dropUp);
                  setCategoryMaxHeight(Math.max(120, Math.min(224, dropUp ? spaceAbove : spaceBelow)));
                  setCategoryOpen(true);
                  setCategoryQuery("");
                }}
                onChange={(e) => setCategoryQuery(e.target.value)}
                onBlur={() => setCategoryOpen(false)}
                placeholder={STRINGS.categoryPlaceholder[lang]}
                className={inputClass + " pr-9"}
                autoComplete="off"
              />
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className={
                  "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-transform dark:text-neutral-500 " +
                  (categoryOpen ? "rotate-180" : "")
                }
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {categoryOpen && (
              <div
                style={{ maxHeight: categoryMaxHeight }}
                className={
                  "absolute z-10 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 " +
                  (categoryDropUp ? "bottom-full mb-1" : "top-full mt-1")
                }
              >
                {filteredCategories.length === 0 && (
                  <div className="px-4 py-2 text-sm text-neutral-400">{STRINGS.categoryEmpty[lang]}</div>
                )}
                {filteredCategories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    // onMouseDown (not onClick) fires before the input's
                    // onBlur closes this list — the standard combobox
                    // ordering trick, avoiding a lost-click race.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCategory(c);
                      setCategoryOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || pending}
            className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {STRINGS.submit[lang]}
          </button>
        </form>
      </div>
    </main>
  );
}

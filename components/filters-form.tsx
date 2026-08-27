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
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { FilterIcon } from "@/components/filter-icon";
import { ClearIcon } from "@/components/clear-icon";

const MAX_SUGGESTIONS_PER_GROUP = 5;

// 2026-08-27, Aleksandr noticed the tag checkboxes (Remote/On-site/Hybrid,
// Full-time/Part-time/Contract, the experience-year buckets) still showed
// raw English after the 9-language rollout — unlike everything else in
// this file, tag.text isn't site chrome, it's live data from the backend
// (lib/a1/datasets.ts's fetchTagsForKind -> dataset.postTags), same
// category as category names, which components/t.tsx's own comment
// explicitly scopes OUT of the <T/> system (translating arbitrary
// backend/author content is a separate, much bigger problem).
//
// This specific tag set is really a small, fixed collection of platform
// facets rather than open-ended user tags, so it's worth a pragmatic
// client-side lookup keyed by the backend's current English text —
// anything NOT in this table (a tag the backend renames or adds later)
// just falls back to its raw tag.text, exactly like before this existed,
// so an unrecognized tag never breaks or disappears, it's just
// untranslated until this table is updated.
const TAG_LABEL_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  "Remote": {
    uk: "Віддалено", en: "Remote", ru: "Удалённо", de: "Remote", es: "Remoto",
    fr: "À distance", pl: "Zdalnie", ptBR: "Remoto", zh: "远程",
  },
  "On-site": {
    uk: "В офісі", en: "On-site", ru: "В офисе", de: "Vor Ort", es: "Presencial",
    fr: "Sur site", pl: "Stacjonarnie", ptBR: "Presencial", zh: "现场办公",
  },
  "Hybrid": {
    uk: "Гібридно", en: "Hybrid", ru: "Гибридно", de: "Hybrid", es: "Híbrido",
    fr: "Hybride", pl: "Hybrydowo", ptBR: "Híbrido", zh: "混合办公",
  },
  "Full-time": {
    uk: "Повна зайнятість", en: "Full-time", ru: "Полная занятость", de: "Vollzeit",
    es: "Tiempo completo", fr: "Temps plein", pl: "Pełny etat", ptBR: "Tempo integral", zh: "全职",
  },
  "Part-time": {
    uk: "Часткова зайнятість", en: "Part-time", ru: "Частичная занятость", de: "Teilzeit",
    es: "Tiempo parcial", fr: "Temps partiel", pl: "Niepełny etat", ptBR: "Meio período", zh: "兼职",
  },
  "Contract": {
    uk: "Контракт", en: "Contract", ru: "Контракт", de: "Vertrag", es: "Contrato",
    fr: "Contrat", pl: "Kontrakt", ptBR: "Contrato", zh: "合同工",
  },
  "1 yr. exp.": {
    uk: "1 рік досвіду", en: "1 yr. exp.", ru: "1 год опыта", de: "1 Jahr Erfahrung",
    es: "1 año de exp.", fr: "1 an d'exp.", pl: "1 rok doświadczenia", ptBR: "1 ano de exp.", zh: "1年经验",
  },
};

function translateTagLabel(text: string, lang: Locale): string {
  return TAG_LABEL_TRANSLATIONS[text]?.[lang] ?? text;
}

// 2026-08-27 follow-up, same reasoning as TAG_LABEL_TRANSLATIONS above:
// "Названия категорий тоже надо переводить" — category.text is also live
// backend data (dataset.postCategories), arriving as "<emoji> <English
// name>" (e.g. "💾 IT"). Rather than keying the lookup on the whole
// string (fragile against emoji encoding quirks), this splits off the
// emoji at render time and translates just the name part, keyed on the
// backend's current English text — unrecognized/renamed/new categories
// fall back to their raw text, same safety net as tags.
const CATEGORY_LABEL_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  "IT": { uk: "ІТ", en: "IT", ru: "ИТ", de: "IT", es: "TI", fr: "Informatique", pl: "IT", ptBR: "TI", zh: "信息技术" },
  "Agriculture": { uk: "Сільське господарство", en: "Agriculture", ru: "Сельское хозяйство", de: "Landwirtschaft", es: "Agricultura", fr: "Agriculture", pl: "Rolnictwo", ptBR: "Agricultura", zh: "农业" },
  "Accounting": { uk: "Бухгалтерія", en: "Accounting", ru: "Бухгалтерия", de: "Buchhaltung", es: "Contabilidad", fr: "Comptabilité", pl: "Księgowość", ptBR: "Contabilidade", zh: "会计" },
  "Advertising": { uk: "Реклама", en: "Advertising", ru: "Реклама", de: "Werbung", es: "Publicidad", fr: "Publicité", pl: "Reklama", ptBR: "Publicidade", zh: "广告" },
  "Construction": { uk: "Будівництво", en: "Construction", ru: "Строительство", de: "Bauwesen", es: "Construcción", fr: "Construction", pl: "Budownictwo", ptBR: "Construção", zh: "建筑" },
  "Cryptocurrencies": { uk: "Криптовалюти", en: "Cryptocurrencies", ru: "Криптовалюты", de: "Kryptowährungen", es: "Criptomonedas", fr: "Cryptomonnaies", pl: "Kryptowaluty", ptBR: "Criptomoedas", zh: "加密货币" },
  "B2B": { uk: "B2B", en: "B2B", ru: "B2B", de: "B2B", es: "B2B", fr: "B2B", pl: "B2B", ptBR: "B2B", zh: "B2B" },
  "Health": { uk: "Здоров'я", en: "Health", ru: "Здоровье", de: "Gesundheit", es: "Salud", fr: "Santé", pl: "Zdrowie", ptBR: "Saúde", zh: "健康" },
  "Distribution": { uk: "Дистрибуція", en: "Distribution", ru: "Дистрибуция", de: "Vertrieb", es: "Distribución", fr: "Distribution", pl: "Dystrybucja", ptBR: "Distribuição", zh: "分销" },
  "Consulting": { uk: "Консалтинг", en: "Consulting", ru: "Консалтинг", de: "Beratung", es: "Consultoría", fr: "Conseil", pl: "Doradztwo", ptBR: "Consultoria", zh: "咨询" },
  "E-commerce": { uk: "Електронна комерція", en: "E-commerce", ru: "Электронная коммерция", de: "E-Commerce", es: "Comercio electrónico", fr: "Commerce électronique", pl: "E-commerce", ptBR: "Comércio eletrônico", zh: "电子商务" },
  "Fashion": { uk: "Мода", en: "Fashion", ru: "Мода", de: "Mode", es: "Moda", fr: "Mode", pl: "Moda", ptBR: "Moda", zh: "时尚" },
  "Media": { uk: "Медіа", en: "Media", ru: "Медиа", de: "Medien", es: "Medios", fr: "Médias", pl: "Media", ptBR: "Mídia", zh: "媒体" },
  "Real Estate": { uk: "Нерухомість", en: "Real Estate", ru: "Недвижимость", de: "Immobilien", es: "Bienes raíces", fr: "Immobilier", pl: "Nieruchomości", ptBR: "Imóveis", zh: "房地产" },
  "Public catering": { uk: "Громадське харчування", en: "Public catering", ru: "Общественное питание", de: "Gastronomie", es: "Restauración", fr: "Restauration", pl: "Gastronomia", ptBR: "Alimentação", zh: "餐饮" },
  "Transport": { uk: "Транспорт", en: "Transport", ru: "Транспорт", de: "Transport", es: "Transporte", fr: "Transport", pl: "Transport", ptBR: "Transporte", zh: "交通运输" },
  "Trading": { uk: "Трейдинг", en: "Trading", ru: "Трейдинг", de: "Handel", es: "Trading", fr: "Trading", pl: "Handel", ptBR: "Trading", zh: "交易" },
  "Sports": { uk: "Спорт", en: "Sports", ru: "Спорт", de: "Sport", es: "Deportes", fr: "Sport", pl: "Sport", ptBR: "Esportes", zh: "体育" },
  "Entertainment": { uk: "Розваги", en: "Entertainment", ru: "Развлечения", de: "Unterhaltung", es: "Entretenimiento", fr: "Divertissement", pl: "Rozrywka", ptBR: "Entretenimento", zh: "娱乐" },
  "Wholesale trading": { uk: "Оптова торгівля", en: "Wholesale trading", ru: "Оптовая торговля", de: "Großhandel", es: "Comercio mayorista", fr: "Commerce de gros", pl: "Handel hurtowy", ptBR: "Comércio atacadista", zh: "批发贸易" },
  "Logistics": { uk: "Логістика", en: "Logistics", ru: "Логистика", de: "Logistik", es: "Logística", fr: "Logistique", pl: "Logistyka", ptBR: "Logística", zh: "物流" },
  "Finances": { uk: "Фінанси", en: "Finances", ru: "Финансы", de: "Finanzen", es: "Finanzas", fr: "Finances", pl: "Finanse", ptBR: "Finanças", zh: "金融" },
  "Education": { uk: "Освіта", en: "Education", ru: "Образование", de: "Bildung", es: "Educación", fr: "Éducation", pl: "Edukacja", ptBR: "Educação", zh: "教育" },
  "Commodities": { uk: "Сировинні товари", en: "Commodities", ru: "Сырьевые товары", de: "Rohstoffe", es: "Materias primas", fr: "Matières premières", pl: "Surowce", ptBR: "Commodities", zh: "大宗商品" },
  "Design": { uk: "Дизайн", en: "Design", ru: "Дизайн", de: "Design", es: "Diseño", fr: "Design", pl: "Design", ptBR: "Design", zh: "设计" },
  "Home Appliances": { uk: "Побутова техніка", en: "Home Appliances", ru: "Бытовая техника", de: "Haushaltsgeräte", es: "Electrodomésticos", fr: "Électroménager", pl: "AGD", ptBR: "Eletrodomésticos", zh: "家用电器" },
  "Business Services": { uk: "Бізнес-послуги", en: "Business Services", ru: "Бизнес-услуги", de: "Geschäftsdienstleistungen", es: "Servicios empresariales", fr: "Services aux entreprises", pl: "Usługi biznesowe", ptBR: "Serviços empresariais", zh: "商业服务" },
  "Import & Export": { uk: "Імпорт та експорт", en: "Import & Export", ru: "Импорт и экспорт", de: "Import & Export", es: "Importación y exportación", fr: "Import-export", pl: "Import i eksport", ptBR: "Importação e exportação", zh: "进出口" },
  "Packaging & Printing": { uk: "Упаковка та друк", en: "Packaging & Printing", ru: "Упаковка и печать", de: "Verpackung & Druck", es: "Embalaje e impresión", fr: "Emballage et impression", pl: "Opakowania i druk", ptBR: "Embalagem e impressão", zh: "包装印刷" },
  "Beauty & Personal Care": { uk: "Краса та догляд", en: "Beauty & Personal Care", ru: "Красота и уход", de: "Schönheit & Körperpflege", es: "Belleza y cuidado personal", fr: "Beauté et soins personnels", pl: "Uroda i pielęgnacja", ptBR: "Beleza e cuidados pessoais", zh: "美容护理" },
  "Manufacturing": { uk: "Виробництво", en: "Manufacturing", ru: "Производство", de: "Fertigung", es: "Manufactura", fr: "Fabrication", pl: "Produkcja", ptBR: "Manufatura", zh: "制造业" },
  "Events organization": { uk: "Організація подій", en: "Events organization", ru: "Организация мероприятий", de: "Eventorganisation", es: "Organización de eventos", fr: "Organisation d'événements", pl: "Organizacja wydarzeń", ptBR: "Organização de eventos", zh: "活动策划" },
  "Medicine": { uk: "Медицина", en: "Medicine", ru: "Медицина", de: "Medizin", es: "Medicina", fr: "Médecine", pl: "Medycyna", ptBR: "Medicina", zh: "医疗" },
  "Retail": { uk: "Роздрібна торгівля", en: "Retail", ru: "Розничная торговля", de: "Einzelhandel", es: "Venta minorista", fr: "Commerce de détail", pl: "Handel detaliczny", ptBR: "Varejo", zh: "零售" },
  "Marketing": { uk: "Маркетинг", en: "Marketing", ru: "Маркетинг", de: "Marketing", es: "Marketing", fr: "Marketing", pl: "Marketing", ptBR: "Marketing", zh: "市场营销" },
  "Food & beverages": { uk: "Їжа та напої", en: "Food & beverages", ru: "Еда и напитки", de: "Lebensmittel & Getränke", es: "Alimentos y bebidas", fr: "Alimentation et boissons", pl: "Żywność i napoje", ptBR: "Alimentos e bebidas", zh: "食品饮料" },
  "Service industry": { uk: "Сфера послуг", en: "Service industry", ru: "Сфера услуг", de: "Dienstleistungsbranche", es: "Sector de servicios", fr: "Secteur des services", pl: "Sektor usług", ptBR: "Setor de serviços", zh: "服务业" },
  "Rental Services": { uk: "Послуги оренди", en: "Rental Services", ru: "Услуги аренды", de: "Vermietungsdienste", es: "Servicios de alquiler", fr: "Services de location", pl: "Usługi wynajmu", ptBR: "Serviços de aluguel", zh: "租赁服务" },
  "Travel": { uk: "Подорожі", en: "Travel", ru: "Путешествия", de: "Reisen", es: "Viajes", fr: "Voyages", pl: "Podróże", ptBR: "Viagens", zh: "旅游" },
};

function translateCategoryLabel(text: string, lang: Locale): string {
  const match = text.match(/^(\S+)\s+(.+)$/);
  if (!match) return text;
  const [, emoji, name] = match;
  const translated = CATEGORY_LABEL_TRANSLATIONS[name]?.[lang];
  return translated ? emoji + " " + translated : text;
}

// Static UI strings this client component needs as plain values (not
// <T/> — CSS can't conditionally show/hide inside attribute values or
// non-DOM text like aria-label), keyed by the same 9 locales as
// components/t.tsx.
type FiltersFormStringKey = "searchPlaceholder" | "clear" | "categories" | "tags" | "filters" | "category";

const FILTERS_FORM_STRINGS: Record<FiltersFormStringKey, Record<Locale, string>> = {
  searchPlaceholder: {
    uk: "Пошук за текстом...", en: "Search by text...", ru: "Поиск по тексту...",
    de: "Suche nach Text...", es: "Buscar por texto...", fr: "Rechercher par texte...",
    pl: "Szukaj po tekście...", ptBR: "Buscar por texto...", zh: "按文字搜索...",
  },
  clear: {
    uk: "Очистити", en: "Clear", ru: "Очистить", de: "Löschen", es: "Borrar",
    fr: "Effacer", pl: "Wyczyść", ptBR: "Limpar", zh: "清除",
  },
  categories: {
    uk: "Категорії", en: "Categories", ru: "Категории", de: "Kategorien", es: "Categorías",
    fr: "Catégories", pl: "Kategorie", ptBR: "Categorias", zh: "分类",
  },
  tags: {
    uk: "Теги", en: "Tags", ru: "Теги", de: "Tags", es: "Etiquetas",
    fr: "Tags", pl: "Tagi", ptBR: "Tags", zh: "标签",
  },
  filters: {
    uk: "Фільтри", en: "Filters", ru: "Фильтры", de: "Filter", es: "Filtros",
    fr: "Filtres", pl: "Filtry", ptBR: "Filtros", zh: "筛选",
  },
  category: {
    uk: "Категорія", en: "Category", ru: "Категория", de: "Kategorie", es: "Categoría",
    fr: "Catégorie", pl: "Kategoria", ptBR: "Categoria", zh: "分类",
  },
};

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
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
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
            placeholder={FILTERS_FORM_STRINGS.searchPlaceholder[lang]}
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
                aria-label={FILTERS_FORM_STRINGS.clear[lang]}
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
                    {FILTERS_FORM_STRINGS.categories[lang]}
                  </div>
                  {categorySuggestions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => pickCategorySuggestion(c.value)}
                      className="block w-full truncate px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {translateCategoryLabel(c.text, lang)}
                    </button>
                  ))}
                </div>
              )}
              {tagSuggestions.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {FILTERS_FORM_STRINGS.tags[lang]}
                  </div>
                  {tagSuggestions.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => pickTagSuggestion(t.value)}
                      className="block w-full truncate px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {translateTagLabel(t.text, lang)}
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
            aria-label={FILTERS_FORM_STRINGS.filters[lang]}
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
                {FILTERS_FORM_STRINGS.category[lang]}
              </div>
              {categories.map((c) => {
                const isEmpty = emptyCategoryValues.includes(c.value);
                const isSelected = currentCategory === c.value;

                if (isSelected) {
                  return (
                    <div key={c.value} className="flex items-center rounded-md bg-accent/10 transition">
                      <button
                        type="button"
                        onClick={() => {
                          onCategoryChange("");
                          setFiltersOpen(false);
                        }}
                        className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm font-medium text-accent"
                      >
                        {translateCategoryLabel(c.text, lang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onCategoryChange("");
                          setFiltersOpen(false);
                        }}
                        aria-label={FILTERS_FORM_STRINGS.clear[lang]}
                        className="mr-1 shrink-0 rounded p-1 text-accent transition hover:opacity-70"
                      >
                        <ClearIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => {
                      onCategoryChange(String(c.value));
                      setFiltersOpen(false);
                    }}
                    className={
                      "block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition " +
                      (isEmpty
                        ? "cursor-not-allowed text-neutral-400 opacity-50 dark:text-neutral-600"
                        : "text-neutral-700 hover:bg-accent/10 hover:text-accent dark:text-neutral-300")
                    }
                  >
                    {translateCategoryLabel(c.text, lang)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
              {translateTagLabel(tag.text, lang)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

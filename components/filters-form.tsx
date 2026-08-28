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
//
// 2026-08-28: "давай перенесём поиск в шапку на десктопе... сделаем его
// компактнее, с иконкой лупы, а фильтры пусть открывают категории и теги
// вместе. Мобильная версия пусть остаётся как есть" — this component now
// renders TWO markups from the same state/logic below: the original
// mobile card (search input + filter-icon-only category popover + tag
// checkboxes), completely unchanged, gated `sm:hidden`; and a new
// compact pill-shaped search box + filter button that gets teleported
// into components/site-nav.tsx's nav bar via a portal (`#nav-search-
// slot`) for `sm:` and above. A portal, not just different classNames on
// markup rendered in place, because the desktop search box needs to
// physically live inside the nav's own DOM subtree (between the logo and
// the tabs) — this component only ever renders inside <main>, wherever
// the page places <Filters>, which is nowhere near the nav.
//
// Both the mobile and desktop filter popovers show category list +
// location + tag chips together, all behind the one filter button —
// 2026-08-28 follow-up ("мы договаривались, что ты это добавишь туда же
// [в] фильтры... но просто это всё будет жить на одной кнопке"):
// mobile used to keep tags as a separate always-visible checkbox row
// below the search box (kept unchanged during the desktop-search-in-nav
// redesign above, per "мобильная версия пусть остаётся как есть" — that
// instruction was scoped to THAT task, not a standing rule), which read
// as tags having quietly vanished once category+location moved behind a
// popover next to them. Consolidated into the same popover as category/
// location for both viewports instead — tagChipsBody (below) is shared
// verbatim, not duplicated. Both popovers still share one `filtersOpen`
// boolean — only one of the two trigger buttons is ever visible at a
// given viewport width (the mobile card and the portaled desktop box are
// CSS-`hidden` opposite each other), so sharing state is safe and avoids
// two independent copies of "is a filter popover open" getting out of
// sync. Query text, debounce, suggestions, and the URL-is-the-filter-
// state navigate() logic are likewise shared as-is between both search
// inputs — typing in whichever one is visible updates the same `query`
// state.
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Category, Tag } from "@/lib/a1/datasets";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { FilterIcon } from "@/components/filter-icon";
import { ClearIcon } from "@/components/clear-icon";
import { SearchIcon } from "@/components/search-icon";

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
  // Both capturing groups are required by the pattern (no `?`), so a
  // successful match always populates match[1]/match[2] — but
  // noUncheckedIndexedAccess still types RegExpMatchArray access as
  // possibly-undefined, hence the assertions.
  const emoji = match[1]!;
  const name = match[2]!;
  const translated = CATEGORY_LABEL_TRANSLATIONS[name]?.[lang];
  return translated ? emoji + " " + translated : text;
}

// Static UI strings this client component needs as plain values (not
// <T/> — CSS can't conditionally show/hide inside attribute values or
// non-DOM text like aria-label), keyed by the same 9 locales as
// components/t.tsx.
type FiltersFormStringKey =
  | "searchPlaceholder"
  | "searchPlaceholderShort"
  | "clear"
  | "categories"
  | "tags"
  | "filters"
  | "category"
  | "location"
  | "locationPlaceholder"
  | "reset";

const FILTERS_FORM_STRINGS: Record<FiltersFormStringKey, Record<Locale, string>> = {
  searchPlaceholder: {
    uk: "Пошук за текстом...", en: "Search by text...", ru: "Поиск по тексту...",
    de: "Suche nach Text...", es: "Buscar por texto...", fr: "Rechercher par texte...",
    pl: "Szukaj po tekście...", ptBR: "Buscar por texto...", zh: "按文字搜索...",
  },
  // 2026-08-28: the compact desktop nav search box (~40% width, pill-
  // shaped, portaled into components/site-nav.tsx) has no room for the
  // long "Search by text..." placeholder — a single word, matching the
  // one-word style already used for "filters"/"category" below.
  searchPlaceholderShort: {
    uk: "Пошук", en: "Search", ru: "Поиск", de: "Suche", es: "Buscar",
    fr: "Recherche", pl: "Szukaj", ptBR: "Buscar", zh: "搜索",
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
  // 2026-08-28: location filter, styled/placed the same as category
  // above — see FiltersForm's locationSectionBody.
  location: {
    uk: "Локація", en: "Location", ru: "Локация", de: "Standort", es: "Ubicación",
    fr: "Localisation", pl: "Lokalizacja", ptBR: "Localização", zh: "位置",
  },
  locationPlaceholder: {
    uk: "Пошук міста...", en: "Search city...", ru: "Поиск города...", de: "Stadt suchen...",
    es: "Buscar ciudad...", fr: "Rechercher une ville...", pl: "Szukaj miasta...",
    ptBR: "Buscar cidade...", zh: "搜索城市...",
  },
  // 2026-08-28: "хочешь reset, но можно было одной кнопкой" — clears
  // category+location+tags together, see resetAllFilters/
  // resetAllFiltersBody below.
  reset: {
    uk: "Скинути", en: "Reset", ru: "Сбросить", de: "Zurücksetzen", es: "Restablecer",
    fr: "Réinitialiser", pl: "Resetuj", ptBR: "Redefinir", zh: "重置",
  },
};

export function FiltersForm({
  basePath,
  categories,
  tags,
  currentQuery,
  currentCategory,
  currentTags,
  currentLocation,
  currentLocationLabel,
  emptyCategoryValues = [],
}: {
  basePath: string;
  categories: Category[];
  tags: Tag[];
  currentQuery?: string;
  currentCategory?: number;
  currentTags: string[];
  currentLocation?: number;
  currentLocationLabel?: string;
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

  // 2026-08-28: "В Фильтрах надо добавить фильтрацию через локацию" —
  // mirrors the query/debounce pattern above, but hits a NEW
  // /api/locations route instead of a router navigation: locations.search
  // is a real backend call needing auth (lib/a1/locations.ts), and this
  // is a "use client" component that can't call it directly (PLAN.md §5
  // rule 4). locationQuery/locationResults are local UI-only state,
  // separate from the applied filter itself (currentLocation/
  // currentLocationLabel props, round-tripped through the URL exactly
  // like category/tags) — picking a result clears them and calls
  // navigate(), same flow as pickCategorySuggestion/pickTagSuggestion.
  // locationRequestIdRef guards against a slow earlier fetch overwriting
  // a faster later one.
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<{ id: number; label: string }[]>([]);
  const [locationSearchPending, setLocationSearchPending] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRequestIdRef = useRef(0);

  // 2026-08-27: "категории... можно их вообще поселить на иконку
  // фильтров, как у нас в приложении" — the category <select> now lives
  // behind a filter-icon button (see components/filter-icon.tsx, traced
  // from the Figma reference he linked) instead of sitting in the main
  // row, so the search box can actually be the wide element. filtersOpen
  // tracks the popover; filtersRef/desktopFiltersRef let a click anywhere
  // outside whichever one is actually visible close it (only one of the
  // two trigger buttons is ever visible at a given viewport width — see
  // this file's top comment — so one shared boolean is safe).
  // 2026-08-28: "тап в любом месте вне модалки сначала закрытием
  // модалки, а потом уже ответ на тап по конкретному элементу" — used to
  // be a global outside-mousedown listener here (filtersRef/
  // desktopFiltersRef below are what's left of it, still attached to
  // each popover's own wrapper so a click inside either doesn't close
  // it via the backdrop below): it closed the popover but let that SAME
  // tap still reach whatever was underneath, so tapping a post card (or
  // even a nav tab) behind an open popover both closed the popover and
  // acted on that element in one go. A full-viewport backdrop rendered
  // right below the popover in this component's return (see there for
  // why it has to live at the top level, not inside either the mobile
  // or desktop branch) fixes it structurally: the backdrop is what
  // catches that first tap, so the element underneath never sees it at
  // all — see that render for the z-index layering.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const desktopFiltersRef = useRef<HTMLDivElement>(null);

  // 2026-08-28: the desktop search box lives in components/site-nav.tsx's
  // DOM subtree via a portal — null until that slot is found client-side
  // (never during SSR/first paint, avoiding any server/client markup
  // mismatch). components/site-nav.tsx always renders the slot div
  // itself, so this resolves on mount on every page that has a nav; a
  // page with no <Filters> anywhere just never portals anything into it.
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setNavSlot(document.getElementById("nav-search-slot"));
  }, []);

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
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, []);

  function navigate(overrides: {
    q?: string;
    category?: number | null;
    tags?: string[];
    location?: number | null;
    locationLabel?: string | null;
  }) {
    const params = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : query;
    const category = overrides.category !== undefined ? overrides.category : currentCategory;
    const nextTags = overrides.tags !== undefined ? overrides.tags : currentTags;
    const location = overrides.location !== undefined ? overrides.location : currentLocation;
    const locationLabel = overrides.locationLabel !== undefined ? overrides.locationLabel : currentLocationLabel;

    const trimmedQ = q.trim();
    if (trimmedQ) params.set("q", trimmedQ);
    if (category != null) params.set("category", String(category));
    for (const tag of nextTags) params.append("tag", tag);
    if (location != null) {
      params.set("location", String(location));
      if (locationLabel) params.set("locationLabel", locationLabel);
    }

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

  async function searchLocationsClient(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setLocationResults([]);
      return;
    }
    const requestId = ++locationRequestIdRef.current;
    setLocationSearchPending(true);
    try {
      const res = await fetch(`/api/locations?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as { results?: { id: number; label: string }[] };
      if (requestId !== locationRequestIdRef.current) return; // a newer request already landed
      setLocationResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      if (requestId === locationRequestIdRef.current) setLocationResults([]);
    } finally {
      if (requestId === locationRequestIdRef.current) setLocationSearchPending(false);
    }
  }

  function onLocationQueryChange(value: string) {
    setLocationQuery(value);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => searchLocationsClient(value), 350);
  }

  function pickLocation(id: number, label: string) {
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    setLocationQuery("");
    setLocationResults([]);
    navigate({ location: id, locationLabel: label });
  }

  function clearLocationFilter() {
    navigate({ location: null, locationLabel: null });
  }

  // Aleksandr, 2026-08-28: "добавим... кнопку с надписью reset...
  // смысл такой, чтобы можно было сбросить эти все [фильтры]. Не по
  // одной отключать" — one button that clears category+location+tags
  // together instead of undoing each pill/selection individually. Free-
  // text search is deliberately left alone here — it already has its
  // own clear (x) button right on the input.
  function resetAllFilters() {
    navigate({ category: null, tags: [], location: null, locationLabel: null });
    setFiltersOpen(false);
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

  // Aleksandr, 2026-08-27: "автоподбор слов вот как гугл делает, таким
  // выпадающим списком. Список именно того что у нас уже есть" —
  // suggestions from our own already-fetched categories and tags, not
  // free-text guesses. Picking one applies it as a real filter (not just
  // text in the search box), since that's more useful than searching
  // post bodies for the word. Shared verbatim between the mobile and
  // desktop search inputs — both anchor it the same way (`relative`
  // wrapper, `absolute ... top-full`).
  const suggestionsDropdown = showSuggestions && (
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
  );

  // Category list, shared verbatim between the mobile and desktop
  // popovers — same data, same selection logic either way. 2026-08-28:
  // "этот блок [локация+теги] надо наверх вначало... а потом уже
  // категории" — category moved to LAST in both popovers (see the
  // render order below), so it now carries its own leading divider
  // (locationSectionBody, now first, dropped its matching one).
  const categoryListBody = (
    <>
      <div className="my-2 border-t border-neutral-100 dark:border-neutral-800" />
      <div className="px-1 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
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
    </>
  );

  // 2026-08-28: "добавим... кнопку reset... чтобы можно было сбросить
  // эти все [фильтры] одной кнопкой" — only rendered once something is
  // actually active, so an empty popover doesn't carry a dead button.
  const resetAllFiltersBody = (currentCategory != null || currentLocation != null || currentTags.length > 0) && (
    <div className="mb-1 flex justify-end px-1 pb-1">
      <button
        type="button"
        onClick={resetAllFilters}
        className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-50"
      >
        {FILTERS_FORM_STRINGS.reset[lang]}
      </button>
    </div>
  );

  // 2026-08-28: "В Фильтрах надо добавить фильтрацию через локацию" +
  // "сделай в таком же стиле [как категория]" — shown in BOTH the mobile
  // and desktop popovers (unlike tagChipsBody below, which stays
  // desktop-only). Same-day follow-up: "этот блок надо наверх вначало...
  // а потом уже категории" — moved to the TOP of both popovers (see the
  // render order below), so no leading divider here (categoryListBody,
  // now last, carries its own instead). Selected state mirrors
  // categoryListBody's selected-category row (a pill with a clear
  // button); unselected state is a live search box hitting
  // /api/locations (debounced, same 350ms as the main search input).
  const locationSectionBody = (
    <>
      <div className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {FILTERS_FORM_STRINGS.location[lang]}
      </div>
      {currentLocation != null && currentLocationLabel ? (
        <div className="flex items-center rounded-md bg-accent/10 transition">
          <div className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm font-medium text-accent">
            {currentLocationLabel}
          </div>
          <button
            type="button"
            onClick={clearLocationFilter}
            aria-label={FILTERS_FORM_STRINGS.clear[lang]}
            className="mr-1 shrink-0 rounded p-1 text-accent transition hover:opacity-70"
          >
            <ClearIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative px-1 pb-1">
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => onLocationQueryChange(e.target.value)}
            placeholder={FILTERS_FORM_STRINGS.locationPlaceholder[lang]}
            className="w-full rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 pr-7 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
          />
          {locationSearchPending && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-neutral-400"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {locationResults.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
              {locationResults.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => pickLocation(loc.id, loc.label)}
                  className="block w-full truncate px-2.5 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {loc.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  // 2026-08-28: tags as toggle pills inside the same filter popover as
  // the category list ("фильтры пусть открывают категории и теги
  // вместе"), shared verbatim by both the mobile and desktop popovers —
  // see this file's top comment for why mobile no longer has its own
  // separate always-visible checkbox row.
  const tagChipsBody = tags.length > 0 && (
    <>
      <div className="my-2 border-t border-neutral-100 dark:border-neutral-800" />
      <div className="px-1 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {FILTERS_FORM_STRINGS.tags[lang]}
      </div>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {tags.map((tag) => {
          const active = currentTags.includes(tag.value);
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => onTagToggle(tag.value, !active)}
              className={
                "rounded-full border px-2.5 py-1 text-xs transition " +
                (active
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800")
              }
            >
              {translateTagLabel(tag.text, lang)}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* 2026-08-28: z-30, deliberately BELOW the nav bar's z-40 — this
          backdrop closes the popover on any outside tap (see the fuller
          comment on this same pattern in settings-menu.tsx). The desktop
          popover panel below is portaled into site-nav.tsx's #nav-search
          -slot, i.e. it physically lives INSIDE <nav>. <nav> has its own
          z-40, which makes it a stacking context of its own — so from
          the page's point of view the portaled panel's z-50 only ranks
          against other things *inside* that nav bracket, not against
          this backdrop, which sits outside it. A backdrop at z-45 (tried
          first) out-ranked the whole nav bracket and sat on top of the
          panel, silently swallowing every click meant for it — tags,
          the location box, categories, all of it — while still visually
          showing the popover underneath. z-30 keeps the backdrop below
          nav's own z-40 so nav's bracket (panel included) stays on top. */}
      {filtersOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile search + filters. 2026-08-28: "уберем вот эту всю некую
          подложку... под серч" — dropped the gray card this used to sit
          in (border/bg/padding), so the search pill and filter button
          now float directly on the page background like desktop's do;
          mb-8 -> mb-4 to bring the feed up a bit now that this block is
          visually lighter. */}
      <div className="mb-4 flex flex-col gap-3 sm:hidden">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
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
              placeholder={FILTERS_FORM_STRINGS.searchPlaceholderShort[lang]}
              className="w-full rounded-full border border-neutral-300 bg-white py-2 pl-9 pr-8 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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

            {suggestionsDropdown}
          </div>
          <div className="relative shrink-0" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label={FILTERS_FORM_STRINGS.filters[lang]}
              aria-expanded={filtersOpen}
              className={
                "relative flex h-10 w-10 items-center justify-center rounded-full border transition " +
                (currentCategory != null || currentLocation != null || currentTags.length > 0
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
              }
            >
              <FilterIcon className="h-5 w-5" />
              {(currentCategory != null || currentLocation != null || currentTags.length > 0) && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white dark:ring-black"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Aleksandr, 2026-08-28: "мне очень нравится попап с языками и
                темой... выбор категории сделай в таком же стиле. Тоже
                вот так сверху и частично, не снизу выезжающий" — was a
                fixed-to-viewport-bottom sheet (slide up, backdrop, drag
                handle), same style components/settings-menu.tsx used to
                have before its own anchored-popover rework. Same fix
                here, same reasoning: a compact card anchored right under
                the filter button (`.animate-popover`, defined in
                app/globals.css alongside settings-menu.tsx's popover).
                Closing on an outside tap is the full-viewport backdrop
                rendered at the top of this component's return, not a
                listener here — see that comment. */}
            {filtersOpen && (
              <div className="animate-popover absolute right-0 top-full z-50 mt-2 max-h-[85vh] w-72 max-w-[calc(100vw-2rem)] origin-top-right overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {resetAllFiltersBody}
                {locationSectionBody}
                {tagChipsBody}
                {categoryListBody}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop-only search box + filter button, teleported into
          components/site-nav.tsx's #nav-search-slot (between the logo
          and the Jobs/Talents tabs) — see this file's top comment. Never
          rendered during SSR/first paint (navSlot starts null), so
          there's no server/client markup mismatch to worry about. */}
      {navSlot &&
        createPortal(
          <div className="flex w-full items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => setInputFocused(false), 150);
                }}
                placeholder={FILTERS_FORM_STRINGS.searchPlaceholderShort[lang]}
                className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-9 pr-8 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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

              {suggestionsDropdown}
            </div>

            <div className="relative shrink-0" ref={desktopFiltersRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-label={FILTERS_FORM_STRINGS.filters[lang]}
                aria-expanded={filtersOpen}
                className={
                  "relative flex h-8 w-8 items-center justify-center rounded-full border transition " +
                  (currentCategory != null || currentTags.length > 0 || currentLocation != null
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
                }
              >
                <FilterIcon className="h-4 w-4" />
                {(currentCategory != null || currentTags.length > 0 || currentLocation != null) && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white dark:ring-black"
                    aria-hidden="true"
                  />
                )}
              </button>

              {filtersOpen && (
                <div className="animate-popover absolute right-0 top-full z-50 mt-2 max-h-[30rem] w-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  {resetAllFiltersBody}
                  {locationSectionBody}
                  {tagChipsBody}
                  {categoryListBody}
                </div>
              )}
            </div>
          </div>,
          navSlot,
        )}
    </>
  );
}

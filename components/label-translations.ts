// components/label-translations.ts
//
// Extracted from components/filters-form.tsx on 2026-08-29 ("Надо их
// вокализовать под конкретно, ну то есть типа на каждый язык" — the same
// tag/category translation tables filters-form.tsx already built for its
// own dropdowns are needed again by components/post-editor.tsx's tag
// pills and category picker, which previously rendered raw English
// tag.text/category.text with no translation at all). Pulled into a
// shared module instead of copy-pasting the ~40-category table a second
// time, so both call sites stay in sync when a category or tag is
// renamed/added on the backend.
//
// Both lookups are keyed on the backend's current English text and fall
// back to the raw text for anything not in the table — see each
// function's own comment below for why (this file's history, carried
// over unchanged from filters-form.tsx).

import type { Locale } from "@/components/t";

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
export const TAG_LABEL_TRANSLATIONS: Record<string, Record<Locale, string>> = {
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

export function translateTagLabel(text: string, lang: Locale): string {
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
export const CATEGORY_LABEL_TRANSLATIONS: Record<string, Record<Locale, string>> = {
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

export function translateCategoryLabel(text: string, lang: Locale): string {
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

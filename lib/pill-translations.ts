// lib/pill-translations.ts
//
// 2026-08-30, live-testing feedback: "чому хобі, інтереси в роботі і
// стиль роботи англійською? У додатку все українською" -- the three
// dataset-backed pill pickers in components/profile-editor.tsx (Hobbies,
// Work interests, Work style preferences) render whatever `text` the
// backend's dataset.* endpoints return, which is English, unlike every
// other label in this dialog. Confirmed two ways, neither of them a
// guess: (1) our OWN web editor's screenshots from this same feedback
// batch show the raw English pills (e.g. "Agriculture, Accounting,
// Advertising..." under "Інтереси в роботі" -- a Ukrainian section
// title with English pill values inside it); (2) the mobile app's own
// hobby pills, in the attached screen recording, render in Ukrainian
// ("Сальса, Хайкінг, Піші прогулянки"). There is no `lang`/locale
// parameter documented or evidenced anywhere in lib/a1/datasets.ts's
// existing `dataset.*` calls (all called with a bare `{}`), and network
// access to the real backend is blocked from every environment
// available this session (confirmed via a direct curl attempt returning
// a 403 from the egress proxy, both from the cloud sandbox and from
// Aleksandr's own Mac) -- so there was no way to test whether the
// backend secretly accepts one. Given that, the mobile app most likely
// keeps its own client-side translation table for these exact same
// dataset values rather than getting them pre-translated from the
// server. This file is that same approach for the web: a plain,
// client-safe (no lib/a1/client.ts import chain) static EN -> UK
// dictionary for every pill value actually confirmed against a real
// screenshot, keyed defensively (by dataset section, not just the bare
// English string) so that same-spelled options in different sections
// (e.g. "Balanced" appears in both workLifeBalance and
// workloadAndTaskDelegation, "Painting" appears in both the Arts and
// DIY hobby groups) can carry different, section-correct translations
// instead of colliding.
//
// Deliberately NOT exhaustive: only Hobbies groups actually visible in
// a screenshot (5 of "presumably more" -- see the live-testing feedback
// screenshot ad107c42-image.png, which itself may have more below the
// fold), only 9 of the profile page's 14 Work Style sections (the other
// 5 -- decisionMakingStyle, preferredCollaborationStyle,
// partnershipPreference, preferredWorkingEnvironment, learningStyle --
// never appeared in any attached screenshot's visible viewport), and
// only the 39 Work Interests categories that were all visible in one
// screenshot (a6891bf0-image.png). Anything not in these tables falls
// back to the backend's own English `text` unchanged -- exactly today's
// behavior -- rather than guessing a translation with no evidence
// behind it. Only "uk" gets a translation; every other locale keeps the
// backend's English text, same as before this file existed, since no
// other language's real in-app wording was available to confirm against.
import type { Locale } from "@/components/t";

function pick(dict: Record<string, string> | undefined, text: string, lang: Locale): string {
  if (lang !== "uk" || !dict) return text;
  return dict[text] ?? text;
}

// ---------------- Work interests (Інтереси в роботі) ----------------
// Source: a6891bf0-image.png, "Інтереси в роботі" section of our own
// editor, live-tested 2026-08-30 -- all 39 categories visible in one
// screenshot, so this table is the complete confirmed set (there could
// still be more beyond what that one dataset snapshot returned).
const WORK_INTERESTS_UK: Record<string, string> = {
  "Agriculture": "Сільське господарство",
  "Accounting": "Бухгалтерія",
  "Advertising": "Реклама",
  "Construction": "Будівництво",
  "Cryptocurrencies": "Криптовалюти",
  "B2B": "B2B",
  "Health": "Здоров'я",
  "Distribution": "Дистрибуція",
  "Consulting": "Консалтинг",
  "E-commerce": "Електронна комерція",
  "Fashion": "Мода",
  "Media": "Медіа",
  "Real Estate": "Нерухомість",
  "Public catering": "Громадське харчування",
  "Transport": "Транспорт",
  "Trading": "Трейдинг",
  "Sports": "Спорт",
  "Entertainment": "Розваги",
  "Wholesale trading": "Оптова торгівля",
  "Logistics": "Логістика",
  "Finances": "Фінанси",
  "Education": "Освіта",
  "Commodities": "Товари",
  "Design": "Дизайн",
  "Home Appliances": "Побутова техніка",
  "Business Services": "Бізнес-послуги",
  "Import & Export": "Імпорт та експорт",
  "Packaging & Printing": "Упаковка та друк",
  "Beauty & Personal Care": "Краса та догляд за собою",
  "IT": "ІТ",
  "Manufacturing": "Виробництво",
  "Events organization": "Організація подій",
  "Medicine": "Медицина",
  "Retail": "Роздрібна торгівля",
  "Marketing": "Маркетинг",
  "Food & beverages": "Їжа та напої",
  "Service industry": "Сфера послуг",
  "Rental Services": "Послуги оренди",
  "Travel": "Подорожі",
};

export function translateWorkInterest(text: string, lang: Locale): string {
  return pick(WORK_INTERESTS_UK, text, lang);
}

// ---------------- Hobbies (Хобі) ----------------
// Source: ad107c42-image.png, "Хобі" section of our own editor,
// live-tested 2026-08-30. Keyed by the backend's own group name (as
// rendered in group.group) so items with the same English spelling in
// two different groups (e.g. "Painting") get the translation correct
// for THAT group, not whichever one happens to be looked up first.
const HOBBY_GROUP_UK: Record<string, string> = {
  "Arts and Crafts": "Мистецтво та рукоділля",
  "Collecting and Hobbies": "Колекціонування та хобі",
  "Cooking and Baking": "Кулінарія та випічка",
  "DIY and Home Improvement": "Рукоділля та ремонт дому",
  "Fashion and Style": "Мода та стиль",
};

const HOBBY_ITEMS_UK: Record<string, Record<string, string>> = {
  "Arts and Crafts": {
    "Arts": "Мистецтво",
    "Drawing": "Малювання",
    "Knitting": "В'язання",
    "Origami": "Орігамі",
    "Painting": "Живопис",
    "Photography": "Фотографія",
    "Pottery": "Гончарство",
    "Sculpting": "Скульптура",
    "Sewing": "Шиття",
  },
  "Collecting and Hobbies": {
    "Antiquing": "Пошук антикваріату",
    "Coin Collecting": "Колекціонування монет",
    "Comic Book Collecting": "Колекціонування коміксів",
    "Model Building": "Збірка моделей",
    "Stamp Collecting": "Колекціонування марок",
  },
  "Cooking and Baking": {
    "Baking": "Випічка",
    "BBQ": "Барбекю",
    "Cake Decorating": "Декорування тортів",
    "Cooking": "Кулінарія",
    "Recipe Experimentation": "Експерименти з рецептами",
  },
  "DIY and Home Improvement": {
    "Furniture Restoration": "Реставрація меблів",
    "Gardening Projects": "Садівництво",
    "Home Renovation": "Ремонт дому",
    "Painting": "Малярні роботи",
    "Wood Crafts": "Вироби з дерева",
  },
  "Fashion and Style": {
    "DIY Fashion Projects": "Мода своїми руками",
    "Fashion Design": "Дизайн одягу",
    "Fashion Photography": "Фотографія моди",
    "Fashion Shows": "Показ мод",
    "Modelling": "Моделінг",
  },
};

export function translateHobbyGroup(group: string, lang: Locale): string {
  return pick(HOBBY_GROUP_UK, group, lang);
}

export function translateHobbyItem(group: string, text: string, lang: Locale): string {
  return pick(HOBBY_ITEMS_UK[group], text, lang);
}

// ---------------- Work style preferences (Стиль роботи) ----------------
// Source: 9f629035-image.png, "Стиль роботи" section of our own editor,
// live-tested 2026-08-30 -- that screenshot had 9 of the 14 sections; the
// remaining 5 (decisionMakingStyle, preferredCollaborationStyle,
// partnershipPreference, preferredWorkingEnvironment, learningStyle) came
// from a follow-up screenshot the same day. Keyed by the
// WORK_STYLE_DATASET_KEYS value
// (lib/work-style-keys.ts) for the same same-word-different-section
// reason as Hobbies above -- e.g. "Balanced" means something different
// in workLifeBalance ("зосереджений порівну на роботі й особистому")
// than in workloadTaskDelegation ("порівну розподіляю завдання").
const WORK_STYLE_OPTION_UK: Record<string, Record<string, string>> = {
  workEnvironment: {
    "Remote": "Віддалено",
    "Office-based": "В офісі",
    "Hybrid": "Гібридний формат",
  },
  personalityType: {
    "Visionary": "Візіонер",
    "Executor": "Виконавець",
    "Innovator": "Новатор",
    "Organizer": "Організатор",
  },
  workLifeBalance: {
    "Work-focused": "Орієнтований на роботу",
    "Balanced": "Збалансований",
    "Life-focused": "Орієнтований на особисте життя",
  },
  workStyle: {
    "Independent": "Самостійний",
    "Team": "Командний",
    "Flexible": "Гнучкий",
  },
  workAvailability: {
    "Full-time": "Повна зайнятість",
    "Part-time": "Часткова зайнятість",
    "Ad hoc": "За потреби",
    "Specific hours": "Певні години",
  },
  projectType: {
    "One-time": "Разовий",
    "Ongoing collaboration": "Постійна співпраця",
    "Task-based": "За завданнями",
  },
  leadershipStyle: {
    "Hands-On": "Практичний",
    "Delegative": "Делегувальний",
    "Supportive": "Підтримувальний",
    "Strategic": "Стратегічний",
  },
  riskTolerance: {
    "High": "Високе",
    "Moderate": "Помірне",
    "Risk-averse": "Обережне",
  },
  // Dataset key per lib/work-style-keys.ts's own comment: the user's
  // field is workloadAndTaskDelegation, but the dataset lookup key
  // (what components/profile-editor.tsx actually indexes
  // bootstrap.workStylePreferences with) is workloadTaskDelegation.
  workloadTaskDelegation: {
    "Hands-on": "Виконую сам",
    "Balanced": "Збалансовано",
    "Delegated": "Делегую",
  },
  // 2026-08-30, live-testing feedback ("А че ты только часть локализации
  // сделал?"): the remaining 5 of the 14 Work Style sections, confirmed
  // via a follow-up screenshot showing their exact English option values
  // (the section headers themselves -- "Стиль прийняття рішень", "Стиль
  // співпраці", "Партнерство", "Бажане робоче середовище", "Стиль
  // навчання" -- were already localized before this; only these options
  // underneath them weren't).
  decisionMakingStyle: {
    "Data-driven": "На основі даних",
    "Intuitive": "Інтуїтивний",
    "Consensus-based": "На основі консенсусу",
  },
  preferredCollaborationStyle: {
    "Remote": "Віддалено",
    "In-person": "Особисто",
    "Hybrid": "Гібридний формат",
  },
  partnershipPreference: {
    "Equal": "Рівноправне",
    "Silent": "Мовчазне",
    "Majority": "За більшістю",
    "Expertise / Connections": "За експертизою/зв'язками",
  },
  preferredWorkingEnvironment: {
    "Remote": "Віддалено",
    "Office": "В офісі",
    "Hybrid": "Гібридний формат",
  },
  learningStyle: {
    "Self-directed": "Самостійне навчання",
    "Workshops": "Воркшопи",
    "Peer learning": "Навчання з колегами",
    "Mentorship": "Менторство",
  },
};

export function translateWorkStyleOption(datasetKey: string, text: string, lang: Locale): string {
  return pick(WORK_STYLE_OPTION_UK[datasetKey], text, lang);
}

// ---------------- Company categories (Сфера діяльності) ----------------
// 2026-08-30, live-testing feedback: "Локализуй 'галузь' и поменяй
// нейминг на 'сфера діяльності'" -- the Companies section's category
// picker (component/profile-editor.tsx's companyCategoryPlaceholder,
// backed by dataset.companyCategories per lib/a1/datasets.ts) had the
// same unlocalized-English-pill problem as Work interests/Hobbies/Work
// style above, plus the label itself needed renaming from "Галузь" to
// "Сфера діяльності".
//
// dataset.companyCategories is its OWN backend endpoint, separate from
// dataset.workInterests (see lib/a1/datasets.ts) -- NOT confirmed to
// return identical values, just confirmed (via the report's own
// screenshot) to overlap on the five below, which happen to have the
// exact same English spelling as their Work Interests counterparts.
// Deliberately its own dictionary rather than reusing
// translateWorkInterest directly, so a future divergence between the two
// endpoints' values doesn't silently mistranslate one from the other.
const COMPANY_CATEGORY_UK: Record<string, string> = {
  "IT": "ІТ",
  "Agriculture": "Сільське господарство",
  "Accounting": "Бухгалтерія",
  "Advertising": "Реклама",
  "Construction": "Будівництво",
};

export function translateCompanyCategory(text: string, lang: Locale): string {
  return pick(COMPANY_CATEGORY_UK, text, lang);
}

// ---------------- Location country name ----------------
// 2026-08-30, live-testing feedback (profile header screenshot, UK
// locale selected): "Berlin, Germany - нужна локализация" -- same shape
// of bug as everything else in this file: lib/a1/user-mappers.ts's
// mapLocation() and lib/a1/mappers.ts's post-location equivalent both
// just forward the backend's own `city`/`country`/`displayName` fields
// verbatim (see components/locale-format.tsx's LocationLabel, the new
// call site for this), and that backend data is plain English/Latin
// place names with no locale awareness at all -- confirmed by the
// screenshot itself (Ukrainian selected, "Германия"/"Німеччина" never
// shown, only "Germany").
//
// City names are deliberately left untranslated here -- "Berlin" isn't
// a UI string, it's the literal name of the place, and this app has no
// geo-name transliteration service to render it correctly in every
// script this app supports (uk/ru readably could go phonetic, but
// de/es/fr/pl/ptBR/zh proper transliteration of arbitrary world cities
// is a real localization feature this codebase doesn't have and
// shouldn't fake with guesses). Only the COUNTRY word gets translated --
// a small, finite, enumerable set, exactly like COMPANY_CATEGORY_UK
// above -- via localizeLocationDisplay's targeted suffix-replace on the
// backend's own pre-formatted `display` string, so an unrecognized
// format (or an unlisted country) safely falls through to the original
// text unchanged instead of risking a mangled string.
//
// Not exhaustive -- only countries actually seen in this session's own
// test data (Ukraine, Germany) plus the rest of a reasonably common
// jobs-platform set (major EU/US/neighboring countries). Add more as
// real accounts surface them; the pick()/fallback pattern makes that
// safe to do incrementally.
const COUNTRY_UK: Record<string, string> = {
  Ukraine: "Україна",
  Germany: "Німеччина",
  Poland: "Польща",
  "United States": "США",
  "United Kingdom": "Велика Британія",
  France: "Франція",
  Spain: "Іспанія",
  Italy: "Італія",
  Netherlands: "Нідерланди",
  Portugal: "Португалія",
  Belgium: "Бельгія",
  Austria: "Австрія",
  Switzerland: "Швейцарія",
  "Czech Republic": "Чехія",
  Slovakia: "Словаччина",
  Romania: "Румунія",
  Bulgaria: "Болгарія",
  Hungary: "Угорщина",
  Lithuania: "Литва",
  Latvia: "Латвія",
  Estonia: "Естонія",
  Sweden: "Швеція",
  Norway: "Норвегія",
  Denmark: "Данія",
  Finland: "Фінляндія",
  Ireland: "Ірландія",
  Greece: "Греція",
  Turkey: "Туреччина",
  Canada: "Канада",
  Georgia: "Грузія",
  Moldova: "Молдова",
  Cyprus: "Кіпр",
  "United Arab Emirates": "ОАЕ",
};

export function translateCountry(text: string, lang: Locale): string {
  return pick(COUNTRY_UK, text, lang);
}

// `display` is the backend's own pre-assembled string (e.g. "Berlin,
// Germany" or, per lib/a1/user-mappers.ts/lib/a1/mappers.ts, possibly
// just a bare country with no city) -- there's no documented format
// contract for it, so this only ever replaces a literal trailing match
// of the raw `country` value and leaves everything else in `display`
// (city, any region, punctuation) untouched. No match -> `display`
// returned as-is, same as today.
export function localizeLocationDisplay(display: string, country: string | null | undefined, lang: Locale): string {
  if (!country) return display;
  const translated = translateCountry(country, lang);
  if (translated === country) return display;
  if (display === country) return translated;
  if (display.endsWith(country)) {
    return display.slice(0, display.length - country.length) + translated;
  }
  return display;
}

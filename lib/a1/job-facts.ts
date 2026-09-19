// lib/a1/job-facts.ts
//
// 2026-09-19 (Александр, после скриншота конкурента: «мы можем какие-то
// ключевые вещи ещё выводить в теги наверх?»). Три факта, по которым
// человек за две секунды решает «моё / не моё»: сколько нужно опыта,
// какой английский и в какой области продукт. Всё остальное у нас уже
// есть отдельными чипами -- формат, занятость, локация, зарплата, стек.
//
// Почему разбор текста, а не поле из источника: на DOU ни опыта, ни
// английского нет отдельными полями -- проверено 19.09.2026 и на списке
// вакансий, и на странице одной вакансии. Всё это живёт прямо в тексте.
//
// Почему на вебе, а не в парсере: так это работает на всех 6600 уже
// опубликованных вакансиях сразу, без перезаливки. Ровно так же здесь
// уже устроены технические теги -- lib/a1/tech-tags.ts. Если позже
// понадобятся фильтры и матчинг с профилем, ту же функцию переносим в
// парсер и пишем результат тегами -- правила не меняются.
//
// Правило точности одно: берём только то, что ЯВНО написано. Ничего не
// додумываем. Неверный тег «C1» отпугнёт подходящего человека, и это
// хуже, чем отсутствие тега.

export type EnglishLevel = {
  /** Уровень по CEFR, если он написан или однозначно следует из слова. */
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  /** Словесная форма, как в тексте: Upper-Intermediate, Advanced... */
  word: string | null;
};

export type JobFacts = {
  /** Нижняя граница опыта в годах, как написано в тексте. */
  experienceYears: number | null;
  english: EnglishLevel | null;
  /** Область продукта: FinTech, iGaming, E-commerce... */
  domain: string | null;
};

const EMPTY: JobFacts = { experienceYears: null, english: null, domain: null };

// ---------------------------------------------------------------- опыт

// Все формы требуют либо слова «досвід/опыт/experience» рядом, либо
// конструкции «5+ років». Без этого «нашій агенції вже 6 років» и «за 5
// років увійти в ТОП» превратились бы в требование к кандидату.
// ВАЖНО про \b: в JavaScript граница слова считается по ЛАТИНСКИМ
// буквам, кириллица для неё -- не буква. Поэтому перед «від» и после
// «років» \b ставить нельзя, иначе правило молча не срабатывает: на
// этом уже обожглись, «Досвід роботи від 2 років» не находился вовсе.
const EXPERIENCE_RULES: RegExp[] = [
  /(?:досвід|досвіду|опыт|опыта|experience)[^.\n;]{0,60}?від\s*(\d{1,2})\s*(?:\+\s*)?(?:рок|рік|років|року)/i,
  /від\s*(\d{1,2})\s*(?:\+\s*)?(?:рок|рік|років|року)[^.\n;]{0,40}?(?:досвід|досвіду)/i,
  /(\d{1,2})\s*\+\s*(?:рок(?:и|ів|у)?|рік|years?|yrs?)/i,
  /\b(?:from|over|at least|min(?:imum)?(?: of)?)\s*(\d{1,2})\s*\+?\s*years?\b/i,
  /\b(\d{1,2})\s*(?:\+\s*)?years?\s+(?:of\s+)?(?:relevant\s+|commercial\s+|professional\s+|hands-on\s+)?experience\b/i,
  /(?:досвід|досвіду|опыт|опыта)[^.\n;]{0,40}?(\d{1,2})\s*(?:\+\s*)?(?:рок(?:и|ів|у)?|рік)/i,
  /не\s*менше\s*(\d{1,2})\s*(?:рок(?:и|ів|у)?|рік)/i,
];

function extractExperience(text: string): number | null {
  for (const rule of EXPERIENCE_RULES) {
    const m = rule.exec(text);
    const raw = m?.[1];
    if (!raw) continue;
    const years = Number.parseInt(raw, 10);
    // 0 лет -- это не требование, а его отсутствие; больше 15 в
    // вакансиях не пишут, такое число почти наверняка не про опыт.
    if (Number.isFinite(years) && years >= 1 && years <= 15) return years;
  }
  return null;
}

// ----------------------------------------------------------- английский

const WORD_TO_CEFR: Record<string, EnglishLevel["cefr"]> = {
  elementary: "A2",
  "pre-intermediate": "A2",
  preintermediate: "A2",
  intermediate: "B1",
  "upper-intermediate": "B2",
  upperintermediate: "B2",
  advanced: "C1",
  fluent: "C1",
  proficiency: "C2",
  proficient: "C2",
  native: "C2",
};

const ENGLISH_WORD = "pre[\\s-]?intermediate|upper[\\s-]?intermediate|intermediate|advanced|elementary|fluent|proficien\\w*|native";
const ENGLISH_NAME = "англ[іи]йськ\\w*|англійськ\\w*|english|англ\\.?";

// Уровень засчитывается ТОЛЬКО рядом со словом «англійська/English».
// Иначе «Advanced analytics» и «native macOS» стали бы уровнем языка.
const ENGLISH_RULES: RegExp[] = [
  new RegExp(`(?:${ENGLISH_NAME})[^.\\n;]{0,45}?\\b([ABC][12])\\b`, "i"),
  new RegExp(`\\b([ABC][12])\\b[^.\\n;]{0,25}?(?:${ENGLISH_NAME})`, "i"),
  new RegExp(`(?:${ENGLISH_NAME})[^.\\n;]{0,45}?\\b(${ENGLISH_WORD})\\b`, "i"),
  new RegExp(`\\b(${ENGLISH_WORD})\\b[^.\\n;]{0,25}?(?:${ENGLISH_NAME})`, "i"),
];

function titleCaseLevel(word: string): string {
  return word
    .toLowerCase()
    .replace(/\s+/g, "-")
    .split("-")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join("-");
}

function extractEnglish(text: string): EnglishLevel | null {
  let cefr: EnglishLevel["cefr"] = null;
  let word: string | null = null;

  for (const rule of ENGLISH_RULES) {
    const m = rule.exec(text);
    const hit = m?.[1];
    if (!hit) continue;
    if (/^[ABC][12]$/i.test(hit)) {
      if (!cefr) cefr = hit.toUpperCase() as EnglishLevel["cefr"];
    } else if (!word) {
      word = titleCaseLevel(hit);
      const key = hit.toLowerCase().replace(/\s+/g, "-");
      const mapped = WORD_TO_CEFR[key] ?? WORD_TO_CEFR[key.replace(/-/g, "")] ?? null;
      if (!cefr && mapped) cefr = mapped;
    }
  }

  if (!cefr && !word) return null;
  return { cefr, word };
}

/**
 * Короткая подпись уровня для плашки: «B2» или, если кода в тексте нет,
 * словом -- «Upper-Intermediate».
 *
 * Оба сразу («B2 · Upper-Intermediate») намеренно НЕ показываем: вместе
 * с подписью «Англійська» плашка становится длиннее половины экрана
 * телефона, а нового смысла в ней нет -- это одно и то же двумя
 * способами.
 */
export function englishLabel(level: EnglishLevel): string {
  return level.cefr ?? level.word ?? "";
}

// --------------------------------------------------------------- область

// Написание в тексте бывает любым (fintech, FinTech, Fin-Tech), а на
// чипе должно быть одно и то же.
const DOMAINS: Array<[RegExp, string]> = [
  [/\bfin[\s-]?tech\b/i, "FinTech"],
  [/\bprop[\s-]?tech\b/i, "PropTech"],
  [/\bhealth[\s-]?tech\b|\bmed[\s-]?tech\b/i, "HealthTech"],
  [/\bed[\s-]?tech\b/i, "EdTech"],
  [/\bmar[\s-]?tech\b/i, "MarTech"],
  [/\bad[\s-]?tech\b/i, "AdTech"],
  [/\bhr[\s-]?tech\b/i, "HRTech"],
  [/\binsur[\s-]?tech\b/i, "InsurTech"],
  [/\blegal[\s-]?tech\b/i, "LegalTech"],
  [/\btravel[\s-]?tech\b/i, "TravelTech"],
  [/\bagri[\s-]?tech\b/i, "AgriTech"],
  [/\bfood[\s-]?tech\b/i, "FoodTech"],
  [/\bi[\s-]?gaming\b|\bgambling\b|\bbetting\b/i, "iGaming"],
  [/\bgame[\s-]?dev\b|\bgamedev\b|\bgame development\b/i, "GameDev"],
  [/\be[\s-]?commerce\b|\bеком(?:мерс|ерс)\b/i, "E-commerce"],
  [/\bmarketplace\b/i, "Marketplace"],
  [/\bweb\s?3\b|\bcrypto\b|\bblockchain\b|\bкрипт\w*\b/i, "Crypto / Web3"],
  [/\bcyber[\s-]?security\b|\bкібербезпек\w*\b/i, "Cybersecurity"],
  [/\blogistic\w*\b|\bлогістик\w*\b/i, "Logistics"],
  // ВНИМАНИЕ: не \btelecom\w*\b -- под него попадает «telecommute»,
  // то есть удалённая работа, а не отрасль связи.
  [/\btelecoms?\b|\btelecommunications?\b|\bтелеком\b/i, "Telecom"],
  [/\bsaas\b/i, "SaaS"],
];

/**
 * Область ищем только в заголовке и в НАЧАЛЕ текста -- там, где компания
 * рассказывает о себе и своём продукте.
 *
 * Замер на 20 живых вакансиях (19.09.2026) показал, зачем это нужно:
 * настоящие упоминания («міжнародна EdTech-компанія», «B2B iGaming
 * platforms») стоят в первых 6% текста, а ложные -- глубоко внутри, в
 * перечислении «досвід у defense, UAV, aerospace, telecommunications»,
 * где это список подходящих бэкграундов кандидата, а вовсе не отрасль
 * продукта. Отсечка по началу текста убирает ровно этот класс ошибок.
 */
function extractDomain(title: string, text: string): string | null {
  const head = `${title}\n${text.slice(0, Math.max(400, Math.round(text.length * 0.2)))}`;
  for (const [rule, label] of DOMAINS) {
    if (rule.test(head)) return label;
  }
  return null;
}

/**
 * Разбирает текст вакансии. Заголовок идёт первым куском: в нём область
 * продукта часто названа прямо («Middle PHP developer (iGaming)»).
 */
export function extractJobFacts(title: string, text: string): JobFacts {
  const body = `${title}\n${text}`;
  if (!body.trim()) return EMPTY;
  return {
    experienceYears: extractExperience(body),
    english: extractEnglish(body),
    domain: extractDomain(title, text),
  };
}

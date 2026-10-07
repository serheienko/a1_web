// lib/alpha/brain.ts
//
// Alpha's "brain" for the test environment (2026-10-07). Rule-based stand-in
// that understands the first free-text message, decides what is still
// missing and asks clarifying questions until it understands (no fixed limit). Same input/output as the
// future AI version (Claude via API), so swapping it later touches only
// this file -- the window and the search stay as they are.

import { TECH_CATALOG } from "@/lib/seo/tech-catalog";
import {
  EMPTY_PORTRAIT,
  type AlphaPortrait,
  type AlphaQuestion,
  type AlphaSlot,
  type AlphaTurnRequest,
  type AlphaTurnResponse,
} from "./types";

type L = "uk" | "en" | "ru";
const pick = (lang: string): L => (lang === "uk" || lang === "ru" ? lang : "en");


// ---------- understanding free text ----------

const SYNONYMS: [RegExp, string][] = [
  [/флат+ер|флатер/i, "Flutter"],
  [/реакт/i, "React"],
  [/пайтон|питон/i, "Python"],
  [/джав[аи](?!скрипт)/i, "Java"],
  [/джаваскрипт|javascript|\bjs\b/i, "JavaScript"],
  [/тайпскрипт|typescript|\bts\b/i, "TypeScript"],
  [/гоу?лан|\bgolang\b/i, "Go"],
  [/дотнет|\.net|c#|сишарп/i, ".NET"],
  [/пхп|\bphp\b/i, "PHP"],
  [/свифт/i, "Swift"],
  [/котлин/i, "Kotlin"],
  [/нод(а|у|е)?\b|node\.?js/i, "Node.js"],
];

const ROLE_WORDS: [RegExp, string][] = [
  [/front-?end|фронт/i, "Frontend"],
  [/back-?end|бек|бэк/i, "Backend"],
  [/mobile|мобіл|мобил|ios|android|андроїд|андроид/i, "Mobile"],
  [/\bqa\b|тестувальн|тестировщ|тестер/i, "QA"],
  [/devops|девопс/i, "DevOps"],
  [/дизайн|design|ui\/ux|\bux\b/i, "Design"],
  [/data|дата|аналіт|аналит|ml\b|machine learning/i, "Data"],
  [/\bpm\b|product manager|продакт|проджект|project manager/i, "PM"],
  [/рекрут|recruit|\bhr\b/i, "HR"],
  [/маркетол|marketing|маркетинг/i, "Marketing"],
  [/full-?stack|фулстек|фулл?стек/i, "Fullstack"],
];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TECH_RES: [RegExp, string][] = TECH_CATALOG.filter((t) => t.tech.length >= 2).map((t) => [
  new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(t.tech)}($|[^\\p{L}\\p{N}])`, "iu"),
  t.tech,
]);

function findStack(text: string): string[] {
  const found = new Set<string>();
  for (const [re, name] of TECH_RES) if (re.test(text)) found.add(name);
  for (const [re, name] of SYNONYMS) if (re.test(text)) found.add(name);
  for (const [re, name] of ROLE_WORDS) if (re.test(text)) found.add(name);
  return [...found].slice(0, 5);
}

function findRole(text: string): AlphaPortrait["role"] {
  const t = text.toLowerCase();
  const seeking = /((^|\s)я\s+(—\s*)?(розробник|разработчик|програміст|программист|дизайнер|тестувальник|тестировщик|інженер|инженер|devops|qa|pm|аналітик|аналитик|маркетолог|рекрутер)|i'?m an?\s+\w*\s*(developer|engineer|designer)|роботу|работу|\bjob\b|\bwork\b|працевлаштув|трудоустро|хочу працювати|хочу работать|шукаю позиц|ищу позиц|резюме|cv\b)/i.test(t);
  const hiring =
    /(розробника|разработчика|інженера|инженера|дизайнера|тестувальника|тестировщика|спеціаліста|специалиста|людей|кандидат|в команду|в нашу команду|найм|наймаю|наймаем|hire|hiring|потрібен|потрібна|потрібні|нужен|нужна|нужны|шукаємо|ищем)/i.test(
      t,
    );
  if (seeking && !hiring) return "seeking";
  if (hiring && !seeking) return "hiring";
  if (seeking && hiring) return /(роботу|работу|\bjob\b)/i.test(t) ? "seeking" : "hiring";
  return null;
}

function findLevel(text: string): AlphaPortrait["level"] {
  if (/(\blead\b|тімлід|тимлид|техлід|техлид|\bлід\b|\bлид\b|team ?lead)/i.test(text)) return "lead";
  if (/(senior|сеньйор|сеньор|синьор|синиор|сініор|старш\S* рів|старшего уров|досвідчен|опытн)/i.test(text)) return "senior";
  if (/(middle|мідл|мидл|середн\S* рів|среднего уров|средний уров)/i.test(text)) return "middle";
  if (/(junior|джун|трейні|стажер|trainee|intern|без досвіду|без опыта|початків|начинающ)/i.test(text)) return "junior";
  return null;
}

function findFormat(text: string): AlphaPortrait["format"] {
  if (/(гібрид|гибрид|hybrid)/i.test(text)) return "hybrid";
  if (/(remote|віддален|удален|дистанц|з дому|из дома)/i.test(text)) return "remote";
  if (/(офіс|офис|office|on-?site)/i.test(text)) return "office";
  return null;
}

function findMoney(text: string): number | null {
  const m =
    text.match(/(?:\$|usd|дол\w*)\s*(\d[\d\s.,]*)(\s*k|\s*к|\s*тис|\s*тыс)?/i) ??
    text.match(/(\d[\d\s.,]*)(\s*k|\s*к|\s*тис|\s*тыс)?\s*(?:\$|usd|дол)/i);
  if (!m) return null;
  let n = Number((m[1] ?? "").replace(/[\s.,]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (m[2] || n < 30) n *= 1000;
  return n >= 200 && n <= 50000 ? n : null;
}

const DEALBREAKER_WORDS: [RegExp, string][] = [
  [/гембл|gambl|казино|casino|беттінг|беттинг|betting/i, "gambling"],
  [/аутстаф|outstaff|аутсорс|outsourc/i, "outstaff"],
  [/крипт|crypto|блокчейн|blockchain|web3/i, "crypto"],
  [/дзвін|звонк|calls?\b|мітинг|митинг/i, "calls"],
];

function findDealbreakers(text: string): string[] {
  const out = new Set<string>();
  // "без X", "не хочу X", "no X"
  const negZones = text.match(/(без|не хочу|не розглядаю|не рассматриваю|не цікав|не интерес|\bno\b|\bnot\b)[^.,;!?]{0,40}/gi) ?? [];
  for (const zone of negZones) for (const [re, key] of DEALBREAKER_WORDS) if (re.test(zone)) out.add(key);
  return [...out];
}

function findWishes(text: string): string[] {
  return text
    .split(/[.,!?;\n]+|\s+(?:и|і|та|and)\s+(?=(?:чтобы|щоб|що б|so that)(?:\s|$))/i)
    .map((s) => s.trim())
    .filter((s) => !/^(бажано|желательно|preferably|ideally)\s+\S+$/i.test(s))
    .filter((s) => s.length > 6 && /(люблю|хочу|щоб|чтобы|важлив|важно|бажано|желательно|подобається|нравится|prefer|would like|love|\bлюбл)/i.test(s))
    .slice(0, 5);
}

function merge(p: AlphaPortrait, text: string): AlphaPortrait {
  const stack = [...new Set([...p.stack, ...findStack(text)])].slice(0, 6);
  return {
    role: p.role ?? findRole(text),
    stack,
    roleText: p.roleText ?? (text.trim() ? text.trim().slice(0, 120) : null),
    level: p.level ?? findLevel(text),
    format: p.format ?? findFormat(text),
    money: p.money ?? findMoney(text),
    dealbreakers: [...new Set([...p.dealbreakers, ...findDealbreakers(text)])],
    wishes: [...new Set([...p.wishes, ...findWishes(text)])].slice(0, 8),
    notes: [...p.notes, text.trim()].filter(Boolean).slice(-12),
  };
}

// ---------- answering a specific question ----------

function applyAnswer(p: AlphaPortrait, slot: AlphaSlot, message: string): AlphaPortrait {
  const v = message.trim();
  if (v === "__skip") return p;
  switch (slot) {
    case "more":
      return merge(p, v);
    case "role":
      if (v === "seeking" || v === "hiring") return { ...p, role: v };
      return merge(p, v);
    case "stack": {
      const found = findStack(v);
      return { ...merge(p, v), stack: found.length ? [...new Set([...p.stack, ...found])] : [...p.stack, v.slice(0, 40)] };
    }
    case "level":
      if (["junior", "middle", "senior", "lead"].includes(v)) return { ...p, level: v as AlphaPortrait["level"] };
      return { ...merge(p, v), level: findLevel(v) ?? p.level };
    case "money": {
      if (v === "any") return p;
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return { ...p, money: n };
      return { ...merge(p, v), money: findMoney(v) ?? p.money };
    }
    case "dealbreakers": {
      if (v === "none") return p;
      if (["gambling", "outstaff", "crypto", "calls"].includes(v)) return { ...p, dealbreakers: [...new Set([...p.dealbreakers, v])] };
      const found = DEALBREAKER_WORDS.filter(([re]) => re.test(v)).map(([, k]) => k);
      const next = merge(p, v);
      return { ...next, dealbreakers: [...new Set([...next.dealbreakers, ...found])], wishes: found.length ? next.wishes : [...next.wishes, v] };
    }
  }
}

// ---------- questions ----------

const Q: Record<Exclude<AlphaSlot, "more">, (role: AlphaPortrait["role"], l: L) => AlphaQuestion> = {
  role: (_r, l) => ({
    slot: "role",
    text: { uk: "Ви шукаєте роботу чи людей у команду?", en: "Are you looking for a job or for people?", ru: "Вы ищете работу или людей в команду?" }[l],
    options: [
      { label: { uk: "Роботу", en: "A job", ru: "Работу" }[l], value: "seeking" },
      { label: { uk: "Людей", en: "People", ru: "Людей" }[l], value: "hiring" },
    ],
    allowFree: false,
  }),
  stack: (r, l) => ({
    slot: "stack",
    text:
      r === "hiring"
        ? { uk: "Кого шукаєте? Роль або стек.", en: "Who are you looking for? Role or stack.", ru: "Кого ищете? Роль или стек." }[l]
        : { uk: "Ким хочете працювати? Роль або стек.", en: "What do you want to work as? Role or stack.", ru: "Кем хотите работать? Роль или стек." }[l],
    options: ["Frontend", "Backend", "Mobile", "QA", "Design", "DevOps"].map((x) => ({ label: x, value: x })),
    allowFree: true,
  }),
  level: (r, l) => ({
    slot: "level",
    text:
      r === "hiring"
        ? { uk: "Якого рівня людина потрібна?", en: "What level do you need?", ru: "Какого уровня человек нужен?" }[l]
        : { uk: "Який у Вас рівень?", en: "What's your level?", ru: "Какой у Вас уровень?" }[l],
    options: [
      { label: "Junior", value: "junior" },
      { label: "Middle", value: "middle" },
      { label: "Senior", value: "senior" },
      { label: "Lead", value: "lead" },
    ],
    allowFree: false,
  }),
  money: (r, l) => ({
    slot: "money",
    text:
      r === "hiring"
        ? { uk: "Який бюджет на місяць?", en: "Monthly budget?", ru: "Какой бюджет в месяц?" }[l]
        : { uk: "Від якої суми розглядаєте (на місяць)?", en: "Minimum salary you'd consider (per month)?", ru: "От какой суммы рассматриваете (в месяц)?" }[l],
    options: [
      { label: "$1000", value: "1000" },
      { label: "$2000", value: "2000" },
      { label: "$3000", value: "3000" },
      { label: "$4000+", value: "4000" },
      { label: { uk: "Не важливо", en: "Doesn't matter", ru: "Не важно" }[l], value: "any" },
    ],
    allowFree: true,
  }),
  dealbreakers: (r, l) => ({
    slot: "dealbreakers",
    text:
      r === "hiring"
        ? { uk: "Що для кандидата обов'язково? Напишіть будь-що важливе.", en: "What's a must for the candidate? Anything that matters.", ru: "Что для кандидата обязательно? Напишите всё важное." }[l]
        : { uk: "Що точно не для Вас? Або що важливо — пишіть будь-що.", en: "What's a definite no? Or anything that matters to you.", ru: "Что точно не для Вас? Или что важно — пишите что угодно." }[l],
    options:
      r === "hiring"
        ? [
            { label: { uk: "Англійська B2+", en: "English B2+", ru: "Английский B2+" }[l], value: "English B2+" },
            { label: { uk: "Досвід 3+ роки", en: "3+ years", ru: "Опыт 3+ года" }[l], value: "3+ years experience" },
            { label: { uk: "Все ок", en: "All good", ru: "Всё ок" }[l], value: "none" },
          ]
        : [
            { label: { uk: "Гемблінг", en: "Gambling", ru: "Гемблинг" }[l], value: "gambling" },
            { label: { uk: "Аутстаф", en: "Outstaff", ru: "Аутстаф" }[l], value: "outstaff" },
            { label: { uk: "Крипта", en: "Crypto", ru: "Крипта" }[l], value: "crypto" },
            { label: { uk: "Все ок", en: "All good", ru: "Всё ок" }[l], value: "none" },
          ],
    allowFree: true,
  }),
};

function missing(p: AlphaPortrait): Exclude<AlphaSlot, "more">[] {
  const out: Exclude<AlphaSlot, "more">[] = [];
  if (!p.role) out.push("role");
  if (p.stack.length === 0) out.push("stack");
  if (!p.level) out.push("level");
  if (p.money == null) out.push("money");
  if (p.dealbreakers.length === 0 && p.wishes.length === 0) out.push("dealbreakers");
  return out;
}

/** How complete the portrait is, 0..100 (shown as "Alpha розуміє Вас на N%"). */
export function understoodPct(p: AlphaPortrait): number {
  let n = 0;
  if (p.role) n += 20;
  if (p.stack.length || p.roleText) n += 30;
  if (p.level) n += 15;
  if (p.format) n += 10;
  if (p.money != null) n += 10;
  if (p.dealbreakers.length || p.wishes.length) n += 15;
  return Math.min(100, n);
}

/** Did the answer actually fill the slot it was answering? */
function filled(before: AlphaPortrait, after: AlphaPortrait, slot: AlphaSlot, message: string): boolean {
  const v = message.trim();
  if (v === "__skip" || v === "any" || v === "none") return true;
  switch (slot) {
    case "role":
      return Boolean(after.role);
    case "stack":
      return after.stack.length > before.stack.length || Boolean(after.roleText);
    case "level":
      return Boolean(after.level);
    case "money":
      return after.money != null;
    default:
      return true;
  }
}

const REASK: Record<L, string> = {
  uk: "Не зовсім зрозуміла. ",
  en: "Didn't quite get that. ",
  ru: "Не совсем поняла. ",
};

/** Safety net only -- not a product limit. */
const SAFETY_CAP = 10;

export function alphaTurn(req: AlphaTurnRequest): AlphaTurnResponse {
  const l = pick(req.lang);
  const before = req.portrait ?? EMPTY_PORTRAIT;
  const portrait = req.answering ? applyAnswer(before, req.answering, req.message) : merge(before, req.message);

  const asked = [...req.asked];
  if (req.answering) asked.push(req.answering);
  const step = asked.length + 2;

  // 07.10.2026 (Александр: «не ставь хард лимит... если не поняла, пусть
  // задаёт дополнительные»): no fixed number of questions. Answer not
  // understood -> ask the same thing again in other words (once per slot);
  // otherwise go through everything that's still missing.
  let question: AlphaQuestion | null = null;
  if (asked.length < SAFETY_CAP) {
    const timesAsked = (slot: AlphaSlot) => asked.filter((x) => x === slot).length;
    if (req.answering && req.answering !== "more" && !filled(before, portrait, req.answering, req.message) && timesAsked(req.answering) < 2) {
      const q = Q[req.answering](portrait.role, l);
      question = { ...q, text: REASK[l] + q.text };
    } else {
      const next = missing(portrait).find((x) => timesAsked(x) === 0);
      if (next) question = Q[next](portrait.role, l);
    }
  }

  return { portrait, question, step, understood: understoodPct(portrait) };
}

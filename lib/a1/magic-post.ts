// lib/a1/magic-post.ts
//
// Magic Post на сайте (09.10.2026, Александр: «тупо такой же UI, как при
// заполнении профиля»). Та же панель Magic Wand, только чипы публикации и
// ответ posts.magicWand. Слова -- как в приложении (magic_post_texts.dart):
// uk / ru / en, остальные языки получают английский.
// Перенос найденного в форму -- порт magic_post_apply.dart.
import type { MagicWandField, MagicWandLocation, MagicWandPatch } from "@/lib/a1/magic-wand";

export type MagicPostKind = "job-seeking" | "job-employing";

/** Чипы в порядке формы; вопросы кандидатам -- только когда нанимают. */
export function magicPostChips(hiring: boolean): MagicWandField[] {
  return ["title", "content", "category", "location", "salary", "workMode", "workContract", "experience", "skills", ...(hiring ? (["questions"] as MagicWandField[]) : [])];
}

type L3 = { uk: string; ru: string; en: string };
const pick = (lang: string, m: L3) => (lang === "uk" || lang === "ru" ? m[lang] : m.en);

const LABELS: Partial<Record<MagicWandField, L3>> = {
  title: { uk: "Заголовок", ru: "Заголовок", en: "Title" },
  content: { uk: "Опис", ru: "Описание", en: "Description" },
  category: { uk: "Категорія", ru: "Категория", en: "Category" },
  location: { uk: "Локація", ru: "Локация", en: "Location" },
  salary: { uk: "Зарплата", ru: "Зарплата", en: "Salary" },
  workMode: { uk: "Формат", ru: "Формат", en: "Format" },
  workContract: { uk: "Зайнятість", ru: "Занятость", en: "Employment" },
  experience: { uk: "Досвід", ru: "Опыт", en: "Experience" },
  skills: { uk: "Навички", ru: "Навыки", en: "Skills" },
  questions: { uk: "Питання кандидатам", ru: "Вопросы кандидатам", en: "Questions" },
};

export function magicPostLabels(lang: string): Partial<Record<MagicWandField, string>> {
  return Object.fromEntries(Object.entries(LABELS).map(([k, v]) => [k, pick(lang, v!)]));
}

export function magicPostPlaceholder(lang: string, hiring: boolean | null): string {
  if (hiring === true)
    return pick(lang, {
      uk: "Розкажіть про вакансію: кого шукаєте, що робити, вимоги, формат і зарплата.\n\nМи розкладемо все по полях публікації.",
      ru: "Расскажите о вакансии: кого ищете, что делать, требования, формат и зарплата.\n\nМы разложим всё по полям публикации.",
      en: "Tell about the job: who you are looking for, the work, requirements, format and pay.\n\nWe’ll put it all into the right fields of the post.",
    });
  if (hiring === false)
    return pick(lang, {
      uk: "Розкажіть, яку роботу шукаєте: ким працюєте, досвід, навички, формат і бажана зарплата.\n\nМи розкладемо все по полях публікації.",
      ru: "Расскажите, какую работу ищете: кем работаете, опыт, навыки, формат и желаемая зарплата.\n\nМы разложим всё по полям публикации.",
      en: "Tell what job you are looking for: your role, experience, skills, format and the pay you want.\n\nWe’ll put it all into the right fields of the post.",
    });
  return pick(lang, {
    uk: "Розкажіть, що хочете опублікувати.\n\nМи розкладемо все по полях публікації.",
    ru: "Расскажите, что хотите опубликовать.\n\nМы разложим всё по полям публикации.",
    en: "Tell what you want to post.\n\nWe’ll put it all into the right fields of the post.",
  });
}

export const MAGIC_POST_TEXT = {
  question: { uk: "Ви шукаєте роботу чи спеціаліста?", ru: "Вы ищете работу или специалиста?", en: "Are you looking for a job or for a specialist?" },
  seeking: { uk: "Шукаю роботу", ru: "Ищу работу", en: "Looking for a job" },
  hiring: { uk: "Шукаю спеціаліста", ru: "Ищу специалиста", en: "Hiring" },
  filledHint: { uk: "Перевірте поля й опублікуйте.", ru: "Проверьте поля и опубликуйте.", en: "Check the fields and post." },
} satisfies Record<string, L3>;

export function magicPostText(lang: string, key: keyof typeof MAGIC_POST_TEXT): string {
  return pick(lang, MAGIC_POST_TEXT[key]);
}

// ---- «✓»: найденное -> форма ------------------------------------------------

const TITLE_MAX = 120;
const TEXT_MAX = 1500;

/** What the post form should change. Only what the story found is set. */
export type MagicPostFill = {
  title?: string;
  content?: string;
  categoryValue?: number;
  location?: { id: number; label: string };
  salary?: { min: number; max: number; currency: string | null; annual: boolean };
  /** English tag texts of the form's own tag buttons: «Remote», «Full-time», «2»… */
  tagTexts?: string[];
  skills?: string[];
  questions?: string[];
  link?: string;
};

const WORK_MODE_TAG: Record<string, string> = { remote: "Remote", "no-site": "On-site", "on-site": "On-site", office: "On-site", hybrid: "Hybrid" };
const CONTRACT_TAG: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract" };
/** exp-N-yr -> the number the experience tag carries («1 yr. exp.», «2», «3», «4», «5 +»). */
const EXPERIENCE_YEARS: Record<string, string> = { "exp-1-yr": "1", "exp-2-yr": "2", "exp-3-yr": "3", "exp-4-yr": "4", "exp-5-plus": "5" };

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max).trimEnd() : s;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : [];
}

export function magicPostFill(patch: MagicWandPatch, location: MagicWandLocation): MagicPostFill {
  const out: MagicPostFill = {};
  out.title = clip(patch.title, TITLE_MAX);
  out.content = clip(patch.content, TEXT_MAX);
  const cats = patch.categories;
  if (Array.isArray(cats) && typeof cats[0] === "number") out.categoryValue = cats[0];
  if (typeof patch.location === "number" && location) {
    const label = location.displayName || [location.city, location.country].filter(Boolean).join(", ");
    out.location = { id: location._id, label: label || String(location._id) };
  }
  const sal = patch.salary as { min?: unknown; max?: unknown; currency?: unknown; period?: unknown } | undefined;
  if (sal && typeof sal.min === "number" && typeof sal.max === "number") {
    out.salary = {
      min: sal.min,
      max: sal.max,
      currency: typeof sal.currency === "string" && sal.currency ? sal.currency.toLowerCase() : null,
      annual: sal.period === "annually",
    };
  }
  const tags: string[] = [];
  if (typeof patch.workMode === "string" && WORK_MODE_TAG[patch.workMode]) tags.push(WORK_MODE_TAG[patch.workMode]!);
  if (typeof patch.workContract === "string" && CONTRACT_TAG[patch.workContract]) tags.push(CONTRACT_TAG[patch.workContract]!);
  if (typeof patch.experience === "string" && EXPERIENCE_YEARS[patch.experience]) tags.push(`exp:${EXPERIENCE_YEARS[patch.experience]}`);
  if (tags.length) out.tagTexts = tags;
  const skills = strings(patch.skills);
  if (skills.length) out.skills = skills;
  const qs = strings(patch.applyQuestions);
  if (qs.length) out.questions = qs;
  const link = patch.link as { url?: unknown } | undefined;
  if (link && typeof link.url === "string" && link.url) out.link = link.url;
  return out;
}

/** Does a dataset tag text mean [want] («Remote», «Full-time» or «exp:N»)? */
export function tagMatches(text: string, want: string): boolean {
  if (!want.startsWith("exp:")) return text === want;
  const n = want.slice(4);
  const compact = text.replace(/\s+/g, "");
  const m = compact.match(/^(\d+)/);
  return m?.[1] === n;
}

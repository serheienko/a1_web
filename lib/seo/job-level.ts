// lib/seo/job-level.ts
//
// 30.09.2026 (SEO: посадочные «Junior вакансії», «Junior developer jobs in
// the UK»). Уровень вакансии по ЗАГОЛОВКУ: «Senior Backend Engineer»,
// «Junior QA», «Staff Engineer». Текст описания не смотрим сознательно --
// там «senior» встречается в «reporting to a Senior Manager», и страница
// «Junior jobs» наполнилась бы чужим. Заголовок -- единственное место, где
// компания сама называет уровень позиции.
//
// Границы слова заданы вручную: \\b в JS не понимает кириллицу, а для
// латиницы его хватает (заголовки у нас английские или с латинским
// уровнем). Правило в одном файле: правка здесь меняет все страницы сразу.

export type JobLevel = "junior" | "middle" | "senior" | "lead";

export const JOB_LEVELS: JobLevel[] = ["junior", "middle", "senior", "lead"];

const RULES: [JobLevel, RegExp][] = [
  // Порядок важен: «Junior ... to Senior» встречается реже, чем «Senior Lead»,
  // поэтому первым идёт lead/staff, потом senior, потом остальное.
  ["lead", /(^|[^a-z])(lead|staff|principal|head of|architect)([^a-z]|$)/i],
  ["senior", /(^|[^a-z])(senior|sr\.?|старший)([^a-z]|$)/i],
  ["junior", /(^|[^a-z])(junior|jr\.?|intern|internship|trainee|graduate|entry[- ]level|молодший|стажер|стажист)([^a-z]|$)/i],
  ["middle", /(^|[^a-z])(middle|mid|mid-level|intermediate|regular)([^a-z]|$)/i],
];

export function extractLevel(title: string): JobLevel | null {
  for (const [level, rx] of RULES) if (rx.test(title)) return level;
  return null;
}

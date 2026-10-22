// lib/a1/salary-index.ts
//
// 22.10.2026 (Разведчик: «сторінки Зарплати: <роль>, <країна> -- вилка,
// медіана, кількість вакансій»). Кто попадает в какую зарплатную
// выборку. Арифметика -- в lib/a1/salary-stats.ts, тексты -- в
// lib/seo/salary-pages.ts, здесь только отбор.
//
// Своего обхода бэкенда нет -- ровно как у lib/a1/segment-index.ts:
// берём готовый список живых вакансий из lib/a1/facts-index.ts и
// пересчитываем, только когда список обновился (сравнение по ссылке на
// массив). Поэтому страницы живут свежестью ежедневного обхода, а не
// «раз в месяц», как было задумано в идее: раз обход и так ежедневный,
// держать зарплаты месячной давности было бы хуже без всякой выгоды.
//
// ОТКУДА БЕРЁТСЯ СУММА. Сначала поле money у вакансии -- это то, что
// компания заполнила сама. Если его нет, пробуем вытащить сумму из
// текста (lib/seo/salary-from-text.ts) -- тот разбор писался под
// разметку JobPosting и нарочно осторожен: не уверен -- возвращает
// null. На замере 22.10.2026 текст добавил 40 вакансий к 733 -- немного,
// но это 40 честных строк, а не выдумка.
//
// WORLDWIDE НЕ СТРАНА. Вакансии «отовсюду» считаются в общей странице
// роли, но своей страницы «страны» не получают: «Зарплати: QA, Весь
// світ» -- это не ответ на вопрос «сколько платят у нас».

import type { WebPost } from "@/types/web-post";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { extractRoles, JOB_ROLES, type JobRole } from "@/lib/seo/job-role";
import { extractSalaryFromText } from "@/lib/seo/salary-from-text";
import { monthlyAmount, salaryStats, type SalaryPoint, type SalaryStats } from "@/lib/a1/salary-stats";

/** Порог выборки. Тот же, что у остальных сегментов (lib/seo/segments.ts). */
export const MIN_SALARY_POSTS = 10;

export type SalarySegment = {
  stats: SalaryStats;
  /** Вакансии, из которых посчитаны числа, свежие сверху. */
  posts: WebPost[];
};

type Bucket = { points: SalaryPoint[]; posts: WebPost[] };

type SalaryIndex = {
  source: WebPost[];
  /** ключ: «qa» */
  byRole: Map<JobRole, Bucket>;
  /** ключ: «qa/pl» */
  byRoleCountry: Map<string, Bucket>;
};

let cached: SalaryIndex | null = null;

const time = (p: WebPost) => (p.sourcePublishedAt ?? p.publishedAt).getTime();
const byDate = (a: WebPost, b: WebPost) => time(b) - time(a);

function push(map: Map<string, Bucket>, key: string, point: SalaryPoint, post: WebPost) {
  const bucket = map.get(key);
  if (bucket) {
    bucket.points.push(point);
    bucket.posts.push(post);
  } else {
    map.set(key, { points: [point], posts: [post] });
  }
}

/** Сумма вакансии: сначала то, что назвала компания, потом -- текст. */
export function postSalaryPoint(post: WebPost): SalaryPoint | null {
  if (post.salary) {
    return monthlyAmount({
      min: post.salary.min,
      max: post.salary.max,
      currency: post.salary.currency,
      period: post.salary.period,
    });
  }
  const fromText = extractSalaryFromText(post.contentText ?? "");
  if (!fromText) return null;
  return monthlyAmount({
    min: fromText.min,
    max: fromText.max,
    currency: fromText.currency,
    period: fromText.unitText,
  });
}

/** Экспорт -- чтобы проверить отбор на живых данных без запросов к бэкенду. */
export function buildSalaryIndex(posts: WebPost[]): SalaryIndex {
  const byRole = new Map<JobRole, Bucket>();
  const byRoleCountry = new Map<string, Bucket>();

  for (const post of posts) {
    const point = postSalaryPoint(post);
    if (!point) continue;
    const roles = extractRoles(post.title);
    if (roles.length === 0) continue;
    const cc = post.location?.country?.trim().toUpperCase() || "";
    for (const role of roles) {
      push(byRole as Map<string, Bucket>, role, point, post);
      if (cc && cc !== "WW") push(byRoleCountry, `${role}/${cc.toLowerCase()}`, point, post);
    }
  }

  return { source: posts, byRole, byRoleCountry };
}

async function index(): Promise<SalaryIndex> {
  const posts = await allIndexedPosts();
  if (cached && cached.source === posts) return cached;
  cached = buildSalaryIndex(posts);
  return cached;
}

function segment(bucket: Bucket | undefined): SalarySegment | null {
  if (!bucket) return null;
  const stats = salaryStats(bucket.points, MIN_SALARY_POSTS);
  if (!stats) return null;
  return { stats, posts: [...bucket.posts].sort(byDate) };
}

/** Зарплаты по профессии, по всем странам сразу. */
export async function salaryForRole(role: JobRole): Promise<SalarySegment | null> {
  return segment((await index()).byRole.get(role));
}

/** Зарплаты по профессии в одной стране. */
export async function salaryForRoleCountry(role: JobRole, cc: string): Promise<SalarySegment | null> {
  return segment((await index()).byRoleCountry.get(`${role}/${cc.toLowerCase()}`));
}

/** Профессии, у которых хватает данных на свою страницу, крупные сверху. */
export async function salaryRoles(): Promise<{ role: JobRole; stats: SalaryStats }[]> {
  const idx = await index();
  return JOB_ROLES.map((role) => ({ role, stats: salaryStats(idx.byRole.get(role)?.points ?? [], MIN_SALARY_POSTS) }))
    .filter((r): r is { role: JobRole; stats: SalaryStats } => r.stats !== null)
    .sort((a, b) => b.stats.count - a.stats.count);
}

/** Страны, где у этой профессии хватает данных, крупные сверху. */
export async function salaryCountriesForRole(role: JobRole): Promise<{ cc: string; stats: SalaryStats }[]> {
  const idx = await index();
  const out: { cc: string; stats: SalaryStats }[] = [];
  for (const [key, bucket] of idx.byRoleCountry) {
    const [bucketRole, cc] = key.split("/");
    if (bucketRole !== role || !cc) continue;
    const stats = salaryStats(bucket.points, MIN_SALARY_POSTS);
    if (stats) out.push({ cc, stats });
  }
  return out.sort((a, b) => b.stats.count - a.stats.count);
}

/** Все пары «профессия + страна», у которых есть своя страница. */
export async function salaryRoleCountryPairs(): Promise<{ role: JobRole; cc: string; stats: SalaryStats }[]> {
  const idx = await index();
  const out: { role: JobRole; cc: string; stats: SalaryStats }[] = [];
  for (const [key, bucket] of idx.byRoleCountry) {
    const [role, cc] = key.split("/");
    if (!role || !cc) continue;
    const stats = salaryStats(bucket.points, MIN_SALARY_POSTS);
    if (stats) out.push({ role: role as JobRole, cc, stats });
  }
  return out.sort((a, b) => b.stats.count - a.stats.count);
}

// lib/news/live.ts -- живые цифры из нашей базы вакансий для блока "live"
// в новостях про ИИ/ML. Считаем из того же списка, что /stats и блог
// (lib/a1/facts-index.ts, кэш на час), поэтому числа не устаревают.
//
// Правила честности те же, что в stats-index: зарплата только там, где она
// указана в вакансии, в долларах за год; сравнение показываем только если
// ML-вакансий с зарплатой не меньше MIN_SALARY_SAMPLE.

import type { WebPost } from "@/types/web-post";
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { annualUsd, MIN_SALARY_SAMPLE } from "@/lib/a1/stats-index";
import { extractTechTags } from "@/lib/seo/job-tech-tags";
import { worldwideKind } from "@/lib/seo/worldwide-kind";
import type { LiveAi } from "@/components/news/visuals";

const ML_TAGS = new Set(["Machine Learning", "PyTorch", "TensorFlow", "Data Science"]);

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  const mid = (n - 1) / 2;
  return ((s[Math.floor(mid)] ?? 0) + (s[Math.ceil(mid)] ?? 0)) / 2;
}

function isUa(post: WebPost): boolean {
  const cc = post.location?.country?.trim().toUpperCase() || "";
  return cc === "UA" || worldwideKind(post) === "ua";
}

let cached: { source: WebPost[]; data: LiveAi } | null = null;

export async function liveAi(): Promise<LiveAi> {
  const posts = await allIndexedPosts();
  if (cached && cached.source === posts) return cached.data;

  let mlWorld = 0;
  let mlUa = 0;
  const mlSalaries: number[] = [];
  const allSalaries: number[] = [];

  for (const p of posts) {
    const isMl = extractTechTags(p.title, p.contentText).some((t) => ML_TAGS.has(t));
    const usd = annualUsd(p);
    if (usd != null) allSalaries.push(usd);
    if (!isMl) continue;
    if (isUa(p)) mlUa++;
    else mlWorld++;
    if (usd != null) mlSalaries.push(usd);
  }

  const total = posts.length;
  const data: LiveAi = {
    total,
    mlWorld,
    mlUa,
    aiShare: total > 0 ? ((mlWorld + mlUa) / total) * 100 : 0,
    salary:
      mlSalaries.length >= MIN_SALARY_SAMPLE && allSalaries.length >= MIN_SALARY_SAMPLE
        ? { mlMedian: median(mlSalaries), allMedian: median(allSalaries), n: mlSalaries.length }
        : null,
  };
  cached = { source: posts, data };
  return data;
}

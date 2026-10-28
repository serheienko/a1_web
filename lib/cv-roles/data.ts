// lib/cv-roles/data.ts -- цифры для страницы «пример резюме» роли из вакансий A1 (28.10.2026).
import type { WebPost } from "@/types/web-post";
import { techsOfPost } from "@/lib/a1/tech-tags-cache";
import { postsForTech } from "@/lib/a1/tech-index";
import { globalRolePosts } from "@/lib/a1/segment-index";
import type { JobRole } from "@/lib/seo/job-role";
import type { RoleDef } from "@/lib/cv-roles/types";

export type RoleStats = {
  total: number;
  skills: { name: string; pct: number }[];
  salary: { from: number; to: number; n: number } | null;
  recent: WebPost[];
};

const time = (p: WebPost) => (p.sourcePublishedAt ?? p.publishedAt).getTime();

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round(((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2);
}

export async function roleStats(def: RoleDef): Promise<RoleStats> {
  let posts: WebPost[] = [];
  try {
    if (def.source?.kind === "role") posts = (await globalRolePosts(def.source.role as JobRole)) ?? [];
    else if (def.source?.kind === "tech") posts = await postsForTech(def.source.tech);
  } catch {
    posts = [];
  }
  const own = def.source?.kind === "tech" ? def.source.tech : null;
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of techsOfPost(p)) if (t !== own) counts.set(t, (counts.get(t) ?? 0) + 1);
  const total = posts.length;
  const skills = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, c]) => ({ name, pct: total ? Math.round((c / total) * 100) : 0 }))
    .filter((s) => s.pct >= 2);

  // Зарплата: только долларовые вилки в месяц (годовые делим на 12), отсекаем явный мусор.
  const mins: number[] = [];
  const maxs: number[] = [];
  for (const p of posts) {
    const s = p.salary;
    if (!s || s.currency?.toUpperCase() !== "USD") continue;
    const k = s.period === "YEAR" ? 1 / 12 : 1;
    const lo = s.min ?? s.max;
    const hi = s.max ?? s.min;
    if (lo == null || hi == null) continue;
    const a = lo * k;
    const b = hi * k;
    if (a < 200 || b > 40000 || b < a) continue;
    mins.push(a);
    maxs.push(b);
  }
  const salary = mins.length >= 5 ? { from: Math.round(median(mins) / 100) * 100, to: Math.round(median(maxs) / 100) * 100, n: mins.length } : null;
  const recent = [...posts].sort((a, b) => time(b) - time(a)).slice(0, 6);
  return { total, skills, salary, recent };
}

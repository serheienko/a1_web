// lib/interview/stats.ts -- живой блок «Що вимагають роботодавці» на странице вопросов.

import type { WebPost } from "@/types/web-post";
import { techsOfPost } from "@/lib/a1/tech-tags-cache";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import type { InterviewEntry } from "./registry";

export type InterviewTech = { tech: string; label: string; href: string | null; count: number; pct: number };

export type InterviewStats = {
  total: number;
  techs: InterviewTech[];
  /** Самые свежие вакансии профессии. */
  recent: WebPost[];
};

const TOP_TECHS = 12;
const RECENT = 6;

const time = (p: WebPost) => (p.sourcePublishedAt ?? p.publishedAt).getTime();

export function interviewStats(entry: InterviewEntry, posts: WebPost[]): InterviewStats {
  const own = entry.source.kind === "tech" ? entry.source.tech : null;
  const landing = new Map(TECH_LANDINGS.map((t) => [t.tech, t] as const));
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const tech of techsOfPost(p)) {
      if (tech === own) continue;
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }
  const total = posts.length;
  const techs = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TECHS)
    .map(([tech, count]) => {
      const l = landing.get(tech);
      return {
        tech,
        label: l?.label ?? tech,
        href: l ? `/jobs/stack/${l.slug}` : null,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      };
    })
    .filter((t) => t.pct >= 1);
  const recent = [...posts].sort((a, b) => time(b) - time(a)).slice(0, RECENT);
  return { total, techs, recent };
}

/** Ссылка на вакансии технологии из вопроса, если такая посадочная есть. */
export function techJobsHref(tech: string | undefined): string | null {
  if (!tech) return null;
  const l = TECH_LANDINGS.find((t) => t.tech === tech);
  if (l) return `/jobs/stack/${l.slug}`;
  return null;
}

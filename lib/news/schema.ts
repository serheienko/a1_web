// lib/news/schema.ts
//
// 09.10.2026. Агент «Редакція A1» (konkistador/konk_news.py) присылает готовые
// новости на сайт. Этот файл -- ворота: всё, что не проходит схему, на сайт не
// попадает. Агенту разрешён узкий набор блоков (абзац, заголовок, список,
// пометка, цифры); блок «Знайти вакансії» сервер собирает сам из тегов, а
// интерактивные блоки (калькуляторы, сетки) -- только вручную.
//
// Без server-only: схему можно подключать и в тестах.

import { z } from "zod";
import type { NewsArticle } from "./types";
import { slugForTech } from "@/lib/seo/tech-catalog";
import { techLandingHref } from "@/lib/seo/tech-landings";

const slug = z.string().min(5).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const stat = z.object({
  value: z.number().finite(),
  decimals: z.number().int().min(0).max(3).optional(),
  prefix: z.string().max(12).optional(),
  suffix: z.string().max(12).optional(),
  label: z.string().min(2).max(90),
});

const block = z.discriminatedUnion("t", [
  z.object({ t: z.literal("p"), text: z.string().min(20).max(2200) }),
  z.object({ t: z.literal("h2"), text: z.string().min(3).max(120) }),
  z.object({ t: z.literal("ul"), items: z.array(z.string().min(5).max(700)).min(1).max(10) }),
  z.object({ t: z.literal("note"), text: z.string().min(10).max(700) }),
  z.object({ t: z.literal("stats"), items: z.array(stat).min(1).max(4) }),
]);

const httpsUrl = z
  .string()
  .max(500)
  .refine((u) => {
    try {
      const x = new URL(u);
      return x.protocol === "https:";
    } catch {
      return false;
    }
  }, "https url");

export const articleSchema = z.object({
  slug,
  lang: z.enum(["uk", "en"]),
  alt: slug,
  title: z.string().min(10).max(140),
  description: z.string().min(60).max(320),
  h1: z.string().min(10).max(150),
  kicker: z.string().min(2).max(24),
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.array(z.string().min(20).max(320)).length(3),
  tags: z.array(z.string().max(30)).max(5),
  source: z.object({
    name: z.string().min(2).max(80),
    url: httpsUrl,
    title: z.string().min(3).max(200),
    accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  thumb: z.object({
    motif: z.enum(["dots", "bars", "spark", "rings"]),
    hue: z.enum(["blue", "teal", "violet", "amber"]).optional(),
    big: z.string().min(1).max(12),
    small: z.string().min(3).max(90),
  }),
  blocks: z.array(block).min(5).max(30),
  faq: z.array(z.object({ q: z.string().min(8).max(200), a: z.string().min(10).max(600) })).min(2).max(4),
});

export const publishSchema = z.object({
  /** Когда показывать на сайте (ISO). Позже "сейчас" -- новость ждёт своего часа. */
  publishAt: z.string().datetime(),
  uk: articleSchema,
  en: articleSchema,
});

export type PublishBody = z.infer<typeof publishSchema>;

/** Проверки, которые схема не умеет: пара uk/en согласована, теги из нашего словаря. */
export function checkPair(body: PublishBody): string | null {
  const { uk, en } = body;
  if (uk.lang !== "uk" || en.lang !== "en") return "lang";
  if (uk.alt !== en.slug || en.alt !== uk.slug) return "alt";
  if (uk.slug === en.slug) return "slug";
  if (uk.source.url !== en.source.url) return "source";
  if (uk.published !== en.published) return "published";
  return null;
}

/** Оставляет только теги из нашего словаря технологий (по ним строится ссылка на вакансии). */
export function cleanTags(tags: string[]): string[] {
  return [...new Set(tags)].filter((t) => slugForTech(t) !== undefined).slice(0, 5);
}

/** Готовая новость для сайта: блок со ссылками на вакансии добавляет сервер. */
export function toArticle(a: z.infer<typeof articleSchema>): NewsArticle {
  const tags = cleanTags(a.tags);
  // Ссылки -- только на посадочные /jobs/stack/<slug>, которые точно существуют.
  const links = tags
    .map((t) => ({ t, href: techLandingHref(t) }))
    .filter((x): x is { t: string; href: string } => !!x.href)
    .map((x) => ({ href: x.href, label: x.t }));
  const blocks: NewsArticle["blocks"] = [...a.blocks];
  if (links.length) {
    blocks.push({
      t: "links",
      title: a.lang === "uk" ? "Знайти вакансії за темою" : "Find jobs on this topic",
      links: [...links, { href: "/stats", label: "📊 A1 Stats" }],
    });
  }
  return { ...a, tags, blocks, related: [] };
}

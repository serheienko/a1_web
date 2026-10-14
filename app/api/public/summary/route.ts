// app/api/public/summary/route.ts
//
// 14.10.2026: живые цифры для главной a1appp.com (WordPress, mu-plugin a1-home-landing.php забирает их
// раз в 30 минут): сколько вакансий, компаний, стран, новых за сутки, «Хто наймає» за месяц и
// популярные стеки. Только открытые данные, без личных. Кеш в памяти 10 минут.
import { allIndexedPosts } from "@/lib/a1/facts-index";
import { techCounts } from "@/lib/a1/tech-index";
import { currentMonthKey, hiringMonth, monthLabel } from "@/lib/seo/hiring-month";
import { MIN_SEGMENT_POSTS } from "@/lib/seo/segments";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: { at: number; json: string } | null = null;
const TTL_MS = 10 * 60_000;

async function build(): Promise<string> {
  const posts = (await allIndexedPosts()).filter((p) => p.kind === "hiring");
  const companies = new Set<string>();
  const countries = new Set<string>();
  const dayAgo = Date.now() - 86_400_000;
  let today = 0;
  for (const p of posts) {
    if (!p.author.isAnonymous) companies.add((p.author.username ?? p.author.name).toLowerCase());
    const cc = p.location?.country?.trim().toLowerCase();
    if (cc && cc !== "ww") countries.add(cc);
    if ((p.sourcePublishedAt ?? p.publishedAt).getTime() >= dayAgo) today++;
  }
  const key = currentMonthKey();
  const month = await hiringMonth(key).catch(() => null);
  const label = monthLabel(key);
  const techN = await techCounts();
  const stacks = TECH_LANDINGS.map((t) => ({ slug: t.slug, label: t.label, count: techN.get(t.tech) ?? 0 }))
    .filter((t) => t.count >= MIN_SEGMENT_POSTS)
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);
  return JSON.stringify({
    updatedAt: new Date().toISOString(),
    jobs: posts.length,
    companies: companies.size,
    countries: countries.size,
    today,
    month: month
      ? {
          key,
          label: { uk: label.uk, en: label.en },
          total: month.total,
          companies: month.companies,
          top: month.top.slice(0, 6).map((c) => ({ name: c.name, username: c.username, avatarUrl: c.avatarUrl, count: c.count })),
        }
      : null,
    stacks,
  });
}

export async function GET() {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    cache = { at: Date.now(), json: await build() };
  }
  return new Response(cache.json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "noindex",
    },
  });
}

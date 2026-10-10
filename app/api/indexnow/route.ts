// app/api/indexnow/route.ts -- відправка адрес у IndexNow (11.10.2026).
//
//   GET /api/indexnow?mode=new   -- вакансії, опубліковані/змінені за останні ~75 хв
//   GET /api/indexnow?mode=all   -- усі адреси з карти сайту (разова відправка)
//   header: x-revalidate-secret: <A1_REVALIDATE_SECRET> (той самий, що в /api/revalidate)
//
// "new" щогодини викликає instrumentation.ts. "all" -- вручну, один раз.
import { NextRequest, NextResponse } from "next/server";
import sitemap, { generateSitemaps } from "@/app/sitemap";
import { fetchAllSitemapJobPosts } from "@/lib/a1/sitemap-posts";
import { submitUrls } from "@/lib/seo/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://jobs.a1appp.com";
const NEW_WINDOW_MS = 75 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.A1_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode") === "all" ? "all" : "new";
  let urls: string[] = [];

  if (mode === "all") {
    for (const { id } of await generateSitemaps()) {
      const entries = await sitemap({ id });
      urls.push(...entries.map((e) => e.url));
    }
  } else {
    const since = Date.now() - NEW_WINDOW_MS;
    const posts = await fetchAllSitemapJobPosts();
    urls = posts
      .filter((p) => {
        const t = new Date(p.updatedAt ?? p.publishedAt ?? 0).getTime();
        return Number.isFinite(t) && t >= since;
      })
      .map((p) => `${SITE_URL}/jobs/${p.slug}`);
  }

  const result = await submitUrls(urls);
  return NextResponse.json({ mode, found: urls.length, ...result });
}

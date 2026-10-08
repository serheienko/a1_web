import { NextRequest, NextResponse } from "next/server";
import { fetchFeedPage, type FeedFilters } from "@/lib/a1/feed";
import { TECH_CATALOG } from "@/lib/seo/tech-catalog";
import { scorePosts } from "@/lib/alpha/score";
import { alphaEnabled, hasPremium, isSignedIn } from "@/lib/alpha/guard";
import type { AlphaPortrait } from "@/lib/alpha/types";
import type { WebPost } from "@/types/web-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_VISIBLE = 3;
const CATALOG = new Set(TECH_CATALOG.map((t) => t.tech));

export async function POST(req: NextRequest) {
  if (!alphaEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSignedIn(req)) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  let portrait: AlphaPortrait;
  let lang = "uk";
  try {
    const body = await req.json();
    portrait = body.portrait;
    lang = typeof body.lang === "string" ? body.lang : "uk";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!portrait || !Array.isArray(portrait.stack)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Job seekers search vacancies; companies search people's posts.
  const kind = portrait.role === "hiring" ? "seeking" : "hiring";
  const techs = portrait.stack.filter((s) => CATALOG.has(s));
  const filters: FeedFilters = techs.length ? { stack: techs } : portrait.stack[0] ? { q: portrait.stack[0] } : {};

  const posts: WebPost[] = [];
  let cursor: string | null = null;
  try {
    for (let i = 0; i < 3; i++) {
      const page = await fetchFeedPage(kind, cursor, filters);
      posts.push(...page.posts);
      if (!page.hasMore || !page.next) break;
      cursor = page.next;
    }
  } catch (err) {
    console.error("[alpha/search] feed failed", err);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }

  const premium = await hasPremium(req);
  const base = kind === "hiring" ? "/jobs/" : "/talents/";
  const matches = scorePosts(posts, portrait, lang).map((m) => ({ ...m, slug: m.slug ? base + m.slug : "" })).map((m, i) =>
    premium || i < FREE_VISIBLE ? m : { ...m, id: `locked-${i}`, slug: "", reasons: [], salary: null, locked: true },
  );
  return NextResponse.json({ matches, premium, scanned: posts.length });
}

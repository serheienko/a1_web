export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/feed/route.ts — "Load more" endpoint for both feeds. Returns the
// next page of mapped posts plus the next cursor (PLAN.md §2.3 / Phase 1).

import { NextRequest, NextResponse } from "next/server";
import { fetchFeedPage, parseFeedFilters } from "@/lib/a1/feed";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import type { WebPostKind } from "@/types/web-post";

const VALID_KINDS: WebPostKind[] = ["hiring", "seeking"];

export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (!kindParam || !VALID_KINDS.includes(kindParam as WebPostKind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  // Phase 3: "load more" must keep respecting whatever filters the
  // current page has active — the client passes them straight through as
  // the same q/category/tag params the page itself was loaded with.
  const filters = parseFeedFilters(request.nextUrl.searchParams);

  try {
    const page = await fetchFeedPage(kindParam as WebPostKind, cursor, filters);
    // Real per-avatar blur (lib/avatar-blur.ts), same as the initial
    // server-rendered feed — "Load more" posts arrive over this JSON
    // endpoint into components/load-more.tsx (a client component), which
    // can't itself run the server-only sharp() call, so it rides along
    // as an extra field per post rather than living on WebPost itself.
    const avatarBlurs = await Promise.all(page.posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));
    const posts = page.posts.map((post, i) => ({ ...post, avatarBlurDataUrl: avatarBlurs[i] }));
    return NextResponse.json({ ...page, posts });
  } catch (err) {
    console.error("[app/api/feed] fetchFeedPage failed", err);
    return NextResponse.json({ error: "failed to load feed" }, { status: 502 });
  }
}

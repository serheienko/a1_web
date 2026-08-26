export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/feed/route.ts — "Load more" endpoint for both feeds. Returns the
// next page of mapped posts plus the next cursor (PLAN.md §2.3 / Phase 1).

import { NextRequest, NextResponse } from "next/server";
import { fetchFeedPage } from "@/lib/a1/feed";
import type { WebPostKind } from "@/types/web-post";

const VALID_KINDS: WebPostKind[] = ["hiring", "seeking"];

export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (!kindParam || !VALID_KINDS.includes(kindParam as WebPostKind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  try {
    const page = await fetchFeedPage(kindParam as WebPostKind, cursor);
    return NextResponse.json(page);
  } catch (err) {
    console.error("[app/api/feed] fetchFeedPage failed", err);
    return NextResponse.json({ error: "failed to load feed" }, { status: 502 });
  }
}

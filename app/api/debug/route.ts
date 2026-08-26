// app/api/debug/route.ts
//
// TEMPORARY. Proves the API client + auth + mapper work end to end.
// Delete this route at the end of Phase 1 (HANDOFF.md Step 3.6).
//
// Secret-protected: requires ?secret=<A1_DEBUG_SECRET>. If A1_DEBUG_SECRET
// is not set in the environment, the route refuses every request — it does
// NOT fall open. Set A1_DEBUG_SECRET in Vercel to use this.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { call } from "@/lib/a1/client";
import { mapPosts } from "@/lib/a1/mappers";
import type { PostsSearchOutput } from "@/lib/a1/schemas";

export async function GET(request: NextRequest) {
  const configuredSecret = process.env.A1_DEBUG_SECRET;
  const suppliedSecret = request.nextUrl.searchParams.get("secret");

  if (!configuredSecret || suppliedSecret !== configuredSecret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const raw = await call<PostsSearchOutput>("posts.search", { limit: 5 });
    const posts = mapPosts(raw.items);

    return NextResponse.json({
      count: posts.length,
      totalFromApi: raw.items.length,
      titles: posts.map((p) => ({ kind: p.kind, title: p.title, id: p.id })),
    });
  } catch (err) {
    console.error("[app/api/debug] posts.search failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}

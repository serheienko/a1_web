// app/api/debug/route.ts
//
// TEMPORARY. Proves the API client + auth + mapper work end to end.
// Delete this route at the end of Phase 1 (HANDOFF.md Step 3.6).
//
// Secret-protected: requires ?secret=<A1_DEBUG_SECRET>. If A1_DEBUG_SECRET
// is not set in the environment, the route refuses every request — it does
// NOT fall open. Set A1_DEBUG_SECRET in Vercel to use this.
//
// ?raw=1 skips schema validation/mapping and returns the unprocessed
// posts.search response — for diagnosing a real shape mismatch during
// initial bring-up. Remove along with the rest of this file in Phase 1.

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

  const raw_mode = request.nextUrl.searchParams.get("raw") === "1";

  try {
    const raw = await call<unknown>("posts.search", { limit: 5 });

    if (raw_mode) {
      return NextResponse.json({ raw });
    }

    const typed = raw as PostsSearchOutput;
    const posts = mapPosts(typed.items);

    return NextResponse.json({
      count: posts.length,
      totalFromApi: typed.items.length,
      titles: posts.map((p) => ({ kind: p.kind, title: p.title, id: p.id })),
    });
  } catch (err) {
    console.error("[app/api/debug] posts.search failed", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "unknown error",
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 502 },
    );
  }
}

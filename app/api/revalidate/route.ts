// app/api/revalidate/route.ts
//
// Secret-protected webhook (PLAN.md Phase 4 / OPEN QUESTIONS #8): the
// backend calls this on post.new / post.update / post.delete so an edit
// shows up on the feed before the page's own `revalidate = 60` window
// would naturally catch it — and so a post that gets deleted or hidden
// doesn't sit in a stale ISR cache for up to a minute.
//
// The exact webhook payload shape isn't agreed with the backend yet
// (OPEN QUESTIONS #8 is still open) — this accepts a minimal, generic
// shape on purpose so it doesn't need to change once they answer:
//
//   POST /api/revalidate
//   header: x-revalidate-secret: <A1_REVALIDATE_SECRET>
//   body (all optional): { kind?: "hiring" | "seeking", slug?: string }
//
// A bare ping with no body just revalidates both feed roots. Give the
// header value to Andrew once you've put A1_REVALIDATE_SECRET in Vercel —
// pick any long random string yourself; it never needs to come from him,
// and it should never be typed into a file, commit, or chat log, same
// rule as the API key and the service-account password.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.A1_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "A1_REVALIDATE_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { kind?: string; slug?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty or non-JSON body — treat as a bare "something changed" ping.
  }

  const paths = new Set<string>(["/jobs", "/talents"]);
  if (body.slug) {
    const base = body.kind === "seeking" ? "/talents" : "/jobs";
    paths.add(`${base}/${body.slug}`);
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: Array.from(paths) });
}

// app/api/posts/create/route.ts
//
// Phase 7 (PLAN.md §6.6/§6.1): publishes a new vacancy or talent post.
// Same shape as app/api/account/update-profile/route.ts — validate with
// zod, call as the signed-in visitor, forward the backend's own detail
// string on failure rather than inventing one. `input` is exactly
// PostInputSchema (lib/a1/schemas.ts) — no extra mapping layer, per
// PLAN.md §6.5's "the web form's fields are exactly the API's fields."
//
// Response carries the raw created post back to the client mostly so
// the post-editor dialog can close and show a real confirmation, not
// because anything here re-renders it.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PostInputSchema } from "@/lib/a1/schemas";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const CreatePostInput = z.object({ input: PostInputSchema });

export async function POST(request: NextRequest) {
  const parsed = CreatePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.createPost", {
      input: parsed.data.input,
    });
    const response = NextResponse.json({ ok: true, post: data });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/posts/create] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/posts/create] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "create_failed", detail }, { status: 502 });
  }
}

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
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const CreatePostInput = z.object({ input: PostInputSchema });

export async function POST(request: NextRequest) {
  const parsed = CreatePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    // 2026-08-29 round 5: CONFIRMED (PLAN.md §6.24/§6.25) — adding just
    // `categories` as a root-level sibling of `input` made the backend's
    // 400 move from "root is missing required property 'categories'" to
    // "...'content'" on the very next attempt. `categories` sorts before
    // `content` alphabetically among PostInput's required keys — this
    // isn't a coincidence, it's the backend walking its required-property
    // list in order and hitting the next one still missing at the root.
    // Conclusion: `posts.createPost`/`posts.updatePost` validate PostInput
    // at the TOP LEVEL of the request body, not only nested inside
    // `input` — PLAN.md's `{ input }`-only ground truth was wrong (or
    // incomplete) for this endpoint. Spreading every field onto the root
    // fixes all of them at once instead of chasing the alphabet one 400
    // at a time. `input` itself is kept alongside the spread — cheap
    // insurance in case some other part of the contract still reads it
    // from there too.
    // 2026-08-29 round 5 (PLAN.md §6.27): CONFIRMED live — with every
    // required field now present at the root, the backend's next 400 was
    // "root has unknown property 'input'". additionalProperties is false
    // at the root, so keeping `input` alongside the spread (added as
    // defensive belt-and-suspenders in e432b87) actively breaks the call.
    // PostInput belongs ONLY at the root — no wrapper at all.
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.createPost", parsed.data.input);
    const response = NextResponse.json({ ok: true, post: data });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      // The visitor's session cookie is unusable (never existed, or its
      // refresh token was itself rejected by the backend — see
      // lib/a1/visitor-call.ts's callAsVisitor for when that happens) —
      // clear it so a stale cookie does not keep silently failing every
      // later call instead of sending the visitor back to /sign-in.
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/posts/create] failed:", err.httpStatus, err.body.slice(0, 500));
      // 2026-08-29 round 5: a live 400 ("root is missing required
      // property 'categories'") came back even though the client-side
      // canSubmit gate requires a category to be picked. Logging the
      // exact shape we sent (not just the backend's error) so the next
      // occurrence tells us whether categories/object/tags really left
      // this route empty, instead of guessing at the post-editor's
      // client-side logic.
      console.error("[api/posts/create] input was:", {
        object: parsed.data.input.object,
        categories: parsed.data.input.categories,
        tags: parsed.data.input.tags,
        hasLocation: parsed.data.input.location !== null,
        hasMoney: parsed.data.input.money !== null,
      });
    } else {
      console.error("[api/posts/create] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "create_failed", detail }, { status: 502 });
  }
}

// app/api/posts/update/route.ts
//
// Phase 7 CRUD follow-up (Aleksandr, 2026-08-29: "посты должны быть
// CRUD, create / update / delete"). Same `{ id, input }` shape PLAN.md
// §6.1 documents for posts.updatePost — `input` is the SAME
// PostInputSchema as create (the full post body, not a partial patch;
// the backend's own contract is "same PostInput shape" for update, not
// a diff), matching this file's sibling app/api/posts/create/route.ts
// byte-for-byte apart from the method name and the extra `id`.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PostInputSchema } from "@/lib/a1/schemas";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const UpdatePostInput = z.object({
  id: z.string().trim().min(1),
  input: PostInputSchema,
});

export async function POST(request: NextRequest) {
  const parsed = UpdatePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    // 2026-08-29 round 5 (PLAN.md §6.33): CONFIRMED live -- update does
    // NOT mirror create's shape after all. The "same PostInput shape"
    // symmetry assumption above (carried over from create's own root-
    // level fix, PLAN.md §6.24/§6.25/§6.27) was never actually
    // reproduced on this path and turned out to be wrong: the first
    // real edit attempt got "root is missing required property
    // 'input'" -- posts.updatePost wants the NESTED `{ id, input }`
    // shape this route originally had, not create's flattened root.
    // Reverted to the nested call; do not re-apply create's flattening
    // here again without a fresh live 400 proving it's needed.
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.updatePost", {
      id: parsed.data.id,
      input: parsed.data.input,
    });
    // 2026-08-30: same reasoning as app/api/posts/create/route.ts's
    // matching revalidatePath calls -- see that file's comment. A
    // published post being edited is the case that actually needs the
    // feed's cached copy invalidated; a draft edit doesn't show there
    // either way.
    if (!parsed.data.input.draft) {
      revalidatePath("/");
      revalidatePath("/talents");
    }
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
      console.error("[api/posts/update] failed:", err.httpStatus, err.body.slice(0, 500));
      // 2026-08-29 round 5: see app/api/posts/create/route.ts's matching
      // comment — same diagnostic, in case this same "missing categories"
      // 400 shows up on the update path too.
      console.error("[api/posts/update] input was:", {
        object: parsed.data.input.object,
        categories: parsed.data.input.categories,
        tags: parsed.data.input.tags,
        hasLocation: parsed.data.input.location !== null,
        hasMoney: parsed.data.input.money !== null,
      });
    } else {
      console.error("[api/posts/update] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "update_failed", detail }, { status: 502 });
  }
}

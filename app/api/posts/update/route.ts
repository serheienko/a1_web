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
import { z } from "zod";
import { PostInputSchema } from "@/lib/a1/schemas";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";

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
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.updatePost", {
      id: parsed.data.id,
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
      console.error("[api/posts/update] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/posts/update] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "update_failed", detail }, { status: 502 });
  }
}

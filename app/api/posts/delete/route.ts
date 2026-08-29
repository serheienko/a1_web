// app/api/posts/delete/route.ts
//
// Phase 7 CRUD follow-up (Aleksandr, 2026-08-29: "посты должны быть
// CRUD, create / update / delete"). posts.deletePost's response shape
// is undocumented past existence (PLAN.md §6.1: "not yet inspected past
// existence") — this route doesn't try to interpret it, just reports
// ok/not-ok to the "My posts" panel, which removes the row locally on
// success rather than waiting on a body it can't trust the shape of.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const DeletePostInput = z.object({ id: z.string().trim().min(1) });

export async function POST(request: NextRequest) {
  const parsed = DeletePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("posts.deletePost", { id: parsed.data.id });
    const response = NextResponse.json({ ok: true });
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
      console.error("[api/posts/delete] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/posts/delete] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "delete_failed", detail }, { status: 502 });
  }
}

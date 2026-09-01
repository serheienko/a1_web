// app/api/favorites/add/route.ts
//
// 2026-09-01 (Aleksandr: "Зберегти пост ... у нас есть такая история"):
// backend piece for the post-detail page's new "..." menu's "Зберегти
// пост" action. aone-api-private (separate repo) already has a single
// shared favorites system for both posts and users --
// apps/api-server-modern/src/api/v1/favorites/favorites.addFavorites.ts
// — one method, `{ id: <resourceId> }`, that routes to PostService or
// UserService internally based on whether the id parses as a POST_ID or
// a USER_ID prefix. So this same route (and its sibling, remove/
// route.ts) will also be what a future "Saved users" action goes
// through — no separate contacts-style endpoint needed there.
//
// Same request/response contract as app/api/contacts/add/route.ts
// (zod-validated input, callAsVisitor + session refresh, NoSessionError
// -> 401 + clear cookie, A1ApiError -> 502 with detail).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const AddFavoriteInput = z.object({
  id: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = AddFavoriteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { id } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("favorites.addFavorites", { id });
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/favorites/add] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/favorites/add] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "add_failed", detail }, { status: 502 });
  }
}

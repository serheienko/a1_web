// app/api/favorites/remove/route.ts
//
// Sibling of ../add/route.ts — same favorites.deleteFavorites method on
// the same shared posts-or-users favorites system, see that file's own
// comment for the full contract. Only used by "Зберегти пост" so far
// (to un-save), but built id-agnostic from the start since the backend
// method already is.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const RemoveFavoriteInput = z.object({
  id: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = RemoveFavoriteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { id } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("favorites.deleteFavorites", { id });
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
      console.error("[api/favorites/remove] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/favorites/remove] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "remove_failed", detail }, { status: 502 });
  }
}

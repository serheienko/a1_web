// app/api/favorites/list/route.ts
//
// 2026-09-01: initial-toggle-state check for "Зберегти пост"
// (components/post-viewer-menu.tsx), same role app/api/contacts/list/
// route.ts plays for components/add-contact-button.tsx — resolve once
// on mount whether the post is already saved, so a revisit shows
// "Прибрати зі збережених" instead of always starting from "Зберегти"
// (which would silently duplicate-favorite it). Scoped to post ids only
// for now — favorites.addFavorites/deleteFavorites also handle user
// ids (see ../add/route.ts's comment), but there's no "saved users" UI
// yet to need that half.
//
// posts.search({ favorited: true }) is the confirmed way to get this —
// see lib/a1/post-flags.ts's isFavorited() comment for how the backend
// computes it (expandFavoritedBy against the real signed-in visitor,
// unlike the anonymous service-account read every public post fetch
// otherwise uses). Only ids are returned; nothing here renders a saved-
// posts list yet.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parsePost } from "@/lib/a1/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOutput = { items: unknown[] };

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<SearchOutput>("posts.search", {
      favorited: true,
      limit: 100,
    });
    const ids = (data.items ?? [])
      .map((raw) => parsePost(raw))
      .filter((post): post is NonNullable<typeof post> => post !== null)
      .map((post) => post._id);

    const response = NextResponse.json({ ok: true, postIds: ids });
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
      console.error("[api/favorites/list] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/favorites/list] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

// app/api/posts/mine-feed/route.ts
//
// 2026-09-01 (Aleksandr: "Мои публикации это те же самые мои посты из
// нашего профиля" — the new "Мої дописи" tab in components/contacts-
// panel.tsx): full-WebPost counterpart to app/api/posts/mine/route.ts,
// which returns a narrower editor-shaped summary (`summarize()`) plus a
// separate `draftsAndScheduled` array for components/profile-tabs.tsx's
// own draft/scheduled badges — that route's exact response shape has
// existing callers and stays untouched. This one exists purely so the
// avatar-panel's compact "my posts" tab can render with the plain
// components/post-card.tsx, same as app/api/favorites/posts/route.ts
// does for saved posts, rather than reshaping the editor summary
// client-side.
//
// posts.search({author: "me"}) is the same confirmed call app/api/
// posts/mine/route.ts already makes (see that route's own comment) --
// published only here (no drafts:true/scheduled:true passes), since
// mapPosts()/mapPost() already drop anything not live regardless, and
// a compact dropdown preview has no business surfacing an unpublished
// draft the way the dedicated profile tab does.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { mapPosts } from "@/lib/a1/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOutput = { items: unknown[] };

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<SearchOutput>("posts.search", {
      author: "me",
      limit: 100,
    });
    const posts = mapPosts(data.items ?? []);

    const response = NextResponse.json({ ok: true, posts });
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
      console.error("[api/posts/mine-feed] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/posts/mine-feed] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

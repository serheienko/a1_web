// app/api/favorites/posts/route.ts
//
// 2026-09-01 (Aleksandr, screenshot of the account-menu "Контакти" row:
// "Давай сохраненные посты и сохраненных пользователей будем сохранять
// и отображать 2 табами под контактами?"): the full-post counterpart to
// ../list/route.ts, which only ever returns bare postIds (that route's
// own caller, components/post-viewer-menu.tsx, just needs a yes/no
// toggle state and stays untouched here). This one backs the new
// "Збережені пости" tab on /contacts — same posts.search({favorited:
// true}, {expandFavoritedBy}) call, same lib/a1/mappers.ts's mapPosts()
// every feed/profile route already uses, so the tab can render with the
// existing components/post-card.tsx unmodified.
//
// 2026-09-01 (Aleksandr, screen recording of this tab's avatars popping
// in flat gray instead of blurring in "как и все другие аватары"):
// this used to skip avatarBlurDataUrl on purpose (see this file's own
// prior comment above about not being "worth an extra sharp() fetch
// per author for a list that's usually short and visited rarely"),
// degrading to PostCard's generic shimmer fallback. That reads visibly
// different from the real per-avatar blur every other feed has, so
// it's wired up now too, same as app/api/feed/route.ts and app/api/
// posts/mine-feed/route.ts.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { mapPosts } from "@/lib/a1/mappers";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOutput = { items: unknown[] };

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<SearchOutput>("posts.search", {
      favorited: true,
      limit: 100,
    });
    const mapped = mapPosts(data.items ?? []);
    const avatarBlurs = await Promise.all(mapped.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));
    const posts = mapped.map((post, i) => ({ ...post, avatarBlurDataUrl: avatarBlurs[i] }));

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
      console.error("[api/favorites/posts] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/favorites/posts] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

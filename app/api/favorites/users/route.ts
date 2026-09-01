// app/api/favorites/users/route.ts
//
// 2026-09-01 (same request as ../posts/route.ts's header comment) —
// backs the new "Збережені користувачі" tab on /contacts. There is no
// UI yet to actually favorite a user (Aleksandr: "Сохраненных
// пользователей еще сделаем, в профиле будут кнопки, сделаем чуть
// позже") — but the backend's favorites.addFavorites/deleteFavorites
// already routes a USER_ID-prefixed id to UserService today (see
// ../add/route.ts's own header comment), and aone-api-private's
// users.search (services/user-service/methods/search.ts) already
// supports `{favorited: true}` + `{expandFavoritedBy}` exactly like
// posts.search does — confirmed live by reading that source file, not
// guessed. So this route exists and this tab renders now (empty, until
// the save-a-user buttons ship) rather than waiting on that follow-up
// work.
//
// users.search's items carry the same DTO shape as users.getByUsername
// (per app/api/contacts/list/route.ts's own comment on that), so this
// reuses parseUserProfile rather than inventing a new schema, and
// builds the exact same {username, fullName, avatarUrl,
// avatarBlurDataUrl} shape that route already returns per linked
// contact — the /contacts page's "Збережені користувачі" tab renders
// both lists with one shared row component.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOutput = { items: unknown[] };

export type SavedUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
};

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<SearchOutput>("users.search", {
      favorited: true,
      limit: 100,
    });

    const profiles = (data.items ?? [])
      .map((raw) => parseUserProfile(raw))
      .filter((p): p is Extract<NonNullable<typeof p>, { object: "user" }> => p?.object === "user");

    const users: SavedUser[] = await Promise.all(
      profiles.map(async (profile) => {
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
        const avatarUrl = profile.photos[0] ? buildMediaProxyUrl(profile.photos[0]) : null;
        return {
          id: profile._id,
          username: profile.username,
          fullName: fullName || profile.username || "",
          avatarUrl,
          avatarBlurDataUrl: avatarUrl ? await generateAvatarBlurDataUrl(avatarUrl) : null,
        };
      }),
    );

    const response = NextResponse.json({ ok: true, users });
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
      console.error("[api/favorites/users] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/favorites/users] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

// lib/comments/site-comments.ts
//
// Общая обвязка комментариев новостей и событий: кто пишет, существует ли
// страница, как превратить запись склада в то, что рисует PostComments.

if (typeof window !== "undefined") {
  throw new Error("[lib/comments/site-comments] imported from the browser — server-only");
}

import { NextResponse } from "next/server";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, type SessionState } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";
import { allNews } from "@/lib/news/registry";
import { loadEvents } from "@/lib/events/store";
import { parseKey, type SiteKind, type StoredComment } from "./site-store";

export type Who = { userId: string; name: string; username: string | null; avatarUrl: string | null };

/** Кто пишет: тем же способом, что и /api/account/whoami. Бросает NoSessionError. */
export async function identify(): Promise<{ who: Who; refreshed: SessionState | null }> {
  // Только для проверки на своей машине (в проде env не читается).
  if (process.env.NODE_ENV !== "production" && process.env.SITE_COMMENTS_TEST_USER) {
    const [userId, name] = process.env.SITE_COMMENTS_TEST_USER.split("|");
    return { who: { userId: userId || "u1", name: name || "Test", username: null, avatarUrl: null }, refreshed: null };
  }
  const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
  const profile = parseUserProfile(data);
  if (!profile || profile.object !== "user") throw new NoSessionError();
  const photo = profile.photos[0];
  const username = profile.username ?? null;
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || username || "A1";
  return {
    who: { userId: profile._id, name, username, avatarUrl: photo ? buildMediaProxyUrl(photo) : null },
    refreshed: refreshedSession ?? null,
  };
}

export async function pageExists(kind: SiteKind, slug: string): Promise<boolean> {
  try {
    if (kind === "news") return (await allNews()).some((a) => a.slug === slug);
    return (await loadEvents()).some((e) => e.slug === slug);
  } catch {
    return false;
  }
}

export function keyOf(postId: unknown): { kind: SiteKind; slug: string } | null {
  return typeof postId === "string" ? parseKey(postId) : null;
}

/** Запись склада -> форма, которую рисует PostComments (даты -- строками, клиент превратит). */
export function toWire(c: StoredComment) {
  const grouped = new Map<string, { userId: string; date: string; name: string; avatarUrl: string | null }[]>();
  for (const r of c.reactions) {
    const bucket = grouped.get(r.emoticon) ?? [];
    bucket.push({ userId: r.userId, date: r.date, name: r.name, avatarUrl: r.avatarUrl });
    grouped.set(r.emoticon, bucket);
  }
  const hasText = c.text.trim() !== "";
  return {
    id: String(c.id),
    authorName: c.authorName || "A1",
    authorUsername: c.authorUsername,
    authorAvatarUrl: c.authorAvatarUrl,
    authorId: c.authorId,
    text: c.text,
    mediaOnly: !hasText && c.media.length > 0,
    media: c.media,
    createdAt: c.createdAt,
    editedAt: c.editedAt,
    replyToId: c.replyToId ? String(c.replyToId) : null,
    reactions: [...grouped.entries()].map(([emoticon, by]) => ({ emoticon, by })),
  };
}

export function failure(message: string, status: number, refreshed?: SessionState | null) {
  const res = NextResponse.json({ ok: false, message }, { status });
  if (refreshed) setSession(res, refreshed);
  return res;
}

export function success(body: Record<string, unknown>, refreshed?: SessionState | null) {
  const res = NextResponse.json({ ok: true, ...body });
  if (refreshed) setSession(res, refreshed);
  return res;
}

export function authFailure(err: unknown) {
  if (err instanceof NoSessionError) {
    const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(res);
    return res;
  }
  console.error("[api/site-comments] unexpected error:", err);
  return NextResponse.json({ ok: false, message: "failed" }, { status: 502 });
}

// Не чаще одного комментария в 3 секунды от одного человека.
const lastSent = new Map<string, number>();
export function tooFast(userId: string): boolean {
  const now = Date.now();
  const prev = lastSent.get(userId) ?? 0;
  if (now - prev < 3000) return true;
  lastSent.set(userId, now);
  if (lastSent.size > 5000) lastSent.clear();
  return false;
}

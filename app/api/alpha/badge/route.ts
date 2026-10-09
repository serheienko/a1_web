// app/api/alpha/badge/route.ts
//
// 09.10.2026 (Александр: «ты только сделал альфу, а другие функции, там,
// бегущую строку…»): the Alpha can on the site works like in the app.
//   GET  ?username=x  -> { title }  the member's own running line (profileTitle),
//                                   shown when someone taps their can.
//   POST { emojiId? , title? }      the signed-in member changes their can
//                                   (1..25 cans, 26..50 fishes) or running line.
// Saved the same way as the app: account.updateProfile with
// emojiStatus {object:"emoji-status", fileId} / profileTitle.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError, call } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { clearSession, setSession } from "@/lib/a1/session";
import { alphaEnabled } from "@/lib/alpha/guard";
import { ALPHA_TITLE_MAX, alphaTitleHasLink } from "@/lib/alpha/member";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const titleCache = new Map<string, { at: number; title: string | null }>();

function titleText(raw: unknown): string | null {
  if (typeof raw === "string") return raw.trim() || null;
  if (raw && typeof raw === "object" && "text" in raw) {
    const t = (raw as { text?: unknown }).text;
    return typeof t === "string" && t.trim() ? t.trim() : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim().replace(/^@/, "");
  if (!username || username.length > 64) return NextResponse.json({ title: null });
  const hit = titleCache.get(username);
  if (hit && Date.now() - hit.at < 60_000) return NextResponse.json({ title: hit.title });
  let title: string | null = null;
  try {
    const user = await call<{ profileTitle?: unknown }>("users.getByUsername", { username }, { timeoutMs: 6000 });
    title = titleText(user?.profileTitle);
  } catch {
    title = null;
  }
  titleCache.set(username, { at: Date.now(), title });
  if (titleCache.size > 1000) titleCache.delete(titleCache.keys().next().value as string);
  return NextResponse.json({ title }, { headers: { "cache-control": "no-store" } });
}

const Input = z
  .object({
    emojiId: z.number().int().min(1).max(50).optional(),
    title: z.string().max(ALPHA_TITLE_MAX * 2).nullable().optional(),
  })
  .refine((v) => v.emojiId !== undefined || v.title !== undefined);

export async function POST(req: NextRequest) {
  if (!alphaEnabled()) return NextResponse.json({ ok: false, message: "disabled" }, { status: 404 });
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const { emojiId, title } = parsed.data;

  const body: Record<string, unknown> = {};
  if (emojiId !== undefined) body.emojiStatus = { object: "emoji-status", fileId: String(emojiId) };
  if (title !== undefined) {
    const clean = (title ?? "").trim();
    if (clean.length > ALPHA_TITLE_MAX) return NextResponse.json({ ok: false, message: "too_long" }, { status: 400 });
    if (alphaTitleHasLink(clean)) return NextResponse.json({ ok: false, message: "no_links" }, { status: 400 });
    body.profileTitle = clean ? { object: "profile-title", text: clean } : { object: "empty" };
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<{ username?: string | null }>("account.updateProfile", body);
    if (data?.username && title !== undefined) titleCache.delete(data.username);
    const res = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    if (err instanceof A1ApiError) console.error("[api/alpha/badge] failed:", err.httpStatus, err.body.slice(0, 300));
    else console.error("[api/alpha/badge] unexpected:", err);
    return NextResponse.json({ ok: false, message: "save_failed" }, { status: 502 });
  }
}

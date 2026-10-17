// app/api/referral/route.ts
//
// 17.10.2026 (Александр). Реферальная программа «Отримай Alpha».
//   GET  -> мой код и ссылка, прогресс по лестнице, список приглашённых.
//           Заодно: если меня сам кто-то пригласил и мой профиль уже заполнен -- помечаем меня «живым».
//   POST {code} -> «меня пригласили»: запоминает, кто пригласил (первый пригласивший остаётся навсегда).
//
// Профиль читаем так же, как /api/first250: пустой account.updateProfile({}).
// Награда -- месяцы Alpha, они копятся в списке (monthsEarned); даты «Alpha до …» выставим, когда Alpha запустится.

import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession, type SessionState } from "@/lib/a1/session";
import { parseUserProfile, type UserProfile } from "@/lib/a1/schemas";
import { isComplete, profileChecks } from "@/lib/first250/profile-check";
import { FRIEND_DAYS, HOLD_HOURS, LADDER, MAX_MONTHS, progressOf } from "@/lib/referral/ladder";
import { claimInvite, countsOf, ensureCode, inviteOf, invitesBy, markLive, rowsOf } from "@/lib/referral/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobs.a1appp.com").replace(/\/+$/, "");

async function loadProfile(): Promise<{ profile: UserProfile | null; refreshed: SessionState | null }> {
  if (!(await readSession())) return { profile: null, refreshed: null };
  const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
  const p = parseUserProfile(data);
  if (!p || p.object !== "user") throw new Error("profile_unreadable");
  return { profile: p, refreshed: refreshedSession };
}

function nameOf(p: UserProfile): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.username || "";
}

function fail(err: unknown, where: string) {
  if (err instanceof NoSessionError) {
    const r = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(r);
    return r;
  }
  if (err instanceof A1ApiError) console.error(`[api/referral] ${where}:`, err.httpStatus, err.body.slice(0, 300));
  else console.error(`[api/referral] ${where}:`, err);
  return NextResponse.json({ ok: false, message: "failed" }, { status: 502 });
}

export async function GET(req: Request) {
  const summary = new URL(req.url).searchParams.get("summary") === "1";
  try {
    const { profile, refreshed } = await loadProfile();
    const withSession = (body: unknown, status = 200) => {
      const r = NextResponse.json(body, { status });
      if (refreshed) setSession(r, refreshed);
      return r;
    };
    if (!profile) return withSession({ ok: false, message: "not_signed_in" }, 401);
    if (profile.external || profile.unclaimed) return withSession({ ok: false, message: "not_eligible" }, 403);

    // Меня пригласили, и профиль заполнен -- засчитываем как «живого» друга.
    const mine = await inviteOf(profile._id);
    if (mine && mine.status !== "live" && isComplete(profileChecks(profile))) await markLive(profile._id);

    // summary=1 -- лёгкий запрос для меню «⋯»: код не создаём, пока человек сам не открыл экран.
    const [code, list] = await Promise.all([summary ? Promise.resolve(null) : ensureCode(profile._id), invitesBy(profile._id)]);
    const progress = progressOf(countsOf(list));
    return withSession({
      ok: true,
      code,
      link: code ? `${SITE}/?ref=${code}` : null,
      ladder: LADDER,
      friendDays: FRIEND_DAYS,
      holdHours: HOLD_HOURS,
      maxMonths: MAX_MONTHS,
      progress,
      invited: rowsOf(list),
      invitedBy: mine ? { counted: true } : null,
    });
  } catch (err) {
    return fail(err, "GET");
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { code?: unknown };
    const { profile, refreshed } = await loadProfile();
    const withSession = (b: unknown, status = 200) => {
      const r = NextResponse.json(b, { status });
      if (refreshed) setSession(r, refreshed);
      return r;
    };
    if (!profile) return withSession({ ok: false, message: "not_signed_in" }, 401);
    if (profile.external || profile.unclaimed) return withSession({ ok: false, message: "not_eligible" }, 403);
    const res = await claimInvite(profile._id, String(body.code ?? ""), nameOf(profile));
    if (res === "bad_code") return withSession({ ok: false, message: "bad_code" }, 400);
    if (res === "self" || res === "mutual" || res === "limit") return withSession({ ok: false, message: res }, 400);
    return withSession({ ok: true, already: res === "already" });
  } catch (err) {
    return fail(err, "POST");
  }
}

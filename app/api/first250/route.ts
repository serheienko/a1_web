// app/api/first250/route.ts
//
// 14.10.2026 (Александр). Акция «Перші 250» -- страница app/first250.
//   GET  -> сколько мест занято/осталось и, если человек вошёл: его галочки профиля и место (если уже записан)
//   POST -> «Забрати місце»: проверяем профиль по данным бэкенда и записываем (lib/first250/store.ts)
//
// Профиль читаем тем же «пустым» account.updateProfile({}), что и /api/account/whoami: ничего не
// меняет, бэкенд просто возвращает текущего пользователя. Подделать галочки с телефона нельзя --
// их считает сервер.

import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession, type SessionState } from "@/lib/a1/session";
import { parseUserProfile, type UserProfile } from "@/lib/a1/schemas";
import { profileChecks, isComplete, type ProfileChecks } from "@/lib/first250/profile-check";
import { addEntry, placeOf, takenCount, totalSeats } from "@/lib/first250/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Me = { signedIn: false } | { signedIn: true; name: string; checks: ProfileChecks; complete: boolean; place: number | null };

async function loadMe(): Promise<{ me: Me; profile: UserProfile | null; refreshed: SessionState | null }> {
  if (!(await readSession())) return { me: { signedIn: false }, profile: null, refreshed: null };
  const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
  const p = parseUserProfile(data);
  if (!p || p.object !== "user") throw new Error("profile_unreadable");
  const checks = profileChecks(p);
  const place = await placeOf(p._id);
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.username || "";
  return { me: { signedIn: true, name, checks, complete: isComplete(checks), place }, profile: p, refreshed: refreshedSession };
}

function fail(err: unknown, where: string) {
  if (err instanceof NoSessionError) {
    const r = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(r);
    return r;
  }
  if (err instanceof A1ApiError) console.error(`[api/first250] ${where}:`, err.httpStatus, err.body.slice(0, 300));
  else console.error(`[api/first250] ${where}:`, err);
  return NextResponse.json({ ok: false, message: "failed" }, { status: 502 });
}

export async function GET() {
  try {
    const [{ me, refreshed }, taken] = await Promise.all([loadMe(), takenCount()]);
    const total = totalSeats();
    const r = NextResponse.json({ ok: true, total, taken: Math.min(taken, total), left: Math.max(0, total - taken), me });
    if (refreshed) setSession(r, refreshed);
    return r;
  } catch (err) {
    return fail(err, "GET");
  }
}

export async function POST() {
  try {
    const { me, profile, refreshed } = await loadMe();
    const withSession = (body: unknown, status = 200) => {
      const r = NextResponse.json(body, { status });
      if (refreshed) setSession(r, refreshed);
      return r;
    };
    if (!me.signedIn || !profile) return withSession({ ok: false, message: "not_signed_in" }, 401);
    // Технические аккаунты компаний (Конкистадор/DOU) -- не люди, место им не положено.
    if (profile.external || profile.unclaimed) return withSession({ ok: false, message: "not_eligible" }, 403);
    if (me.place) return withSession({ ok: true, place: me.place, already: true });
    if (!me.complete) return withSession({ ok: false, message: "profile_incomplete", checks: me.checks }, 400);

    const total = totalSeats();
    if ((await takenCount()) >= total) return withSession({ ok: false, message: "sold_out" }, 409);

    const session = await readSession();
    await addEntry({
      v: 1,
      userId: profile._id,
      email: (profile.email ?? session?.email ?? "").trim(),
      username: profile.username,
      name: me.name,
      claimedAt: new Date().toISOString(),
    });
    const place = await placeOf(profile._id);
    if (!place) return withSession({ ok: false, message: "failed" }, 502);
    return withSession({ ok: true, place, already: false, late: place > total });
  } catch (err) {
    return fail(err, "POST");
  }
}

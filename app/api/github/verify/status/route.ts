// app/api/github/verify/status/route.ts
//
// 18.10.2026: подтверждённый GitHub текущего пользователя -- свежий, без кеша. Страница профиля
// кешируется на 10 минут, а сразу после подтверждения человек должен увидеть результат.
import { NextResponse } from "next/server";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { clearSession, setSession } from "@/lib/a1/session";
import { parseUserProfile } from "@/lib/a1/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateProfile", {});
    const profile = parseUserProfile(data);
    const login = profile?.object === "user" ? (profile.githubVerifiedLogin ?? null) : null;
    const response = NextResponse.json({ ok: true, login }, { headers: { "cache-control": "no-store" } });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false }, { status: 401 });
      clearSession(response);
      return response;
    }
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

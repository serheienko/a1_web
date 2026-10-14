// app/api/claim/confirm/route.ts
//
// 2026-09-11: final step of a company account claim. The short code from the
// email plus a password of the company's choosing go to `auth.claimConfirm`;
// the backend moves the account onto the verified address and answers with a
// session, which this route stores in the visitor's cookies exactly the way
// app/api/auth/sign-in does. The company therefore lands inside its own
// profile instead of on a login screen it has no reason to trust yet.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { setSession } from "@/lib/a1/session";
import { reasonFromError } from "@/lib/a1/claim-errors";

export const runtime = "nodejs";

const Input = z.object({
  otpKey: z.string().trim().min(1),
  code: z.string().trim().min(1),
  // Only used for the display cookie — the backend takes the address from the
  // one-time code it just consumed, never from the browser.
  email: z.string().trim().email(),
  password: z.string().min(8),
});

type ClaimConfirmResponse = {
  userId: string;
  expiresAt: number;
  accessToken: string;
  refreshToken: string;
};

// 14.10.2026 (проверка безопасности клейма по GPT-аудиту). Код на почту -- 4 цифры, живёт 10 минут,
// а бэкенд до сих пор не считал неверные попытки: перебор 10 000 вариантов за 10 минут забирал
// чужой профиль компании. Пока правка в бэкенде не выкачена, режем перебор здесь: не больше
// 5 неверных попыток на один код и 30 попыток в час с одного адреса. Это защищает путь через сайт;
// прямой вызов API закрывает правка бэкенда (лимит попыток в OtpChallengeService.markAsUsed).
const MAX_WRONG_PER_KEY = 5;
const MAX_PER_IP_HOUR = 30;
const wrongByKey = new Map<string, { n: number; since: number }>();
const byIp = new Map<string, { n: number; since: number }>();

function bump(map: Map<string, { n: number; since: number }>, id: string, windowMs: number): number {
  const now = Date.now();
  const rec = map.get(id);
  if (!rec || now - rec.since > windowMs) {
    map.set(id, { n: 1, since: now });
    return 1;
  }
  rec.n += 1;
  return rec.n;
}

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }
  const { otpKey, code, email, password } = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (bump(byIp, ip, 3_600_000) > MAX_PER_IP_HOUR || (wrongByKey.get(otpKey)?.n ?? 0) >= MAX_WRONG_PER_KEY) {
    return NextResponse.json({ ok: false, reason: "too_many_attempts" }, { status: 429 });
  }

  try {
    const data = await call<ClaimConfirmResponse>(
      "auth.claimConfirm",
      { otp: { key: otpKey, code }, newPassword: password },
      { skipAuth: true },
    );

    const response = NextResponse.json({ ok: true });
    setSession(response, {
      userId: data.userId,
      email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt * 1000,
    });
    return response;
  } catch (err) {
    bump(wrongByKey, otpKey, 3_600_000);
    const known = reasonFromError(err);
    // A wrong or expired short code is the everyday failure here and the
    // backend has no dedicated code for it, so anything unrecognised at this
    // step reads as "wrong code" rather than a scary generic error.
    const reason = known === "unknown" ? "wrong_code" : known;
    if (err instanceof A1ApiError) {
      console.error("[api/claim/confirm] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/claim/confirm] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, reason }, { status: 409 });
  }
}

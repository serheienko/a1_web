// app/api/users/mute/route.ts
//
// Александр, 17.09.2026: «Это обычный mute уведомлений.»
//
// Отдельного метода «заглушить человека» в API нет -- есть общий
// account.updateNotifySettings(peer, settings), тот же, которым
// приложение глушит чаты. Для профиля peer = {object:"peer-user"}.
//
// Что значит «заглушить». Бэкенд хранит четыре поля сразу (все
// обязательные): silent, hidePreviews, sound, muteUntil. Телеграмовское
// «выключить навсегда» -- это silent + звук none + срок молчания далеко
// в будущем; снять -- ровно обратное. Отдельного resetNotifySettings
// здесь не зовём: он сбрасывает настройки шире, чем один человек.
//
// muteUntil -- в СЕКУНДАХ (общее правило этого API, не миллисекунды).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({
  userId: z.string().trim().min(1),
  mute: z.boolean(),
});

/** Десять лет вперёд -- «навсегда» в терминах поля muteUntil. */
const MUTE_FOREVER_SECONDS = 10 * 365 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { userId, mute } = parsed.data;

  const settings = mute
    ? {
        silent: true,
        hidePreviews: false,
        sound: { object: "notification-sound-none" },
        muteUntil: Math.floor(Date.now() / 1000) + MUTE_FOREVER_SECONDS,
      }
    : {
        silent: false,
        hidePreviews: false,
        sound: { object: "notification-sound-default" },
        muteUntil: null,
      };

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("account.updateNotifySettings", {
      peer: { object: "peer-user", user: userId },
      settings,
    });

    if (data === false) {
      return NextResponse.json({ ok: false, message: "rejected" }, { status: 409 });
    }

    const response = NextResponse.json({ ok: true, muted: mute });
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
      console.error("[api/users/mute] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/users/mute] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "mute_failed", detail }, { status: 502 });
  }
}

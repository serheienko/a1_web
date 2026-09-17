// app/api/push/register/route.ts
//
// Регистрация браузера как устройства для пуш-уведомлений.
// Александр, 17.09.2026: «мы обсуждали, но не сделали уведомления на
// десктопе, давай сделаем».
//
// Метод тот же, которым регистрируется приложение -- initConnection
// (в схеме API: «Register a new device for the current user»). Поля и
// их обязательность взяты оттуда же: appId, appVersion, deviceModel,
// devicePlatform, deviceLanguage, systemVersion обязательны, deviceToken
// -- нет (но ради него всё и затевается). devicePlatform принимает
// ровно четыре значения: ios | android | web | unknown -- берём "web".
//
// appId: 1 -- ровно то же число, что шлёт приложение
// (lib/core/utils/services/fcm_services.dart в aone_private).
//
// Вызывается ОТ ИМЕНИ ВОШЕДШЕГО -- устройство привязывается к человеку,
// а не к сервисному аккаунту, поэтому callAsVisitor, а не call.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

/** Наш идентификатор приложения на бэкенде -- один на все платформы. */
const APP_ID = 1;

/** Версия веба. Отдельной нумерации у сайта нет -- держим ровно ту же
 *  строку, что считается свежей в lib/app-version.ts, чтобы бэкенд не
 *  принял браузер за древний клиент. */
const WEB_APP_VERSION = "1.0.0";

const Input = z.object({
  deviceToken: z.string().trim().min(1).max(4096),
  deviceModel: z.string().trim().min(1).max(120).default("Browser"),
  deviceLanguage: z.string().trim().length(2).default("en"),
  systemVersion: z.string().trim().min(1).max(120).default("web"),
});

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { deviceToken, deviceModel, deviceLanguage, systemVersion } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("initConnection", {
      appId: APP_ID,
      appVersion: WEB_APP_VERSION,
      deviceModel,
      devicePlatform: "web",
      deviceLanguage: deviceLanguage.toLowerCase(),
      deviceToken,
      systemVersion,
    });

    if (data === false) {
      return NextResponse.json({ ok: false, message: "rejected" }, { status: 409 });
    }

    const response = NextResponse.json({ ok: true });
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
      console.error("[api/push/register] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/push/register] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "register_failed", detail }, { status: 502 });
  }
}

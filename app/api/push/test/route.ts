// app/api/push/test/route.ts
//
// Тестовый пуш самому себе -- метод testPush («Send test push
// notification for the current user and all devices»).
//
// Зачем он здесь: сразу после того, как человек включил уведомления в
// браузере, мы отправляем один тестовый пуш. Человек видит своими
// глазами, что это работает, а мы -- что цепочка «браузер -> FCM ->
// бэкенд -> обратно в браузер» собрана целиком. Никакой другой роли у
// этой ручки нет, вручную её не дёргают.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { refreshedSession } = await callAsVisitor<unknown>("testPush", {
      type: "CHAT_MESSAGE",
    });
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/push/test] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/push/test] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "test_failed" }, { status: 502 });
  }
}

// app/api/account/delete/route.ts
//
// 2026-09-13 (Александр: "В редактировании профиля надо добавить
// возможность его удалить в самом низу").
//
// Безвозвратный шаг, и это надо понимать буквально. account.delete на
// бэкенде (aone-api-private, apps/api-server-modern/src/services/
// user-service/methods/deleteUser.ts, прочитано, а не предположено):
// ставит признак DELETED, ПЕРЕИМЕНОВЫВАЕТ ник и почту в служебные
// (deleted-<id>-<время>), обрывает все сессии и все токены. Войти
// обратно под своей почтой уже нельзя -- её у аккаунта больше нет.
// Поэтому в редакторе этот пункт спрятан за вторым подтверждением, а
// первым делом человеку предлагается просто спрятать профиль
// (/api/account/visibility).
//
// Осторожно при чтении кода приложения: там ЭТОТ ЖЕ адрес назван
// «deactivate» (lib/core/constants/api_constants.dart), хотя ничего
// временного он не делает.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await callAsVisitor("account.delete", {});
    // Сессия на сервере уже убита самим методом; здесь снимаем куки,
    // чтобы браузер не остался с видимостью входа.
    const response = NextResponse.json({ ok: true });
    clearSession(response);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/account/delete] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/account/delete] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "delete_failed" }, { status: 502 });
  }
}

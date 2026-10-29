export const runtime = "nodejs";

// app/api/app-version/route.ts
//
// Что приложению считать «пора обновиться»: две версии на платформу
// плюс строка «что нового». Правила и вся мотивировка -- в
// lib/app-version.ts.
//
// Открытый маршрут без авторизации и намеренно: его зовут ДО входа, на
// самом старте приложения, и он не отдаёт ничего, чего нет в магазине.
//
// Кешируется на минуту на краю сети: обновление правила должно доезжать
// до людей быстро, но и долбить наш сервер на каждый запуск приложения
// незачем. `?platform=ios|android` -- необязательный, приложению удобнее
// получить свой кусок, а не разбирать общий.

import { NextRequest, NextResponse } from "next/server";
import { MAC_UPDATE, resolvedConfig } from "@/lib/app-version";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform");
  // 29.10.2026: Mac -- по номеру сборки, архив с нашего сайта (lib/app-version.ts).
  if (platform === "macos") {
    return NextResponse.json(
      { ok: true, platform, minimum: "1.0.0", recommended: "1.0.0", storeUrl: "", ...MAC_UPDATE },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600" } },
    );
  }
  const config = await resolvedConfig();
  const body =
    platform === "ios" || platform === "android"
      ? { ok: true, platform, ...config[platform] }
      : { ok: true, ...config };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
    },
  });
}

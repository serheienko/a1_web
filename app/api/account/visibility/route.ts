// app/api/account/visibility/route.ts
//
// 2026-09-13 (Александр: "В редактировании профиля надо добавить
// возможность его удалить в самом низу. Это надо сделать умно с
// начальным предложением просто деактивировать, не удаляя").
//
// Это «деактивировать»: профиль перестаёт находиться в поиске и в
// списках, которые на нём построены, но сам никуда не девается --
// открыть его по прямой ссылке можно, переписки и дописи на месте.
// Включается обратно той же кнопкой, поэтому шаг безопасный, в отличие
// от соседнего /api/account/delete.
//
// На бэкенде это один признак пользователя (HIDDEN_FROM_SEARCH), и
// выставляется он обычным account.updateProfile -- отдельного метода
// нет. До 2026-09-13 его вообще нельзя было выставить ниоткуда: признак
// читался поиском, но ни один метод его не писал. Добавлено ветка
// feat/hide-profile-from-search в aone-api-private; пока она не
// выкачена, этот маршрут будет отвечать ошибкой, и окно в редакторе
// честно скажет об этом.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({ hidden: z.boolean() });

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { refreshedSession } = await callAsVisitor("account.updateProfile", {
      hiddenFromSearch: parsed.data.hidden,
    });
    const response = NextResponse.json({ ok: true, hidden: parsed.data.hidden });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/account/visibility] failed:", err.httpStatus, err.body.slice(0, 500));
      // Бэкенд ещё не знает про это поле -- значит обновление сервера
      // не выкачено. Отдельный код, чтобы окно сказало об этом прямо, а
      // не «что-то пошло не так».
      return NextResponse.json({ ok: false, message: "not_supported_yet" }, { status: 502 });
    }
    console.error("[api/account/visibility] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "update_failed" }, { status: 502 });
  }
}

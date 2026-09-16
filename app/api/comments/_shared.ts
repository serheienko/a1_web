// app/api/comments/_shared.ts
//
// Общая обвязка маршрутов комментария. 2026-09-16.
//
// Комментарий -- это сообщение чата, адресованное посту (см. шапку
// lib/a1/comments.ts), поэтому все четыре действия ниже -- те же методы
// chat-server, что и в переписке, с одной подменой: peerTo.
//
// Почему не переиспользуются маршруты /api/chats/*: те берут адресата
// из chatId и попутно умеют вложения, пересылки, ответы, контакты и
// встречи. Ветка «а если это пост» в самом нагруженном маршруте чата
// ради комментария усложнила бы его ради чужой задачи, а узкий маршрут
// ещё и не даёт прицепить к вакансии, скажем, встречу.
import { NextResponse } from "next/server";
import { NoSessionError } from "@/lib/a1/visitor-call";
import { A1ApiError } from "@/lib/a1/client";
import { clearSession } from "@/lib/a1/session";

export function commentErrorResponse(route: string, err: unknown): NextResponse {
  if (err instanceof NoSessionError) {
    const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(response);
    return response;
  }
  if (err instanceof A1ApiError) {
    console.error(`[api/comments/${route}] failed:`, err.httpStatus, err.body.slice(0, 500));
    return NextResponse.json({ ok: false, message: "failed", detail: err.detail }, { status: 502 });
  }
  console.error(`[api/comments/${route}] unexpected error:`, err);
  return NextResponse.json({ ok: false, message: "failed" }, { status: 502 });
}

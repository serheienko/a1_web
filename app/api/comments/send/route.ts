export const runtime = "nodejs";

// app/api/comments/send/route.ts
//
// Отправка комментария под вакансией. 2026-09-16.
//
// Комментарий -- это обычное сообщение чата, у которого собеседник не
// человек, а пост (см. шапку lib/a1/comments.ts). Поэтому здесь тот же
// messages.send, что и в переписке, и та же сессия посетителя.
//
// Почему отдельный маршрут, а не параметр к app/api/chats/send: тот
// разбирает адресата из chatId через peerForRouteParam и попутно умеет
// вложения, пересылки, ответы, контакты и встречи -- ничего из этого у
// комментария пока нет. Городить в нём третью ветку ради одной строки
// текста значило бы усложнить самый нагруженный маршрут чата ради
// чужой задачи.
//
// Пишет ТОЛЬКО от имени вошедшего. Читаются комментарии служебным
// аккаунтом и видны всем (так решил Александр), но писать анонимно
// нельзя: под комментарием должно стоять имя.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { A1ApiError } from "@/lib/a1/client";
import { setSession, clearSession } from "@/lib/a1/session";
import { MessageSchema, peerForPost } from "@/lib/a1/chat-schemas";

const SendCommentInput = z.object({
  postId: z.string().trim().min(1),
  // Тот же потолок, что и у сообщения в чате (app/api/chats/send).
  text: z.string().trim().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof SendCommentInput>;
  try {
    input = SendCommentInput.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.send", {
      peerTo: peerForPost(input.postId),
      message: input.text,
    });

    // Возвращаем разобранное сообщение, чтобы страница могла показать
    // комментарий сразу, не перезагружаясь.
    const parsed = MessageSchema.safeParse(data);
    const response = NextResponse.json({ ok: true, message: parsed.success ? parsed.data : null });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/comments/send] failed:", err.httpStatus, err.body.slice(0, 500));
      return NextResponse.json({ ok: false, message: "send_failed", detail: err.detail }, { status: 502 });
    }
    console.error("[api/comments/send] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "send_failed" }, { status: 502 });
  }
}

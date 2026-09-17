// app/api/posts/apply/route.ts
//
// Отклик на вакансию с вопросами. 17.09.2026.
//
// ВАЖНО, как это устроено на самом деле (разобрано по openapi.json и по
// коду приложения, applyToPost в lib/features/posts/backend_utils/
// apply_utils.dart): есть отдельный метод **posts.apply**, который
// принимает ответы, привязанные к id вопроса:
//
//   { post, answers: [{ _id, text, object: "apply-answer-text" }] }
//
// Сообщение «📩 Application (…)» в чате создаёт БЭКЕНД сам. Приложение
// его не отправляет -- оно только рисует оптимистичную копию до прихода
// настоящего (buildOptimisticApplicationConversation, «optimistic» в
// названии не случайно) и переходит в чат. Поэтому сайт тоже НЕ должен
// слать сообщение отдельно: иначе у человека в чате будет две заявки.
//
// Отвечаем true/false, как и остальные методы: false -- это отказ.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({
  postId: z.string().trim().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        // Пустая строка допустима: приложение отправляет ВСЕ вопросы,
        // подставляя '' там, где не ответили (см. applyToPost).
        text: z.string().max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { postId, answers } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.apply", {
      post: postId,
      answers: answers.map((a) => ({
        _id: a.questionId,
        text: a.text,
        object: "apply-answer-text",
      })),
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
      console.error("[api/posts/apply] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/posts/apply] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "apply_failed", detail }, { status: 502 });
  }
}

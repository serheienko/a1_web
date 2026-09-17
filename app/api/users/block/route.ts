// app/api/users/block/route.ts
//
// Александр, 17.09.2026: строка «Заблокувати» в «•••» на чужом профиле
// была мёртвой. Бэкенд для неё есть с самого начала -- users.block /
// users.unblock (по openapi.json), оба принимают {id} и отвечают
// true/false.
//
// Как у реакций в комментариях (app/api/comments/reaction/add): ответ
// `false` -- это НЕ успех, а отказ бэкенда. Отдаём 409, чтобы кнопка
// откатилась и человек увидел ошибку, а не поверил, что заблокировал.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({
  userId: z.string().trim().min(1),
  block: z.boolean(),
});

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { userId, block } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>(
      block ? "users.block" : "users.unblock",
      { id: userId },
    );

    if (data === false) {
      return NextResponse.json({ ok: false, message: "rejected" }, { status: 409 });
    }

    const response = NextResponse.json({ ok: true, blocked: block });
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
      console.error("[api/users/block] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/users/block] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "block_failed", detail }, { status: 502 });
  }
}

// app/api/posts/apply-state/route.ts
//
// 14.10.2026 (Александр: «Screening Questions… человек может подать свою аппликацию только после
// того, как он эти вопросы заполнит. В приложении целый флоу -- сделать такую же репродукцию на
// сайте»). Всё, что окну с вопросами нужно знать и сохранять, кроме самой отправки
// (она -- app/api/posts/apply):
//
//   GET    ?postId=  свежие вопросы (posts.get от имени человека: страница вакансии могла
//                    закешироваться со старыми вопросами, а бэкенд сверяет ответы с текущими),
//                    откликался ли он уже (флаг APPLIED) и его черновик (posts.applyGetDrafts) --
//                    тот же, что в приложении: начал на телефоне -- продолжил на сайте.
//   POST   {postId, answers}   сохранить черновик (posts.applySaveDraft), как приложение при выходе.
//   DELETE ?postId=  стереть черновик (posts.applyClearDrafts) -- кнопка-корзина.
//
// Методы и форматы -- как в приложении (lib/features/posts/backend_utils/apply_utils.dart).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, type SessionState } from "@/lib/a1/session";
import { parsePost } from "@/lib/a1/schemas";
import { mapApplyQuestions } from "@/lib/a1/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPLIED = 1 << 8;
const APPLY_DRAFT = 1 << 9;

const PostId = z.string().trim().min(1).max(64);

const SaveInput = z.object({
  postId: PostId,
  answers: z
    .array(z.object({ questionId: z.string().trim().min(1), text: z.string().max(4000) }))
    .max(20),
});

function done(body: unknown, refreshed: SessionState | null, status = 200) {
  const response = NextResponse.json(body, { status });
  if (refreshed) setSession(response, refreshed);
  return response;
}

function failed(where: string, err: unknown) {
  if (err instanceof NoSessionError) {
    const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(response);
    return response;
  }
  if (err instanceof A1ApiError) {
    console.error(`[api/posts/apply-state] ${where} failed:`, err.httpStatus, err.body.slice(0, 300));
  } else {
    console.error(`[api/posts/apply-state] ${where} unexpected error:`, err);
  }
  return NextResponse.json({ ok: false, message: "failed" }, { status: 502 });
}

export async function GET(request: NextRequest) {
  const parsed = PostId.safeParse(request.nextUrl.searchParams.get("postId"));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const postId = parsed.data;
  try {
    const got = await callAsVisitor<unknown>("posts.get", { ids: [postId] });
    let refreshed = got.refreshedSession;
    const post = parsePost(Array.isArray(got.data) ? got.data[0] : undefined);
    if (!post) return done({ ok: false, message: "not_found" }, refreshed, 404);
    const flags = post.flags ?? 0;
    const questions = mapApplyQuestions(post.apply);

    // Черновик: просим, только если бэкенд сам сказал, что он есть (флаг APPLY_DRAFT) -- так же
    // поступает приложение. Не вышло -- окно откроется пустым (или с черновиком из браузера).
    let draft: Record<string, string> | null = null;
    if ((flags & APPLY_DRAFT) !== 0) {
      try {
        const res = await callAsVisitor<unknown>("posts.applyGetDrafts", { ids: [postId] });
        refreshed = res.refreshedSession ?? refreshed;
        for (const item of Array.isArray(res.data) ? res.data : []) {
          const it = item as { post?: unknown; answers?: unknown };
          if (String(it.post ?? "") !== postId || !Array.isArray(it.answers)) continue;
          draft = {};
          for (const a of it.answers as { _id?: unknown; text?: unknown }[]) {
            if (typeof a?._id === "string" && typeof a.text === "string") draft[a._id] = a.text;
          }
        }
      } catch (err) {
        console.error("[api/posts/apply-state] applyGetDrafts failed:", err instanceof A1ApiError ? err.httpStatus : err);
      }
    }
    return done({ ok: true, questions, applied: (flags & APPLIED) !== 0, draft }, refreshed);
  } catch (err) {
    return failed("get", err);
  }
}

export async function POST(request: NextRequest) {
  const parsed = SaveInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const { postId, answers } = parsed.data;
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.applySaveDraft", {
      post: postId,
      answers: answers.map((a) => ({ _id: a.questionId, text: a.text, object: "apply-answer-text" })),
    });
    return done({ ok: data === true }, refreshedSession);
  } catch (err) {
    return failed("save", err);
  }
}

export async function DELETE(request: NextRequest) {
  const parsed = PostId.safeParse(request.nextUrl.searchParams.get("postId"));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("posts.applyClearDrafts", { ids: [parsed.data] });
    return done({ ok: data === true }, refreshedSession);
  } catch (err) {
    return failed("clear", err);
  }
}

// lib/a1/chat-proxy.ts
//
// Волна 2 групп (2026-10-03): общий каркас для тонких маршрутов
// /api/chats/group-*, которые просто пробрасывают один метод бэкенда
// под аккаунтом посетителя -- проверка тела запроса, обновление сессии,
// одинаковые ответы на 401 / сбой. Чтобы не копировать 40 строк в
// каждый из восьми маршрутов.
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export async function proxyChatCall<I>(
  request: Request,
  opts: {
    tag: string;
    schema: ZodType<I>;
    /** Метод бэкенда и тело вызова из уже проверенного ввода. */
    call: (input: I) => { method: string; body: unknown };
    /** Что вернуть клиенту из ответа бэкенда. */
    shape?: (data: unknown, input: I) => Record<string, unknown>;
  },
): Promise<NextResponse> {
  const parsed = opts.schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  try {
    const { method, body } = opts.call(parsed.data);
    const { data, refreshedSession } = await callAsVisitor<unknown>(method, body);
    const res = NextResponse.json({ ok: true, ...(opts.shape ? opts.shape(data, parsed.data) : {}) });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) console.error(`[api/chats/${opts.tag}] failed:`, err.httpStatus, err.body.slice(0, 500));
    else console.error(`[api/chats/${opts.tag}] unexpected error:`, err);
    // 400 бэкенда («You are not allowed for this action») отдаём как 403,
    // чтобы клиент мог показать «нет прав», а не общий сбой.
    const status = err instanceof A1ApiError && err.httpStatus === 400 && /not allowed/i.test(err.body) ? 403 : 502;
    return NextResponse.json({ ok: false, message: `${opts.tag.replace(/-/g, "_")}_failed`, detail }, { status });
  }
}

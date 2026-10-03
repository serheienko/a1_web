// app/api/account/magic-wand/route.ts
//
// Magic Wand (волна 5, 2026-10-03). POST {text?, voice?, focus?, lang?} ->
// account.magicWand. Ничего не сохраняет: сервер читает рассказ о человеке и
// возвращает значения полей профиля + состояние каждого чипа. Применение --
// на клиенте (форма редактора), сохранение -- обычным «Зберегти».
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parseMagicWandResult } from "@/lib/a1/magic-wand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Голос до 10 минут: расшифровка + разбор занимают время.
export const maxDuration = 240;

const Input = z
  .object({
    text: z.string().trim().max(20000).optional(),
    voice: z.object({ fileReference: z.string().min(1).max(4000) }).optional(),
    focus: z
      .enum(["name", "bio", "occupation", "companies", "location", "industry", "languages", "education", "skills", "hobbies", "books", "movies", "games"])
      .optional(),
    lang: z.string().trim().min(2).max(10).optional(),
  })
  .refine((v) => (v.text && v.text.length > 0) || v.voice, { message: "empty" });

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const i = parsed.data;
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("account.magicWand", {
      ...(i.text ? { text: i.text } : {}),
      ...(i.voice ? { voice: i.voice } : {}),
      ...(i.focus ? { focus: i.focus } : {}),
      lang: i.lang ?? "en",
    }, { timeoutMs: 230_000 });
    const result = parseMagicWandResult(data);
    if (!result) return NextResponse.json({ ok: false, message: "unexpected_shape" }, { status: 502 });
    const res = NextResponse.json({ ok: true, result });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    if (err instanceof A1ApiError) console.error("[api/account/magic-wand] failed:", err.httpStatus, err.body.slice(0, 500));
    else console.error("[api/account/magic-wand] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "magic_wand_failed" }, { status: 502 });
  }
}

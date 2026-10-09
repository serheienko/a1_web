// app/api/posts/magic-wand/route.ts
//
// Magic Post (09.10.2026, как в приложении): POST {text?, voice?, focus?,
// kind?, lang?} -> posts.magicWand. Ничего не публикует: сервер раскладывает
// рассказ по полям публикации, форма заполняется на клиенте, человек сам
// жмёт «Опублікувати». Только для Alpha (замок на клиенте; на сервере --
// MAGIC_POST_ALPHA_ONLY).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { parseMagicWandResult } from "@/lib/a1/magic-wand";
import { alphaEnabled } from "@/lib/alpha/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

// Имена чипов сайта -> имена posts.magicWand (как magicPostApiName в приложении).
const FOCUS: Record<string, string> = {
  title: "title",
  content: "content",
  category: "category",
  location: "location",
  salary: "salary",
  workMode: "workMode",
  workContract: "workContract",
  experience: "experience",
  skills: "skills",
  questions: "questions",
};

const Input = z
  .object({
    text: z.string().trim().max(20000).optional(),
    voice: z.object({ fileReference: z.string().min(1).max(4000) }).optional(),
    focus: z.string().optional(),
    kind: z.enum(["job-seeking", "job-employing"]).optional(),
    lang: z.string().trim().min(2).max(10).optional(),
  })
  .refine((v) => (v.text && v.text.length > 0) || v.voice, { message: "empty" });

export async function POST(request: NextRequest) {
  if (!alphaEnabled()) return NextResponse.json({ ok: false, message: "disabled" }, { status: 404 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const i = parsed.data;
  const focus = i.focus ? FOCUS[i.focus] : undefined;
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>(
      "posts.magicWand",
      {
        ...(i.text ? { text: i.text } : {}),
        ...(i.voice ? { voice: i.voice } : {}),
        ...(focus ? { focus } : {}),
        ...(i.kind ? { kind: i.kind } : {}),
        lang: i.lang ?? "en",
      },
      { timeoutMs: 230_000 },
    );
    const raw = data && typeof data === "object" ? { ...(data as Record<string, unknown>) } : null;
    const result = parseMagicWandResult(raw);
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
    if (err instanceof A1ApiError) {
      console.error("[api/posts/magic-wand] failed:", err.httpStatus, err.body.slice(0, 500));
      if (err.httpStatus === 403) return NextResponse.json({ ok: false, message: "alpha_only" }, { status: 403 });
    } else console.error("[api/posts/magic-wand] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "magic_post_failed" }, { status: 502 });
  }
}

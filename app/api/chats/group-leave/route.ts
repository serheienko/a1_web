// app/api/chats/group-leave/route.ts
//
// Группы в чатах (волна 1). POST {chat} -> chats.leaveChat {chat}.
// Служебное «X left the group» ставит сервер.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({ chat: z.string().trim().min(1) });

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  try {
    const { refreshedSession } = await callAsVisitor<unknown>("chats.leaveChat", { chat: parsed.data.chat });
    const res = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) console.error("[api/chats/group-leave] failed:", err.httpStatus, err.body.slice(0, 500));
    else console.error("[api/chats/group-leave] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "leave_failed", detail }, { status: 502 });
  }
}

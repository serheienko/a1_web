// app/api/chats/group-create/route.ts
//
// Группы в чатах (волна 1). POST {title, userIds[]} -> chats.createChat.
// Бэкенд: chats.createChat {title, participants: Peer[]} -> {chatId};
// создателем становится вызывающий, служебное сообщение «X created the
// group» и «X added …» ставит сам сервер.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({
  title: z.string().trim().min(1).max(128),
  userIds: z.array(z.string().trim().min(1)).min(1).max(200),
});

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const { title, userIds } = parsed.data;
  try {
    const { data, refreshedSession } = await callAsVisitor<{ chatId?: string | number }>("chats.createChat", {
      title,
      participants: Array.from(new Set(userIds)).map((user) => ({ object: "peer-user", user })),
    });
    const chatId = data && data.chatId != null ? String(data.chatId) : null;
    if (!chatId) return NextResponse.json({ ok: false, message: "no_chat_id" }, { status: 502 });
    const res = NextResponse.json({ ok: true, chatId });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) console.error("[api/chats/group-create] failed:", err.httpStatus, err.body.slice(0, 500));
    else console.error("[api/chats/group-create] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "create_failed", detail }, { status: 502 });
  }
}

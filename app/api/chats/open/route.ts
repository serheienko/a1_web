// app/api/chats/open/route.ts
//
// Aleksandr, 2026-09-01: "в контактах добавь кнопку написать... чат
// иконка - открыть чат" -- POST { userId } resolves the personal chat
// with that platform user and hands back a route param for it, so
// app/contacts/page.tsx's (and, 2026-09-02, components/profile-action-
// row.tsx's) chat icon has somewhere to send the visitor. `GET
// /api/chats/list` already gave us everything needed to find an
// EXISTING personal chat with someone (Chat + the `users` side array,
// see lib/a1/chat-schemas.ts); this route reuses exactly that logic
// first.
//
// 2026-09-02 (Aleksandr, live bug report: "как открыть с кем то чат?
// Я из контактов нажимаю - не срабатывает. Протестируй сам."): this
// route used to fall back to a guessed `chats.createChat({users:
// [userId]})` call when no existing chat was found -- confirmed wrong
// on every axis by reading chat-server's own source directly (see
// lib/a1/chat-schemas.ts's peerForRouteParam/chatRouteParamForUser
// header for the full writeup): that method creates GROUP chats
// (`{title, participants: Peer[]}` in, `{chatId}` out), not personal
// ones, and was never going to work for this. There is no
// "pre-create an empty personal chat" method on this backend at all --
// personal chats resolve (create-if-missing) transparently the moment
// a message is actually sent to a `peer-user` peer. So when no
// existing chat is found, this route now hands back
// chatRouteParamForUser(userId) (a `u_<userId>` sentinel) instead of
// trying to create anything -- app/chats/[chatId]/page.tsx's own
// messages/send/typing calls already resolve that form fine via
// peerForRouteParam, no client-side changes needed.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession, type SessionState } from "@/lib/a1/session";
import {
  extractChats,
  chatRouteParamForUser,
  isPersonalChat,
  otherParticipantUserId,
} from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const OpenInput = z.object({
  userId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = OpenInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { userId } = parsed.data;

  let latestSession: SessionState | null = null;

  try {
    const session = await readSession();
    const myUserId = session?.userId ?? null;

    const listResult = await callAsVisitor<unknown>("chats.getChats", {});
    latestSession = listResult.refreshedSession;
    const chats = extractChats(listResult.data);
    const existing = chats.find(
      (c) => isPersonalChat(c) && otherParticipantUserId(c, myUserId) === userId,
    );

    if (existing) {
      const response = NextResponse.json({ ok: true, chatId: existing._id, isNew: false });
      if (latestSession) setSession(response, latestSession);
      return response;
    }

    // No existing personal chat with this contact -- no chat to create
    // either (see this file's own header). Hand back the peer-user
    // route param; the chat window resolves the real chat the moment
    // the first message goes out.
    const response = NextResponse.json({ ok: true, chatId: chatRouteParamForUser(userId), isNew: true });
    if (latestSession) setSession(response, latestSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/chats/open] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/open] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "open_failed", detail }, { status: 502 });
  }
}

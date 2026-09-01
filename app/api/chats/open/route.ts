// app/api/chats/open/route.ts
//
// Aleksandr, 2026-09-01: "в контактах добавь кнопку написать... чат
// иконка - открыть чат" -- POST { userId } resolves (or creates) the
// personal chat with that platform user and hands back its id, so
// app/contacts/page.tsx's new chat icon has somewhere to send the
// visitor. `GET /api/chats/list` already gave us everything needed to
// find an EXISTING personal chat with someone (Chat + the `users` side
// array, see lib/a1/chat-schemas.ts); this route reuses exactly that
// logic first, and only reaches for the much less certain
// chats.createChat call when no existing chat comes back.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession, type SessionState } from "@/lib/a1/session";
import {
  extractChats,
  extractCreatedChatId,
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

    // No existing personal chat with this contact -- fall back to
    // creating one. UNCONFIRMED request shape (chats.createChat's own
    // type file hit the same read-lock as everything else this
    // session -- see lib/a1/chat-schemas.ts's header): `{ users: [id] }`
    // is this session's best guess, matching messages.send/sendAction's
    // own `{ peer, ... }` pattern of "the target goes in one named
    // field". First thing to try instead if this 502s for real.
    const createResult = await callAsVisitor<unknown>("chats.createChat", {
      users: [userId],
    });
    latestSession = createResult.refreshedSession ?? latestSession;
    const chatId = extractCreatedChatId(createResult.data);
    if (!chatId) {
      console.error("[api/chats/open] chats.createChat: unrecognized response shape", createResult.data);
      const response = NextResponse.json({ ok: false, message: "create_failed" }, { status: 502 });
      if (latestSession) setSession(response, latestSession);
      return response;
    }

    const response = NextResponse.json({ ok: true, chatId, isNew: true });
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

// app/api/chats/send/route.ts
//
// Phase 1 web chat (Aleksandr, 2026-09-01). POST { chatId, text } --
// proxies chat-server's `messages.send`.
//
// 2026-09-02: request shape confirmed directly off chat-server's own
// types (packages/types/global/MessageInput.d.ts, read straight off
// the source this time instead of guessed): `{ peerTo, message, ... }`
// -- `peerTo` was already right (2026-09-01's live-confirmed rename,
// see app/api/chats/messages/route.ts's header), but `randomId` was
// never a real field on this input at all and is dropped here, and
// `chatId` may now be a real Chat _id OR the `u_<userId>` "no chat
// yet" sentinel (app/api/chats/open/route.ts) -- peerForRouteParam
// (lib/a1/chat-schemas.ts) resolves either to the right Peer, and for
// a `peer-user` peer chat-server transparently resolves-or-creates the
// personal chat right here (services/chats/methods/
// _peerToPeerChat.ts + resolvePersonalChat.ts) before the message goes
// out -- no separate "create the chat first" step needed.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam, MessageSchema } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const SendInput = z.object({
  chatId: z.string().trim().min(1),
  text: z.string().trim().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const parsed = SendInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, text } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.send", {
      peerTo: peerForRouteParam(chatId),
      message: text,
    });

    // 2026-09-02: echoes the real created message back (parsed through
    // the now shape-confirmed MessageSchema -- see lib/a1/chat-schemas.ts)
    // instead of the raw payload, in case a future pass wants to append
    // it optimistically rather than waiting for the next poll tick.
    const parsedMessage = MessageSchema.safeParse(data);
    const response = NextResponse.json({ ok: true, message: parsedMessage.success ? parsedMessage.data : null });
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
      console.error("[api/chats/send] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/send] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "send_failed", detail }, { status: 502 });
  }
}

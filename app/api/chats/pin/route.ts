// app/api/chats/pin/route.ts
//
// "Pin" feature (Aleksandr, reference screenshot: the message context
// menu's "Pin" row -- "Посмотри еще функцию закрепов сообщений «пин»
// найди документацию и подготовься к имплементации"). Ground-truthed
// off the ACTUAL BACKEND SOURCE this time (not just the mobile client
// -- ~/mnt/a1_app/aone-api-private-main/packages/types/methods/
// messages_updatePinnedMessage.d.ts), which types the wire call
// exactly: POST messages.updatePinnedMessage with
// `{ id: <numeric message id>, peerTo, unpin: boolean, local: boolean }`.
//
// `local: true` would pin only for the current user; mobile's own
// chat_detail_cubit.dart NEVER exposes that choice in its UI -- every
// one of its ~20 real call sites hardcodes `pinForAll: true`
// (-> `local: false`). So mobile's own "Pin" always pins for the
// whole chat, no per-user toggle -- this route does the same, no
// `local` param accepted from the client at all.
//
// Mobile's own 1-pin-per-chat rule -- chat_detail_cubit.dart's own
// pinMessage() pins a NEW message by silently unpinning whichever one
// was already pinned first -- turns out to be mobile's OWN
// client-side convention, not a backend limit -- this method is a
// plain per-message pin/unpin toggle, nothing here caps
// how many messages can carry the pinned flag at once. Fix Tracker
// (2026-09-07, "Есть ли возможность сделать мультизакреп?"): dropped
// the auto-replace behavior entirely -- pinning a message now just
// pins IT, alongside whatever else is already pinned, and unpinning
// only ever affects the one message asked for. See
// app/api/chats/pinned/route.ts's own header for the read-side half
// of this (now returns every pinned message, not just one).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const PinInput = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.number().int().positive(),
  unpin: z.boolean(),
});

export async function POST(request: NextRequest) {
  const parsed = PinInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId, unpin } = parsed.data;

  try {
    const peerTo = peerForRouteParam(chatId);

    const { refreshedSession } = await callAsVisitor<boolean>("messages.updatePinnedMessage", {
      id: messageId,
      peerTo,
      unpin,
      local: false,
    });
    const response = NextResponse.json({ ok: true });
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
      console.error("[api/chats/pin] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/pin] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "pin_failed", detail }, { status: 502 });
  }
}

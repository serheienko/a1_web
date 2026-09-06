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
// Mobile's own 1-pin-per-chat rule (chat_detail_cubit.dart's own
// pinMessage()): pinning a NEW message while a different one is
// already pinned silently unpins the old one first (a second,
// fire-and-forget updatePinnedMessage call) -- reproduced below via
// `replacingMessageId` so the web client can just always call this
// route with the message it wants pinned, same as mobile's own single
// "Pin"/"Replace Pin" action from the caller's point of view.
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
  // Set only when replacing an existing pin with this new one -- a
  // plain unpin, or a pin into a chat with nothing currently pinned,
  // has nothing to replace and omits this.
  replacingMessageId: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = PinInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId, unpin, replacingMessageId } = parsed.data;

  try {
    const peerTo = peerForRouteParam(chatId);

    if (replacingMessageId && replacingMessageId !== messageId) {
      // Fire-and-forget, same as mobile's own unawaited() call -- a
      // failure unpinning the OLD pin shouldn't block pinning the new
      // message.
      callAsVisitor<boolean>("messages.updatePinnedMessage", {
        id: replacingMessageId,
        peerTo,
        unpin: true,
        local: false,
      }).catch(() => {});
    }

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

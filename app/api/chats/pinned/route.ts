// app/api/chats/pinned/route.ts
//
// Companion to app/api/chats/pin/route.ts's own header. Mobile's own
// getPinnedMessages() (chat_detail_cubit.dart) fetches the current pin
// via a plain `messages.getMessages` call with `onlyPinned: true` --
// there is no separate "get pinned message" endpoint; the
// ground-truthed backend type (aone-api-private-main's own
// messages_getMessages.d.ts) confirms `onlyPinned?: boolean` is just
// an extra filter on the same regular get-messages call.
//
// A SEPARATE route from app/api/chats/messages/route.ts's own polling
// call (rather than bolting onlyPinned onto that one) because the two
// serve different purposes: that route always re-fetches the last 50
// messages so the visible history stays in sync; the pinned message
// can be arbitrarily older than that window (1-pin-per-chat, but
// nothing un-pins it just because time/scroll moved on since), so it
// needs its own always-correct lookup -- called once per chat open and
// again after any successful pin/unpin, same cache-once/
// refresh-on-change shape as mobile's own getPinnedMessages().
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { extractMessages, peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chat")?.trim();
  if (!chatId) {
    return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.getMessages", {
      peerTo: peerForRouteParam(chatId),
      onlyPinned: true,
      limit: 1,
    });
    const messages = extractMessages(data);
    const response = NextResponse.json({ ok: true, message: messages[0] ?? null });
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
      console.error("[api/chats/pinned] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/pinned] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

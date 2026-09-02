// app/api/chats/read-state/route.ts
//
// 2026-09-02 (Aleksandr, live bug report + screenshot: "у меня человек
// ответил, прочёл сообщения, но галочки не поменялись из одной в две")
// -- proxies chat-server's `chats.getChats` (same method app/api/chats/
// list/route.ts already calls) purely to read ONE chat's participants
// and return the peer's `reaMaxId` -- see lib/a1/chat-schemas.ts's
// ChatParticipantSchema comment for what that field is (confirmed
// straight off chat-server's own OpenAPI spec) and why a per-MESSAGE
// read field was never going to exist to read instead.
//
// A separate endpoint (not folded into app/api/chats/messages/route.ts's
// own response) on purpose: that route already calls callAsVisitor once
// per poll tick, and a second callAsVisitor call inside the SAME
// request would race its own token refresh against this one -- lib/
// auth-fetch.ts's own header explains why two authenticated calls
// sharing a stale refreshToken is exactly the "second one gets treated
// as revoked" bug that queue exists to prevent. Calling this as its own
// authFetch from the client instead means the queue already guarantees
// this request only ever fires after the messages request's own
// Set-Cookie has been applied, same as every other authFetch pair in
// this app.
//
// `chats.getChats` takes no filter (confirmed: its own input schema is
// an empty object) -- there's no cheaper "get just this one chat" call
// to make, same tradeoff app/chats/page.tsx's own list polling already
// accepts every 5s.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import { extractChats, isNewChatRouteParam, otherParticipantReadMaxId } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chat")?.trim();
  if (!chatId) {
    return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  }

  // "No confirmed chat yet" sentinel (app/api/chats/open/route.ts) --
  // there's provably no real Chat resource, so no participants/
  // reaMaxId to look up. Skip the network call entirely.
  if (isNewChatRouteParam(chatId)) {
    return NextResponse.json({ ok: true, peerReadMaxId: null });
  }

  try {
    const session = await readSession();
    const { data, refreshedSession } = await callAsVisitor<unknown>("chats.getChats", {});
    const chats = extractChats(data);
    const chat = chats.find((c) => c._id === chatId) ?? null;
    const peerReadMaxId = chat ? otherParticipantReadMaxId(chat, session?.userId ?? null) : null;

    const response = NextResponse.json({ ok: true, peerReadMaxId });
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
      console.error("[api/chats/read-state] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/read-state] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

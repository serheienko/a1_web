// app/api/chats/messages/route.ts
//
// Phase 1 web chat (Aleksandr, 2026-09-01). GET ?chat=<routeParam> --
// proxies chat-server's `messages.getMessages` for one chat's history.
//
// 2026-09-02: `chat` may now be a real Chat _id OR app/api/chats/open/
// route.ts's `u_<userId>` sentinel for "no confirmed chat yet" --
// peerForRouteParam (lib/a1/chat-schemas.ts) resolves either to the
// right Peer. Confirmed straight off chat-server's own source
// (api/v1/messages/messages.getMessages.ts +
// services/chats/methods/getMessages.ts) that a `peer-user` peer here
// is completely safe with no chat yet: it just runs a message search
// and returns [] rather than requiring or creating a chat.
//
// FIELD NAME CONFIRMED LIVE (2026-09-01): first real call 400'd with
// "root is missing required property 'peerTo'" (seen via Vercel Logs),
// so the request field is `peerTo`, not `peer` -- fixed below. This
// was the first live confirmation under this file's "confirm on first
// live error" plan (PLAN.md §6.62); peerForRouteParam's own value
// shape (lib/a1/chat-schemas.ts) is now fully confirmed too, see its
// header.
//
// This is the MVP polling transport (PLAN.md's chat master plan,
// "поллинг для MVP"): the client (app/chats/[chatId]/page.tsx) re-calls
// this every few seconds while the chat window is open. No `since`/
// cursor param yet -- always re-fetches the recent window and re-renders
// client-side, same "simplicity over a half-confirmed cursor scheme"
// call as skipping events.getUpdates entirely for this phase (that
// endpoint's pts/cursor semantics are exactly the kind of thing that
// needs a live 400 to pin down, not another guess).
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import { extractMessages, peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chat")?.trim();
  if (!chatId) {
    return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  }

  try {
    // myUserId rides along here (rather than a separate whoami call)
    // so the chat window can tell "my own message" bubbles apart from
    // the other side's without an extra request.
    const session = await readSession();
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.getMessages", {
      peerTo: peerForRouteParam(chatId),
      limit: 50,
    });

    // 2026-09-02: field shapes below were confirmed live against a real
    // payload (Vercel Logs) after Aleksandr reported "чат не работает и
    // не синхронизируется с апкой" -- see lib/a1/chat-schemas.ts's
    // MessageSchema header for the full confirmed shape and what this
    // file's earlier guess got wrong.
    const messages = extractMessages(data);
    const response = NextResponse.json({ ok: true, messages, myUserId: session?.userId ?? null });
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
      console.error("[api/chats/messages] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/messages] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

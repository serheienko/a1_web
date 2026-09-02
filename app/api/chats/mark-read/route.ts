// app/api/chats/mark-read/route.ts
//
// 2026-09-02 (Aleksandr, follow-up on the read-receipt fix: "когда я
// отвечаю с моба и читаю это на вебе, оно не отмечается у меня на
// мобильном, что сообщение прочитано") -- app/api/chats/read-state/
// route.ts made the web client DISPLAY the peer's reaMaxId (see that
// file's header), but nothing ever advanced the WEB VISITOR's own
// reaMaxId when they actually viewed a chat here -- so the mobile app,
// reading the exact same reaMaxId mechanism from its own side, could
// never see that a message sent from mobile had been read on web. This
// is the other half: proxies chat-server's `messages.markAsRead`
// (confirmed off the OpenAPI spec -- `{ peerTo, lastMessage }`, a plain
// boolean response) so opening/viewing a chat here advances MY OWN
// participant's reaMaxId, same as chat-server's real apps already do.
//
// POST { chat: routeParam, lastMessage: number } -- called by
// app/chats/[chatId]/page.tsx only while the tab is actually visible
// (see that file's own comment), with the highest message _id it has
// currently loaded.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const MarkReadInput = z.object({
  chat: z.string().trim().min(1),
  lastMessage: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const parsed = MarkReadInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chat, lastMessage } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("messages.markAsRead", {
      peerTo: peerForRouteParam(chat),
      lastMessage,
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
      console.error("[api/chats/mark-read] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/mark-read] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "mark_read_failed", detail }, { status: 502 });
  }
}

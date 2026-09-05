// app/api/chats/clear/route.ts
//
// Clear Chat (2026-09-05, Aleksandr: "Очистить чат давай тоже сделаем
// сразу, почему нет?" -- greenlighting the "Форвард 2.0" master plan's
// open question). Confirmed off the mobile app's own chat.datasource.dart
// (deleteHistory) and chat_detail_cubit.dart's clearChatForMe(): this is
// the SAME messages.deleteMessages family RPC as app/api/chats/delete/
// route.ts already calls, just the dedicated "wipe everything up to
// maxId" variant -- messages.deleteHistory, `{ peerTo, revoke: false,
// maxId }`. Always revoke:false (delete-for-me only), matching the
// delete route's own scope decision -- there is no "clear for everyone"
// anywhere in this app yet. `maxId` is the highest message id the
// client currently has loaded for this chat (mirrors clearChatForMe's
// own `ids.reduce(max)`) -- the client computes it from its own
// `messages` state and sends it, since this route has no independent
// way to know what "everything so far" means for a given caller.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const ClearInput = z.object({
  chatId: z.string().trim().min(1),
  maxId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const parsed = ClearInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, maxId } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("messages.deleteHistory", {
      peerTo: peerForRouteParam(chatId),
      revoke: false,
      maxId,
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
      console.error("[api/chats/clear] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/clear] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "clear_failed", detail }, { status: 502 });
  }
}

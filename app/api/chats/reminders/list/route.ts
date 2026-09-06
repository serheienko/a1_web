// app/api/chats/reminders/list/route.ts
//
// Reminders list (2026-09-06 follow-up to the "Remind" feature --
// app/api/chats/reminders/create/route.ts's own header comment already
// flagged this as a separate, bigger follow-up: "mobile's own
// Reminders bottom sheet / Shortcuts tab are a separate, bigger
// follow-up, not built here"). Ground-truthed off mobile's own
// api_constants.dart (`chatGetReminderMessages` ->
// messages.getReminderMessages) and the backend's own method type
// (messages_getReminderMessages.d.ts): `{ peerTo }` in, a bare
// `Aone.Resource.MessageReminder[]` out -- parsed here via
// extractReminders (lib/a1/chat-schemas.ts), NOT extractMessages,
// since each item is a `{ local, message, scheduleAt }` wrapper, not a
// raw message.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { extractReminders, peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chat")?.trim();
  if (!chatId) {
    return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.getReminderMessages", {
      peerTo: peerForRouteParam(chatId),
    });
    const reminders = extractReminders(data);
    const response = NextResponse.json({ ok: true, reminders });
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
      console.error("[api/chats/reminders/list] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/reminders/list] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}

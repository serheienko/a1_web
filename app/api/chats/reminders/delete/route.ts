// app/api/chats/reminders/delete/route.ts
//
// Reminders list (2026-09-06 follow-up, see reminders/list/route.ts's
// own header). Ground-truthed off mobile's own api_constants.dart
// (`chatDeleteReminders` -> messages.deleteReminders) and the
// backend's own method type (messages_deleteReminders.d.ts): `{
// peerTo, ids: UInt[] }` -- plural by message id, even though this
// route (like mobile's own deleteReminder(chatId, messageId)) only
// ever deletes one at a time, hence the single-element array below.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const DeleteReminderInput = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const parsed = DeleteReminderInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId } = parsed.data;

  try {
    const peerTo = peerForRouteParam(chatId);
    const { refreshedSession } = await callAsVisitor<boolean>("messages.deleteReminders", {
      peerTo,
      ids: [messageId],
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
      console.error("[api/chats/reminders/delete] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/reminders/delete] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "delete_failed", detail }, { status: 502 });
  }
}

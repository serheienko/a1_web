// app/api/chats/reminders/create/route.ts
//
// "Remind" feature (Aleksandr, reference screenshot: the message
// context menu's "Remind" row -- "У нас есть еще фича «remind» она
// работает на каждое сообщение... Можно поставить ремайндер на кажд
// сообщение"). Ground-truthed off the mobile app source (not guessed):
// lib/features/chat/presentation/chat_detail/cubit/chat_detail_cubit.dart's
// own createReminder() and lib/core/constants/api_constants.dart's own
// chatCreateReminder constant -- POST messages.createReminder with
// `{ peerTo, message: <numeric message id>, scheduleAt: <unix seconds>,
// local: boolean }`. `local: true` schedules the reminder for the
// current user only; `local: false` also reminds the other side of the
// chat (mobile's own RemindMeModal toggle, labelled "Remind {peer
// name}" -- see components/chat/remind-modal.tsx's own header for why
// the same toggle is ported here). No client-side "list my reminders"
// surface exists yet (mobile's own Reminders bottom sheet / Shortcuts
// tab are a separate, bigger follow-up, not built here) -- the
// scheduled reminder itself is delivered server-side regardless, same
// as mobile.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const CreateReminderInput = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.number().int().positive(),
  // Unix seconds, matching mobile's own `millisecondsSinceEpoch ~/
  // 1000` -- the backend rejects anything not strictly in the future
  // (mobile's own _minimumScheduleTime comment), so no extra
  // future-check is duplicated here; a rejection just surfaces as
  // reminder_failed same as any other backend error.
  scheduleAt: z.number().int().positive(),
  local: z.boolean(),
});

export async function POST(request: NextRequest) {
  const parsed = CreateReminderInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId, scheduleAt, local } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<boolean>("messages.createReminder", {
      peerTo: peerForRouteParam(chatId),
      message: messageId,
      scheduleAt,
      local,
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
      console.error("[api/chats/reminders/create] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/reminders/create] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "reminder_failed", detail }, { status: 502 });
  }
}

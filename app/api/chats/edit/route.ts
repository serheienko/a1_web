// app/api/chats/edit/route.ts
//
// 2026-09-05 (Aleksandr: "давай одновременно сделаем кнопки
// редактировать... чтобы можно было после того, как ты его отослал,
// отредачить"). Confirmed off the mobile app's own source
// (~/mnt/a1_app/aone_private, not the generated OpenAPI model --
// chat_detail_cubit.dart's actual editMessage() call), same "read the
// real send call, not just the schema" rule every other route in this
// file already follows: `messages.editMessage` wants
// `{ id, flags, peerTo, entities }` -- `id` is the message's own numeric
// `_id` (never a string here, unlike every OTHER route in this app that
// coerces it -- chat-server's own field really is a number, see
// lib/a1/chat-schemas.ts's header), `flags` is `1 | EDITED_FLAG`
// (EDITED_FLAG = 1 << 6 = 64, confirmed off MessageFlag.EDITED in
// conversation_detail_entity.dart -- so 65, not guessed), and `entities`
// is the SAME array shape a plain text send already uses
// (`[{object:"entity-text", text}]`) -- editing only ever replaces the
// message's text today, no media/calc/meet re-edit support (mobile's
// own cubit has separate editScheduledMeetingMessage/editCalculation
// methods for those, out of scope here for now).
//
// Text-only and REQUIRED (unlike messages.send's optional `text`) --
// there is no such thing as "edit this message to have no text" here;
// clearing a caption entirely isn't a flow this app offers yet, so an
// empty edit is rejected client-side before this route is ever called
// (see the compose-bar's own Save-button disabled state).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam, MessageSchema } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const EDITED_FLAG = 1 | (1 << 6);

const EditInput = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.number().int().positive(),
  text: z.string().trim().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const parsed = EditInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId, text } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.editMessage", {
      id: messageId,
      flags: EDITED_FLAG,
      peerTo: peerForRouteParam(chatId),
      entities: [{ object: "entity-text", text }],
    });
    const parsedMessage = MessageSchema.safeParse(data);
    const response = NextResponse.json({ ok: true, message: parsedMessage.success ? parsedMessage.data : null });
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
      console.error("[api/chats/edit] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/edit] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "edit_failed", detail }, { status: 502 });
  }
}

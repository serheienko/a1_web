// app/api/chats/reaction/add/route.ts
//
// 2026-09-06 (Aleksandr: "делаем реакции на сообщения... правой кнопкой
// мыши появляются как у нас сейчас есть эти реакции. Нажимаем — реакция
// ставится"). CONFIRMED off chat-server's own source (not the mobile
// client): messages.addReaction's own input type (packages/types/
// methods/messages_addReaction.d.ts) is `{ id, peerTo, reaction }` where
// `reaction` is JUST the emoji tag (`{ object: "reaction-emoji",
// emoticon }`) -- the reacting peer and the timestamp are both filled in
// server-side (addReaction.ts's own handler builds the PeerReaction
// itself from the authenticated session + `new Date()`, same as
// messages.send already does for peerFrom), never sent by the client.
//
// The method's own output type is a plain `boolean` (success/fail), NOT
// the updated message -- unlike messages.editMessage this never hands
// back a fresh message object to reconcile against, so the caller
// (app/chats/[chatId]/page.tsx's handleToggleReaction) applies its own
// optimistic local update and reverts it if this call fails, the same
// "optimistic + revert-on-catch" shape handleTogglePin already uses for
// pin/unpin.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const ReactionAddInput = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.number().int().positive(),
  // A real emoticon is 1-8 UTF-16 code units even with skin-tone/ZWJ
  // modifiers (e.g. "❤️" is 2) -- 16 leaves generous headroom
  // without accepting arbitrary text in this field.
  emoticon: z.string().trim().min(1).max(16),
});

export async function POST(request: NextRequest) {
  const parsed = ReactionAddInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId, emoticon } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.addReaction", {
      id: messageId,
      peerTo: peerForRouteParam(chatId),
      reaction: { object: "reaction-emoji", emoticon },
    });
    const response = NextResponse.json({ ok: data === true });
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
      console.error("[api/chats/reaction/add] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/reaction/add] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "reaction_add_failed", detail }, { status: 502 });
  }
}

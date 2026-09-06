// app/api/chats/reaction/delete/route.ts
//
// 2026-09-06 (Aleksandr: "при клике на неё повторном, если она уже
// поставлена, она убирается, эта реакция" -- the toggle-off half of the
// reactions feature). CONFIRMED off chat-server's own source:
// messages.deleteReaction's own input type (packages/types/methods/
// messages_deleteReaction.d.ts) wants `{ id, peerTo, reaction }` where
// `reaction` here is the FULL PeerReaction (`{ peer, date, reaction }`),
// not just the emoji -- deleteReaction.ts's own handler matches with
// `$pull: { reactions: peerReaction }`, an exact-object match against
// the array entry INCLUDING its original `date`. There is no "delete my
// reaction with this emoji" shortcut on the backend, so the caller
// (app/chats/[chatId]/page.tsx's handleToggleReaction) always sends back
// the exact entry it already has locally (from the same message's own
// deduped `reactions` array this app already renders), never a
// reconstructed date.
//
// Same boolean-only output / optimistic-update-with-revert shape as
// .../reaction/add/route.ts's own header explains.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam, PeerSchema } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const ReactionDeleteInput = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.number().int().positive(),
  emoticon: z.string().trim().min(1).max(16),
  // The exact `date` chat-server stamped onto this PeerReaction when it
  // was added -- required for the $pull exact-match above (see this
  // file's own header). Never generated here.
  date: z.string().trim().min(1),
  // Whose reaction this is -- always the current user's own peer-user
  // object in practice (the UI only ever offers to remove YOUR OWN
  // reaction), but PeerSchema is reused as-is rather than narrowed, same
  // "don't guess past what's confirmed" rule chat-schemas.ts's own
  // forwardFrom field follows.
  peer: PeerSchema,
});

export async function POST(request: NextRequest) {
  const parsed = ReactionDeleteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageId, emoticon, date, peer } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.deleteReaction", {
      id: messageId,
      peerTo: peerForRouteParam(chatId),
      reaction: { peer, date, reaction: { object: "reaction-emoji", emoticon } },
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
      console.error("[api/chats/reaction/delete] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/reaction/delete] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "reaction_delete_failed", detail }, { status: 502 });
  }
}

// app/api/chats/send/route.ts
//
// Phase 1 web chat (Aleksandr, 2026-09-01). POST { chatId, text } --
// proxies chat-server's `messages.send`. Request shape is this session's
// best inference (see lib/a1/chat-schemas.ts's header -- messages_send.
// d.ts couldn't be read): `{ peer, message, randomId }`. `message` as
// the field name matches this backend's `messages.*` naming convention
// throughout; `randomId` is the standard MTProto-style client-generated
// idempotency key for a send call (protects against a retried request
// double-posting) -- harmless to include even if chat-server ignores it,
// and cheap to drop later if it turns out to reject unknown fields
// instead (that would surface as an immediate 502 here, not a silent
// failure).
//
// FIELD NAME (2026-09-01): messages.getMessages turned out to want the
// peer under `peerTo`, not `peer` (confirmed live via Vercel Logs --
// see app/api/chats/messages/route.ts's header). Applying the same
// rename here pre-emptively since messages.* almost certainly shares
// one naming convention -- still unconfirmed for THIS endpoint
// specifically until a real send is tried; if it 502s with a 'peerTo'-
// shaped complaint instead, that's the next thing to read.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForChat } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const SendInput = z.object({
  chatId: z.string().trim().min(1),
  text: z.string().trim().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const parsed = SendInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, text } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.send", {
      peerTo: peerForChat(chatId),
      message: text,
      randomId: crypto.randomUUID(),
    });

    const response = NextResponse.json({ ok: true, raw: data });
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
      console.error("[api/chats/send] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/send] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "send_failed", detail }, { status: 502 });
  }
}

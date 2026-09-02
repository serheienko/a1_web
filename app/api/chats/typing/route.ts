// app/api/chats/typing/route.ts
//
// Phase 1 web chat (Aleksandr, 2026-09-01). POST { chatId } -- proxies
// chat-server's `messages.sendAction` to announce "I'm typing" in this
// chat. Best-effort, fire-and-forget by design: the client
// (components/chat-input.tsx) calls this on a debounce while the
// visitor types and does not surface a failure here to the UI at all --
// a typing indicator that occasionally doesn't fire is a non-event, not
// a bug worth interrupting anyone over.
//
// IMPORTANT SCOPE NOTE (see PLAN.md's chat master plan): this route only
// covers SENDING a typing action. Chat-server almost certainly delivers
// "so-and-so is typing" to the OTHER participant purely as a live WS
// event (MessageSendActionEvent, seen in packages/types/events/ during
// this session's research) -- not something messages.getMessages'
// polling response would ever surface. So on the current
// polling-for-MVP transport, sending this works, but no visitor will
// ever SEE anyone else's typing indicator yet -- that needs Phase 2's
// realtime relay (or a confirmed events.getUpdates cursor scheme) to
// close the loop. Wired up now anyway since it's a two-line proxy and
// the UI hook for it is needed either way.
//
// 2026-09-02: request shape confirmed directly off chat-server's own
// types (packages/types/methods/messages_sendAction.d.ts +
// resources/SendMessageAction.d.ts, read straight off the source this
// time): `peerTo` was already right, but `action` needed to be the
// typed `{ object: "action-typing" }` (this backend's `object`-tagged
// convention throughout, not a bare string) and `topMessage` (most
// recent known message id, required) was missing entirely -- 0 is this
// route's best-effort stand-in for "no known message id yet", since
// the client doesn't track one; chat-server's own doc comment says
// this field is just used to decide relevance, so a wrong/stale value
// degrades to "indicator maybe skipped", never a hard failure. `chatId`
// may also now be a real Chat _id OR the `u_<userId>` sentinel (see
// app/api/chats/open/route.ts) -- peerForRouteParam resolves either.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const TypingInput = z.object({
  chatId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = TypingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("messages.sendAction", {
      peerTo: peerForRouteParam(parsed.data.chatId),
      topMessage: 0,
      action: { object: "action-typing" },
    });
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false }, { status: 401 });
      clearSession(response);
      return response;
    }
    // Deliberately quiet (no console.error) beyond this -- see this
    // file's own header: a failed typing-action call is a non-event.
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

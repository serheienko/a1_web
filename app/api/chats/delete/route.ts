// app/api/chats/delete/route.ts
//
// 2026-09-03 (Aleksandr, photo-viewer spec: "кнопка удалить со
// всплывающим попапом... удалить для меня — просто... Сделаем только
// удалить для меня"). Confirmed off the OpenAPI spec:
// messages.deleteMessages needs `{ peerTo, ids: UInt[], revoke:
// boolean }` -- `revoke` is the "for everyone" branch chat-server
// exposes; explicitly scoped to "delete for me" only per Aleksandr's
// own instruction, so this route always sends `revoke: false` and
// never accepts one from the client. `ids` are real numeric per-chat
// message ids (MessageSchema's own `_id`, a sequential number
// transformed to a string client-side -- see lib/a1/chat-schemas.ts's
// own header on why), so the client must send the numeric form back.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const DeleteInput = z.object({
  chatId: z.string().trim().min(1),
  messageIds: z.array(z.number().int().positive()).min(1).max(50),
});

export async function POST(request: NextRequest) {
  const parsed = DeleteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, messageIds } = parsed.data;

  try {
    const { refreshedSession } = await callAsVisitor<unknown>("messages.deleteMessages", {
      peerTo: peerForRouteParam(chatId),
      ids: messageIds,
      revoke: false,
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
      console.error("[api/chats/delete] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/delete] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "delete_failed", detail }, { status: 502 });
  }
}

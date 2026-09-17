export const runtime = "nodejs";

// Поставить реакцию на комментарий. messages.addReaction ждёт
// { id, peerTo, reaction: { object: "reaction-emoji", emoticon } } --
// форма подтверждена в app/api/chats/reaction/add/route.ts, здесь
// меняется только адресат. См. app/api/comments/_shared.ts.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAsVisitor } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";
import { peerForPost } from "@/lib/a1/chat-schemas";
import { commentErrorResponse } from "../../_shared";

const Input = z.object({
  postId: z.string().trim().min(1),
  commentId: z.number().int().positive(),
  emoticon: z.string().trim().min(1).max(16),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  }
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.addReaction", {
      id: input.commentId,
      peerTo: peerForPost(input.postId),
      reaction: { object: "reaction-emoji", emoticon: input.emoticon },
    });
    // Бэкенд у этого метода отвечает просто true/false. false -- это
    // «не принял», и его надо отдать как отказ, а не как успех: иначе
    // чип остаётся стоять, а на сервере ничего нет.
    if (data === false) {
      return NextResponse.json({ ok: false, message: "rejected" }, { status: 409 });
    }
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    return commentErrorResponse("reaction/add", err);
  }
}

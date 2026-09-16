export const runtime = "nodejs";

// Снять свою реакцию с комментария.
//
// messages.deleteReaction удаляет запись ТОЧНЫМ совпадением всей
// структуры, включая дату, которую проставил сервер: «убери мою реакцию
// с этим эмодзи» там сделать нечем. Поэтому клиент присылает обратно то,
// что ему отдали при чтении (см. WebComment.reactions в
// lib/a1/comments.ts). Та же механика подтверждена в
// app/api/chats/reaction/delete/route.ts.

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
  date: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  }
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.deleteReaction", {
      id: input.commentId,
      peerTo: peerForPost(input.postId),
      reaction: {
        peer: { object: "peer-user", user: input.userId },
        date: input.date,
        reaction: { object: "reaction-emoji", emoticon: input.emoticon },
      },
    });
    const response = NextResponse.json({ ok: data !== false });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    return commentErrorResponse("reaction/delete", err);
  }
}

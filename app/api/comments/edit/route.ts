export const runtime = "nodejs";

// Правка своего комментария. messages.editMessage требует и `message`,
// и `entities` одновременно, и флаг 65 -- всё это выяснено живьём для
// чата (см. app/api/chats/edit/route.ts), здесь повторяется как есть.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAsVisitor } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";
import { MessageSchema, peerForPost } from "@/lib/a1/chat-schemas";
import { commentErrorResponse } from "../_shared";

// Тот же флаг, что и у правки сообщения в чате.
const EDITED_FLAG = 65;

const Input = z.object({
  postId: z.string().trim().min(1),
  commentId: z.number().int().positive(),
  text: z.string().trim().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  }
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.editMessage", {
      id: input.commentId,
      flags: EDITED_FLAG,
      peerTo: peerForPost(input.postId),
      message: input.text,
      entities: [{ object: "entity-text", text: input.text }],
    });
    const parsed = MessageSchema.safeParse(data);
    const response = NextResponse.json({ ok: true, message: parsed.success ? parsed.data : null });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    return commentErrorResponse("edit", err);
  }
}

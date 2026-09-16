export const runtime = "nodejs";

// Удаление комментария. messages.deleteMessages ждёт
// { peerTo, ids, revoke } -- `revoke` это «у всех», без него удаление
// только у себя. Форма подтверждена в app/api/chats/delete/route.ts.
//
// Комментарий публичный, поэтому здесь revoke всегда true: «удалить
// только у себя» под вакансией не имеет смысла -- остальные его всё
// равно видят, а человек будет считать, что убрал.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callAsVisitor } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";
import { peerForPost } from "@/lib/a1/chat-schemas";
import { commentErrorResponse } from "../_shared";

const Input = z.object({
  postId: z.string().trim().min(1),
  commentIds: z.array(z.number().int().positive()).min(1).max(50),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  }
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.deleteMessages", {
      peerTo: peerForPost(input.postId),
      ids: input.commentIds,
      revoke: true,
    });
    const response = NextResponse.json({ ok: data !== false });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    return commentErrorResponse("delete", err);
  }
}

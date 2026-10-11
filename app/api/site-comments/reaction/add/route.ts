export const runtime = "nodejs";

// Реакция на комментарий. Одна реакция от человека на комментарий: новая
// заменяет прежнюю (так же ведёт себя клиент под вакансиями).
import { NextRequest } from "next/server";
import { z } from "zod";
import { mutateThread, CodeError } from "@/lib/comments/site-store";
import { identify, keyOf, failure, success, authFailure } from "@/lib/comments/site-comments";

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
    return failure("bad_input", 400);
  }
  const key = keyOf(input.postId);
  if (!key) return failure("bad_input", 400);
  let who, refreshed;
  try {
    ({ who, refreshed } = await identify());
  } catch (err) {
    return authFailure(err);
  }
  const res = await mutateThread(key.kind, key.slug, (thread) => {
    const c = thread.items.find((x) => x.id === input.commentId);
    if (!c) throw new CodeError("not_found");
    c.reactions = c.reactions.filter((r) => r.userId !== who.userId);
    c.reactions.push({
      emoticon: input.emoticon,
      userId: who.userId,
      date: new Date().toISOString(),
      name: who.name,
      avatarUrl: who.avatarUrl,
    });
  });
  if (!res.ok) return failure(res.code, res.code === "not_found" ? 404 : 502, refreshed);
  return success({}, refreshed);
}

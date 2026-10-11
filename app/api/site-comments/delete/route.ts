export const runtime = "nodejs";

// Удаление своего комментария.
import { NextRequest } from "next/server";
import { z } from "zod";
import { mutateThread, CodeError } from "@/lib/comments/site-store";
import { identify, keyOf, failure, success, authFailure } from "@/lib/comments/site-comments";

const Input = z.object({
  postId: z.string().trim().min(1),
  commentIds: z.array(z.number().int().positive()).min(1).max(1),
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
  const id = input.commentIds[0];
  const res = await mutateThread(key.kind, key.slug, (thread) => {
    const i = thread.items.findIndex((x) => x.id === id);
    if (i < 0) throw new CodeError("not_found");
    if (thread.items[i]!.authorId !== who.userId) throw new CodeError("forbidden");
    thread.items.splice(i, 1);
  });
  if (!res.ok) return failure(res.code, res.code === "forbidden" ? 403 : res.code === "not_found" ? 404 : 502, refreshed);
  return success({}, refreshed);
}

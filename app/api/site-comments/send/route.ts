export const runtime = "nodejs";

// Новый комментарий под новостью/событием. Пишет только вошедший
// (тот же вход, что и под вакансиями): под комментарием стоит имя.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MessageMediaDocumentSchema } from "@/lib/a1/chat-schemas";
import { mutateThread, CodeError, MAX_COMMENTS_PER_THREAD } from "@/lib/comments/site-store";
import { identify, pageExists, keyOf, toWire, failure, success, authFailure, tooFast } from "@/lib/comments/site-comments";

const Input = z.object({
  postId: z.string().trim().min(1),
  text: z.string().trim().max(4000).optional(),
  // Наліпка/гифка: панель отдаёт документ целиком.
  media: z.array(z.record(z.string(), z.unknown())).max(1).optional(),
  replyTo: z.object({ commentId: z.number().int().positive(), userId: z.string().trim().min(1) }).optional(),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await request.json());
  } catch {
    return failure("bad_input", 400);
  }
  const key = keyOf(input.postId);
  const text = input.text?.trim() ?? "";
  let media: unknown[] = [];
  if (input.media && input.media.length > 0) {
    const parsed = MessageMediaDocumentSchema.safeParse({ ...input.media[0], object: "media-doc" });
    if (!parsed.success || JSON.stringify(parsed.data).length > 30_000) return failure("bad_input", 400);
    media = [parsed.data];
  }
  if (!key || (!text && media.length === 0)) return failure("bad_input", 400);

  let who, refreshed;
  try {
    ({ who, refreshed } = await identify());
  } catch (err) {
    return authFailure(err);
  }
  if (tooFast(who.userId)) return failure("too_fast", 429, refreshed);
  if (!(await pageExists(key.kind, key.slug))) return failure("not_found", 404, refreshed);

  const res = await mutateThread(key.kind, key.slug, (thread) => {
    if (thread.items.length >= MAX_COMMENTS_PER_THREAD) throw new CodeError("full");
    const replyTarget = input.replyTo ? thread.items.find((c) => c.id === input.replyTo!.commentId) : null;
    const comment = {
      id: thread.nextId,
      authorId: who.userId,
      authorName: who.name,
      authorUsername: who.username,
      authorAvatarUrl: who.avatarUrl,
      text,
      media,
      createdAt: new Date().toISOString(),
      editedAt: null,
      replyToId: replyTarget ? replyTarget.id : null,
      reactions: [],
    };
    thread.nextId += 1;
    thread.items.push(comment);
    return comment;
  });
  if (!res.ok) return failure(res.code, res.code === "full" ? 409 : 502, refreshed);
  const wire = toWire(res.value);
  // `message` -- в той же форме, на которую смотрит клиент под вакансиями.
  return success({ message: { _id: wire.id, media: wire.media }, comment: wire }, refreshed);
}

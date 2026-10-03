// app/api/chats/threads/route.ts
//
// Темы группы (волна 3, 2026-10-03). GET ?chat=<groupId> -- список тем
// этой группы для окна «Теми»: у каждой id чата-темы, название (первая
// строка корневого сообщения), автор корня, число ответов, непрочитанные
// и время последнего ответа. Источник -- chats.getChats (чаты с флагом
// THREAD и thread.chat == группа) плюс messages.get за корневыми
// сообщениями одним запросом.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import { extractChats } from "@/lib/a1/chat-schemas";
import { CHAT_FLAG_THREAD } from "@/lib/a1/group-chat";
import { threadRootFrom, unreadInChat, lastMessageId, type ThreadRoot } from "@/lib/a1/group-threads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type TopicItem = {
  chatId: string;
  messageId: number;
  root: ThreadRoot | null;
  replies: number;
  unread: number;
  lastAt: string | null;
};

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("chat")?.trim();
  if (!groupId) return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  try {
    const session = await readSession();
    const myUserId = session?.userId ?? null;
    const { data, refreshedSession } = await callAsVisitor<unknown>("chats.getChats", {});
    const threads = extractChats(data).filter((c) => {
      if ((c.flags & CHAT_FLAG_THREAD) === 0) return false;
      const th = (c as unknown as { thread?: { chat?: unknown } | null }).thread;
      return !!th && th.chat === groupId;
    });
    const ids = threads
      .map((c) => Number((c as unknown as { thread?: { message?: unknown } }).thread?.message))
      .filter((n) => Number.isFinite(n) && n > 0);
    const roots = new Map<number, ThreadRoot | null>();
    const lastAtById = new Map<number, string | null>();
    if (ids.length > 0) {
      try {
        const { data: md } = await callAsVisitor<unknown>("messages.get", [
          { peerTo: { object: "peer-chat", chat: groupId }, ids },
        ]);
        const first = Array.isArray(md) ? (md[0] as { messages?: unknown[] } | undefined) : undefined;
        for (const m of first?.messages ?? []) {
          const id = Number((m as { _id?: unknown })._id);
          if (!Number.isFinite(id)) continue;
          roots.set(id, threadRootFrom(m));
          const t = (m as { thread?: { lastReplyAt?: unknown } | null }).thread;
          lastAtById.set(id, t && typeof t.lastReplyAt === "string" ? t.lastReplyAt : null);
        }
      } catch (err) {
        console.error("[api/chats/threads] messages.get failed:", err);
      }
    }
    const topics: TopicItem[] = threads.map((c) => {
      const raw = c as unknown as { thread?: { message?: unknown } };
      const messageId = Number(raw.thread?.message);
      const lm = (c as unknown as { lastMessage?: unknown }).lastMessage;
      const replies = lastMessageId(lm);
      return {
        chatId: c._id,
        messageId,
        root: roots.get(messageId) ?? null,
        replies,
        unread: unreadInChat(c as unknown as { lastMessage?: unknown; participants?: unknown }, myUserId),
        lastAt: lastAtById.get(messageId) ?? null,
      };
    });
    topics.sort((a, b) => Date.parse(b.lastAt ?? "") - Date.parse(a.lastAt ?? "") || b.messageId - a.messageId);
    const res = NextResponse.json({ ok: true, topics });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    if (err instanceof A1ApiError) console.error("[api/chats/threads] failed:", err.httpStatus, err.body.slice(0, 500));
    else console.error("[api/chats/threads] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "threads_failed" }, { status: 502 });
  }
}

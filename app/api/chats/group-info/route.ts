// app/api/chats/group-info/route.ts
//
// Группы в чатах (волна 1, 2026-10-03). GET ?chat=<chatId> -- данные одной
// группы для окна чата: название, фото, число участников, моя роль и
// список участников с именами и аватарками (по ним окно чата подписывает
// авторов сообщений и разворачивает имена в служебных строках).
//
// Источник -- тот же chats.getChats, что и у списка чатов (Resource.Chat
// уже несёт participants[{type, user, ...}], type: 1 создатель, 2 админ,
// 3 участник -- packages/constants бэкенда), плюс users.getUsers за
// именами. Для личного чата просто отвечает isGroup:false.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, readSession } from "@/lib/a1/session";
import { extractChats } from "@/lib/a1/chat-schemas";
import { isGroupFlags, CHAT_FLAG_PUBLIC, CHAT_FLAG_THREAD } from "@/lib/a1/group-chat";
import { threadRootFrom, unreadInChat, lastMessageId, type ThreadRoot } from "@/lib/a1/group-threads";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type GroupMember = {
  id: string;
  name: string;
  username: string | null;
  photo: string | null;
  role: "creator" | "admin" | "member";
};

/** Тема группы в сводке для полосок под сообщениями (волна 3). */
export type GroupThreadBrief = { chatId: string; messageId: number; replies: number; unread: number };

/** Если чат -- тема: где она висит и что за корневое сообщение. */
export type ThreadOf = { groupId: string; messageId: number; root: ThreadRoot | null };

export type GroupInfoResponse =
  | { ok: true; isGroup: false }
  | {
      ok: true;
      isGroup: true;
      id: string;
      title: string;
      about: string;
      photo: string | null;
      isPublic: boolean;
      inviteLink: string | null;
      muted: boolean;
      pinned: boolean;
      memberCount: number;
      myRole: "creator" | "admin" | "member" | null;
      members: GroupMember[];
      /** Чат -- тема под сообщением другой группы (иначе null). */
      thread: ThreadOf | null;
      /** Для обычной группы: её темы с числом ответов и непрочитанными. */
      threads: GroupThreadBrief[];
    };

function roleOf(type: unknown): GroupMember["role"] {
  return type === 1 ? "creator" : type === 2 ? "admin" : "member";
}

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chat")?.trim();
  if (!chatId) return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  try {
    const session = await readSession();
    const myUserId = session?.userId ?? null;
    const { data, refreshedSession } = await callAsVisitor<unknown>("chats.getChats", {});
    const chat = extractChats(data).find((c) => c._id === chatId);
    if (!chat || !isGroupFlags(chat.flags)) {
      const res = NextResponse.json({ ok: true, isGroup: false } satisfies GroupInfoResponse);
      if (refreshedSession) setSession(res, refreshedSession);
      return res;
    }
    const raw = chat as unknown as Record<string, unknown>;
    const parts = (Array.isArray(chat.participants) ? chat.participants : []) as unknown as Array<Record<string, unknown>>;
    const peopleParts = parts.filter((p) => p.object === "peer-user" && typeof p.user === "string");
    const ids = Array.from(new Set(peopleParts.map((p) => String(p.user))));
    const names: Record<string, { name: string; username: string | null; photo: string | null }> = {};
    if (ids.length > 0) {
      try {
        const { data: ud } = await callAsVisitor<unknown>("users.getUsers", { ids });
        for (const rawUser of Array.isArray(ud) ? ud : []) {
          const p = parseUserProfile(rawUser);
          if (!p || p.object !== "user") continue;
          names[p._id] = {
            name: [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.username || "",
            username: p.username ?? null,
            photo: p.photos[0] ? buildMediaProxyUrl(p.photos[0]) : null,
          };
        }
      } catch (err) {
        console.error("[api/chats/group-info] users.getUsers failed:", err);
      }
    }
    const members: GroupMember[] = peopleParts.map((p) => {
      const id = String(p.user);
      const u = names[id];
      return { id, name: u?.name ?? "", username: u?.username ?? null, photo: u?.photo ?? null, role: roleOf(p.type) };
    });
    const me = members.find((m) => m.id === myUserId);
    // Волна 3 (темы): либо этот чат сам тема -- тогда отдаём, где она
    // висит, и корневое сообщение; либо это группа -- тогда сводку по её
    // темам (число ответов, непрочитанные) для полосок под сообщениями.
    let thread: ThreadOf | null = null;
    const threads: GroupThreadBrief[] = [];
    const myUid = myUserId;
    if (((chat.flags ?? 0) & CHAT_FLAG_THREAD) !== 0) {
      const th = (raw.thread ?? null) as { chat?: unknown; message?: unknown } | null;
      const groupId = th && typeof th.chat === "string" ? th.chat : "";
      const messageId = th ? Number(th.message) : NaN;
      if (groupId && Number.isFinite(messageId)) {
        let root: ThreadRoot | null = null;
        try {
          const { data: md } = await callAsVisitor<unknown>("messages.get", [
            { peerTo: { object: "peer-chat", chat: groupId }, ids: [messageId] },
          ]);
          const first = Array.isArray(md) ? (md[0] as { messages?: unknown[] } | undefined) : undefined;
          root = threadRootFrom(first?.messages?.[0]);
        } catch (err) {
          console.error("[api/chats/group-info] root fetch failed:", err);
        }
        thread = { groupId, messageId, root };
      }
    } else {
      for (const c of extractChats(data)) {
        if (((c.flags ?? 0) & CHAT_FLAG_THREAD) === 0) continue;
        const th = ((c as unknown as { thread?: { chat?: unknown; message?: unknown } | null }).thread ?? null);
        if (!th || th.chat !== chat._id) continue;
        const lm = (c as unknown as { lastMessage?: unknown }).lastMessage;
        threads.push({
          chatId: c._id,
          messageId: Number(th.message),
          replies: lastMessageId(lm),
          unread: unreadInChat(c as unknown as { lastMessage?: unknown; participants?: unknown }, myUid),
        });
      }
    }
    const body: GroupInfoResponse = {
      ok: true,
      isGroup: true,
      id: chat._id,
      title: String(raw.title ?? ""),
      about: typeof raw.about === "string" ? raw.about : "",
      photo: typeof raw.photo === "string" ? raw.photo : null,
      isPublic: ((chat.flags ?? 0) & CHAT_FLAG_PUBLIC) !== 0,
      inviteLink: typeof raw.inviteLink === "string" ? raw.inviteLink : null,
      muted: ((raw.notifySettings ?? {}) as { silent?: unknown }).silent === true,
      pinned: typeof raw.pinnedAt === "string" && raw.pinnedAt.length > 0,
      memberCount: members.length,
      myRole: me?.role ?? null,
      members,
      thread,
      threads,
    };
    const res = NextResponse.json(body);
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(res);
      return res;
    }
    if (err instanceof A1ApiError) console.error("[api/chats/group-info] failed:", err.httpStatus, err.body.slice(0, 500));
    else console.error("[api/chats/group-info] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "group_info_failed" }, { status: 502 });
  }
}

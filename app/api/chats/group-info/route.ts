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
import { isGroupFlags, CHAT_FLAG_PUBLIC } from "@/lib/a1/group-chat";
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
      memberCount: number;
      myRole: "creator" | "admin" | "member" | null;
      members: GroupMember[];
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
    const body: GroupInfoResponse = {
      ok: true,
      isGroup: true,
      id: chat._id,
      title: String(raw.title ?? ""),
      about: typeof raw.about === "string" ? raw.about : "",
      photo: typeof raw.photo === "string" ? raw.photo : null,
      isPublic: ((chat.flags ?? 0) & CHAT_FLAG_PUBLIC) !== 0,
      memberCount: members.length,
      myRole: me?.role ?? null,
      members,
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

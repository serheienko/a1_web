// POST {chat, unread} -> chats.markUnread. «Позначити непрочитаним» /
// «Позначити прочитаним» в меню чата: серверная отметка (chat.unreadMark),
// общая с приложением -- у чата в списке горит точка, пока её не снимут.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ chat: z.string().trim().min(1).max(100), unread: z.boolean() });

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "mark-unread",
    schema: Input,
    call: (i) => ({ method: "chats.markUnread", body: { chat: i.chat, unread: i.unread } }),
  });
}

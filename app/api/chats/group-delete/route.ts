// POST {chat} -> chats.deleteChat (только создатель): группа удаляется
// у всех участников.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ chat: z.string().trim().min(1) });

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-delete",
    schema: Input,
    call: (i) => ({ method: "chats.deleteChat", body: { chat: i.chat } }),
  });
}

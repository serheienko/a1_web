// POST {chat, pinned} -> chats.setPinned: закрепить/открепить чат сверху
// СВОЕГО списка (не больше 5). Работает для любого чата, не только групп.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ chat: z.string().trim().min(1), pinned: z.boolean() });

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "set-pinned",
    schema: Input,
    call: (i) => ({ method: "chats.setPinned", body: { chat: i.chat, pinned: i.pinned } }),
    shape: (_d, i) => ({ pinned: i.pinned }),
  });
}

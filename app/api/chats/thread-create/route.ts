// POST {chat, message} -> chats.createThread {chatId}. «Обговорити окремо»:
// открывает тему под сообщением группы (если она уже есть -- возвращает
// её же, как в приложении) и отдаёт id чата-темы.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({
  chat: z.string().trim().min(1).max(100),
  message: z.number().int().positive(),
});

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "thread-create",
    schema: Input,
    call: (i) => ({ method: "chats.createThread", body: { chat: i.chat, message: i.message } }),
    shape: (data) => ({
      chatId: data && typeof (data as { chatId?: unknown }).chatId === "string" ? (data as { chatId: string }).chatId : null,
    }),
  });
}

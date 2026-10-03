// POST {hash} -> chats.joinByInviteLink {chatId}. Сервер сам ставит
// «X joined the group via invite link».
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ hash: z.string().trim().min(1).max(300) });

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-join",
    schema: Input,
    call: (i) => ({ method: "chats.joinByInviteLink", body: { hash: i.hash } }),
    shape: (data) => ({ chatId: data && typeof (data as { chatId?: unknown }).chatId === "string" ? (data as { chatId: string }).chatId : null }),
  });
}

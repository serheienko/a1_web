// POST {chat, add?: userId[], remove?: userId[]} -> chats.addParticipants /
// chats.deleteParticipants. Добавлять может любой участник, убирать --
// создатель/админ (иначе бэкенд ответит «not allowed», а мы -- 403).
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z
  .object({
    chat: z.string().trim().min(1),
    add: z.array(z.string().trim().min(1)).max(200).optional(),
    remove: z.array(z.string().trim().min(1)).max(200).optional(),
  })
  .refine((v) => (v.add?.length ?? 0) + (v.remove?.length ?? 0) > 0);

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-members",
    schema: Input,
    call: (i) =>
      i.add && i.add.length > 0
        ? { method: "chats.addParticipants", body: { chat: i.chat, peers: i.add.map((user) => ({ object: "peer-user", user })) } }
        : { method: "chats.deleteParticipants", body: { chat: i.chat, peers: (i.remove ?? []).map((user) => ({ object: "peer-user", user })) } },
  });
}

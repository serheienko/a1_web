// POST {hash} -> chats.checkInviteLink: что за группа за ссылкой (до
// вступления). hash -- хвост ссылки или ссылка целиком.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ hash: z.string().trim().min(1).max(300) });

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-invite-check",
    schema: Input,
    call: (i) => ({ method: "chats.checkInviteLink", body: { hash: i.hash } }),
    shape: (data) => {
      const d = (data ?? {}) as Record<string, unknown>;
      return {
        chatId: typeof d.chatId === "string" ? d.chatId : null,
        title: typeof d.title === "string" ? d.title : "",
        photo: typeof d.photo === "string" ? d.photo : null,
        memberCount: typeof d.memberCount === "number" ? d.memberCount : 0,
        isPublic: d.isPublic === true,
        isMember: d.isMember === true,
      };
    },
  });
}

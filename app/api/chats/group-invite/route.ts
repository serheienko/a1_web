// POST {chat, revoke?} -> chats.exportInviteLink {link, hash}.
// Первый вызов создаёт ссылку, revoke:true заменяет её новой.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ chat: z.string().trim().min(1), revoke: z.boolean().optional() });

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-invite",
    schema: Input,
    call: (i) => ({ method: "chats.exportInviteLink", body: { chat: i.chat, ...(i.revoke ? { revoke: true } : {}) } }),
    shape: (data) => {
      const d = (data ?? {}) as { link?: unknown; hash?: unknown };
      return { link: typeof d.link === "string" ? d.link : null, hash: typeof d.hash === "string" ? d.hash : null };
    },
  });
}

// POST {chat, mute} -> account.updateNotifySettings для peer-chat.
// Те же настройки, что у /api/users/mute (muteUntil -- «навсегда»).
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({ chat: z.string().trim().min(1), mute: z.boolean() });
const MUTE_FOREVER_SECONDS = 10 * 365 * 24 * 60 * 60;

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-mute",
    schema: Input,
    call: (i) => ({
      method: "account.updateNotifySettings",
      body: {
        peer: { object: "peer-chat", chat: i.chat },
        settings: i.mute
          ? { silent: true, hidePreviews: false, sound: { object: "notification-sound-none" }, muteUntil: Math.floor(Date.now() / 1000) + MUTE_FOREVER_SECONDS }
          : { silent: false, hidePreviews: false, sound: { object: "notification-sound-default" }, muteUntil: null },
      },
    }),
    shape: (_d, i) => ({ muted: i.mute }),
  });
}

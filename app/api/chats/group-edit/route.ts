// POST {chat, title?, about?, photoFileReference?, removePhoto?, public?}
// -> chats.editChat (меняются только переданные поля). Служебные строки
// «X changed the group name…» ставит сервер.
import { z } from "zod";
import { proxyChatCall } from "@/lib/a1/chat-proxy";

export const runtime = "nodejs";

const Input = z.object({
  chat: z.string().trim().min(1),
  title: z.string().trim().min(1).max(128).optional(),
  about: z.string().max(512).optional(),
  photoFileReference: z.string().trim().min(1).optional(),
  removePhoto: z.boolean().optional(),
  public: z.boolean().optional(),
});

export async function POST(request: Request) {
  return proxyChatCall(request, {
    tag: "group-edit",
    schema: Input,
    call: (i) => ({
      method: "chats.editChat",
      body: {
        chat: i.chat,
        ...(i.title !== undefined ? { title: i.title } : {}),
        ...(i.about !== undefined ? { about: i.about } : {}),
        ...(i.removePhoto ? { photo: null } : i.photoFileReference ? { photo: { fileReference: i.photoFileReference } } : {}),
        ...(i.public !== undefined ? { public: i.public } : {}),
      },
    }),
  });
}

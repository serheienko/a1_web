// 28.10.2026: что за группа за ссылкой-приглашением, для превью ссылки
// (og:image и заголовок). Сервисным аккаунтом, без посетителя.
import { cache } from "react";
import { call } from "@/lib/a1/client";

export type InvitePreview = { chatId: string | null; title: string; photo: string | null; memberCount: number; description: string | null };

export const fetchInvitePreview = cache(async function fetchInvitePreview(hash: string): Promise<InvitePreview | null> {
  try {
    const d = (await call<Record<string, unknown>>("chats.checkInviteLink", { hash }, { timeoutMs: 6000 })) ?? {};
    const title = typeof d.title === "string" ? d.title.trim() : "";
    if (!title) return null;
    return {
      chatId: typeof d.chatId === "string" ? d.chatId : null,
      title,
      photo: typeof d.photo === "string" ? d.photo : null,
      memberCount: typeof d.memberCount === "number" ? d.memberCount : 0,
      // Описания у групп пока нет в ответе бэкенда; появится -- покажем.
      description: [d.description, d.about].find((v): v is string => typeof v === "string" && v.trim() !== "")?.trim() ?? null,
    };
  } catch {
    return null;
  }
});

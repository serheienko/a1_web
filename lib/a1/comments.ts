// lib/a1/comments.ts
//
// Комментарии под вакансией. 2026-09-16, по просьбе Александра: «у нас
// это есть в приложении, и это надо сделать точно так же на сайте».
//
// Главное, что надо знать про этот бэкенд: отдельного API комментариев
// НЕТ. Комментарий -- это обычное сообщение чата, у которого собеседник
// не человек, а пост. Подтверждено по коду приложения (lib/features/
// comments/data/data_sources/comment_datasource.dart): те же четыре
// метода, что и в переписке, меняется только peerTo. Поэтому здесь нет
// ни новых схем сообщений, ни своего разбора -- всё берётся из
// lib/a1/chat-schemas.ts, который уже проверен живым чатом.
//
// Читаем СЕРВЕРОМ, служебным аккаунтом (Александр, 16 сентября: «Да,
// пусть видят»). То есть комментарии видны и незалогиненному гостю, и
// поисковику. Причина не в удобстве: текст самих вакансий у нас чужой,
// спарсенный, и слово в слово совпадает с источником. Комментарии --
// единственный текст на странице, которого нет больше нигде, и именно
// он отличает нашу страницу от копии.
//
// Если бэкенд служебному аккаунту читать не даст -- функция вернёт
// пустой список, страница отрисуется как раньше, и это будет видно в
// логах. Ни одна вакансия не должна упасть из-за комментариев.

import { call } from "./client";
import {
  extractMessages,
  extractMessageText,
  messageDateMs,
  messageDocumentMedia,
  peerForPost,
  type MessageMediaDocument,
} from "./chat-schemas";
import { parseUserProfile } from "./schemas";
import { buildMediaProxyUrl } from "./media-proxy";

export type WebComment = {
  id: string;
  /** Автор: null, когда бэкенд не отдал профиль (удалён, скрыт). */
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  authorId: string | null;
  text: string;
  /** Комментарий без текста -- одна наліпка или гифка. */
  mediaOnly: boolean;
  /** Вложения: наліпки и гифки. Разбираются тем же
   *  messageDocumentMedia, что и вложения сообщения в чате, и рисуются
   *  теми же компонентами -- своего разбора у комментариев нет. */
  media: MessageMediaDocument[];
  createdAt: Date;
  /** Отредактирован -- под текстом показывается пометка. */
  editedAt: Date | null;
  /** Ответ: на какой комментарий. Сам текст цитаты бэкенд не присылает
   *  (см. MessageReplyToSchema в lib/a1/chat-schemas.ts -- там только
   *  номер), поэтому страница ищет его в уже загруженном списке -- ровно
   *  так же, как это делает чат. */
  replyToId: string | null;
  /** Реакции: эмодзи и кто его поставил. `date` нужен, чтобы реакцию
   *  можно было СНЯТЬ: бэкенд удаляет её точным совпадением всей
   *  записи, включая дату, -- «убери мою реакцию с этим эмодзи» там
   *  сделать нечем (см. app/api/chats/reaction/delete/route.ts). */
  reactions: { emoticon: string; by: { userId: string; date: string }[] }[];
};

// Столько же, сколько чат грузит за раз (app/api/chats/messages).
const COMMENTS_LIMIT = 50;

export async function fetchPostComments(postId: string): Promise<WebComment[]> {
  let messages;
  try {
    const raw = await call<unknown>("messages.getMessages", {
      peerTo: peerForPost(postId),
      limit: COMMENTS_LIMIT,
    });
    messages = extractMessages(raw);
  } catch (err) {
    console.warn("[comments] messages.getMessages failed:", err instanceof Error ? err.message : err);
    return [];
  }

  if (messages.length === 0) return [];

  // Имени и аватарки внутри сообщения нет -- только идентификатор
  // автора (peerFrom.user). Достаём всех разом одним запросом: тот же
  // users.getUsers, которым уже пользуется lib/a1/admin-applications.ts.
  const authorIds = [...new Set(messages.map((m) => m.fromId).filter((id): id is string => !!id))];
  const authors = new Map<string, { name: string; username: string | null; avatarUrl: string | null }>();

  if (authorIds.length > 0) {
    try {
      const usersRaw = await call<unknown>("users.getUsers", { ids: authorIds });
      for (const raw of Array.isArray(usersRaw) ? usersRaw : []) {
        const profile = parseUserProfile(raw);
        if (!profile || profile.object !== "user") continue;
        const photo = profile.photos[0];
        authors.set(profile._id, {
          // Пробелы схлопываются: в профилях попадаются имена с
          // хвостовым пробелом, и склейка давала «Aleksandr  Serheienko»
          // с двойным пробелом (видно живьём на странице вакансии).
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
          username: profile.username,
          avatarUrl: photo ? buildMediaProxyUrl(photo) : null,
        });
      }
    } catch (err) {
      // Комментарий без имени всё равно лучше, чем отсутствие
      // комментария: сам текст -- и есть содержание.
      console.warn("[comments] users.getUsers failed:", err instanceof Error ? err.message : err);
    }
  }

  return messages.map((msg) => {
    const author = msg.fromId ? authors.get(msg.fromId) : undefined;
    const text = extractMessageText(msg).trim();
    const media = messageDocumentMedia(msg);

    // Реакции приходят по одной на каждого поставившего; для показа их
    // надо сгруппировать по эмодзи, сохранив, кто именно поставил.
    const grouped = new Map<string, { userId: string; date: string }[]>();
    for (const r of msg.reactions) {
      const emoticon = typeof r.reaction?.emoticon === "string" ? r.reaction.emoticon : "";
      if (!emoticon) continue;
      const peer = r.peer;
      const userId = peer && peer.object === "peer-user" ? peer.user : null;
      const bucket = grouped.get(emoticon) ?? [];
      if (userId) bucket.push({ userId, date: r.date });
      grouped.set(emoticon, bucket);
    }

    return {
      id: msg._id,
      authorName: author?.name || "A1",
      authorUsername: author?.username ?? null,
      authorAvatarUrl: author?.avatarUrl ?? null,
      authorId: msg.fromId,
      text,
      mediaOnly: text === "" && media.length > 0,
      media,
      createdAt: new Date(messageDateMs(msg)),
      editedAt: msg.editedAt ? new Date(msg.editedAt) : null,
      replyToId: msg.replyTo?.message ?? null,
      reactions: [...grouped.entries()].map(([emoticon, by]) => ({ emoticon, by })),
    };
  });
}

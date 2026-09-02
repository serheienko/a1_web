// lib/a1/chat-mappers.ts
//
// Display-ready helpers built on top of lib/a1/chat-schemas.ts's raw
// Chat/ChatUser/ChatMessage types -- see that file's header for the
// confirmed-vs-inferred shape caveats this all inherits.
import { pickDefaultCatAvatar } from "@/lib/avatars";
import {
  type Chat,
  type ChatUser,
  isPersonalChat,
  otherParticipantUserId,
} from "./chat-schemas";

export type ChatDisplay = {
  title: string;
  photoUrl: string | null;
  isPersonal: boolean;
  // Present only for a personal chat whose other participant resolved
  // against the `users` side array -- null for a group chat, or a
  // personal chat where that lookup came back empty (chats.getChats
  // didn't return a `users` array, or this participant wasn't in it).
  otherUserId: string | null;
  // 2026-09-02: same resolution as otherUserId above, added so
  // app/api/chats/list/route.ts can hand the chat window a ?username=
  // to link the header's name/avatar to that person's profile
  // (Aleksandr: "при нажатии на аватар и на имя должен открываться
  // профіль цієї людини") -- null under the exact same conditions
  // otherUserId is.
  otherUsername: string | null;
};

/**
 * Resolve one Chat into what the list row / chat header actually shows.
 * A personal chat prefers the other participant's real name/photo (from
 * the `users` map, when present); a group chat -- or a personal chat
 * with no resolvable participant -- falls back to the chat's own title
 * and a generic avatar, same fail-closed convention as every other
 * "resolve a denormalized user reference" spot in this app
 * (app/api/contacts/list/route.ts's contactUsers, lib/a1/mappers.ts's
 * mapAuthor).
 */
export function resolveChatDisplay(
  chat: Chat,
  myUserId: string | null,
  users: Record<string, ChatUser>,
): ChatDisplay {
  const otherId = otherParticipantUserId(chat, myUserId);
  const otherUser = otherId ? users[otherId] : undefined;

  if (otherUser) {
    const fullName = [otherUser.firstName, otherUser.lastName].filter(Boolean).join(" ").trim();
    return {
      title: fullName || otherUser.username || chat.title || "",
      photoUrl: otherUser.photo ?? null,
      isPersonal: true,
      otherUserId: otherId,
      otherUsername: otherUser.username ?? null,
    };
  }

  return {
    title: chat.title || "",
    photoUrl: null,
    isPersonal: isPersonalChat(chat),
    otherUserId: otherId,
    otherUsername: null,
  };
}

/** Same seeded-cat fallback every other avatar-less entity in this app uses. */
export function chatAvatarSeed(chat: Chat, display: ChatDisplay): string {
  return display.otherUserId ?? chat._id;
}

export function pickChatAvatar(chat: Chat, display: ChatDisplay): string {
  return display.photoUrl ?? pickDefaultCatAvatar(chatAvatarSeed(chat, display));
}

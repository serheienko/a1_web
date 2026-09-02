// components/chat/contact-message-card.tsx
//
// 2026-09-02, Aleksandr (native-app "sent contact" card screenshot: name,
// occupation pill, phone row, rocket-icon expertise row, a "Message"
// button) -- renders a media-contact message (lib/a1/chat-schemas.ts's
// messageContactMedia) or a not-yet-sent picked-contact preview with the
// same layout. Follows this chat page's own existing "mine vs theirs"
// bubble-media treatment (bg-white/15 on a blue bubble, bg-black/5 /
// dark:bg-white/10 on a white/dark one -- see app/chats/[chatId]/
// page.tsx's docMedia rendering for the pattern this copies) rather than
// the native app's own flat-blue card chrome -- content/behavior parity,
// not literal pixel parity, same principle already applied to
// components/daily-uploads-modal.tsx.
//
// Explicitly only the "Message" button is a click target (Aleksandr,
// confirming this via AskUserQuestion: "Функциональный тап только по
// кнопке message") -- the rest of the card is inert, unlike
// app/contacts/page.tsx's own contact rows which split avatar-tap
// (profile) vs icon-tap (chat) into two targets. That richer split was
// deliberately NOT carried over here; this is a simpler single-action
// card.
//
// occupation pill only shows when `summary.occupation` matches one of
// the three known values (components/occupation-labels.ts, client-safe
// static table, same one app/u/[username]/page.tsx uses) -- an empty or
// unrecognized value renders no pill, same fallback behavior as that
// page's own occupationLabel lookup. `summary` is undefined while the
// batch /api/users/summaries fetch (or, for a picked-not-yet-sent
// contact, the picker's own /api/contacts/list fetch) hasn't resolved
// yet, and null when it resolved to "no usable profile" (deleted/
// unparseable account) -- both render the card with just name+phone,
// no pill/expertise row, never a loading spinner (this is secondary
// information, not worth a layout jump for).
"use client";

import { ChatExpertiseIcon, ChatPhoneIcon } from "@/components/chat/icons";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { OCCUPATION_LABELS } from "@/components/occupation-labels";
import { T } from "@/components/t";

export type ContactCardSummary = {
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  occupation: string;
  expertise: string | null;
};

export function ContactMessageCard({
  userId,
  firstName,
  lastName,
  phoneNumber,
  summary,
  mine,
  onMessage,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  summary: ContactCardSummary | null | undefined;
  mine: boolean;
  onMessage: () => void;
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || summary?.fullName || phoneNumber;
  const occupationLabel = summary?.occupation ? OCCUPATION_LABELS[summary.occupation] : null;
  const avatarUrl = summary?.avatarUrl ?? pickDefaultCatAvatar(userId);

  return (
    <div
      className={`flex w-full flex-col gap-2.5 rounded-xl p-3 ${
        mine ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- proxied/
            generated avatar, not a next/image-configured remote host. */}
        <img src={avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[15px] font-semibold">{name}</span>
          {occupationLabel && (
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                mine ? "bg-white/20" : "bg-black/5 dark:bg-white/15"
              }`}
            >
              <T {...occupationLabel} />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[13px] opacity-90">
        <ChatPhoneIcon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="truncate">{phoneNumber}</span>
      </div>

      {summary?.expertise && (
        <div className="flex items-center gap-2 text-[13px] opacity-90">
          <ChatExpertiseIcon className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{summary.expertise}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onMessage}
        className={`w-full rounded-full py-1.5 text-[14px] font-medium transition ${
          mine ? "bg-white/20 hover:bg-white/30" : "bg-black/5 hover:bg-black/10 dark:bg-white/15 dark:hover:bg-white/25"
        }`}
      >
        <T
          uk="Повідомлення" en="Message" ru="Сообщение" de="Nachricht" es="Mensaje"
          fr="Message" pl="Wiadomość" ptBR="Mensagem" zh="消息"
        />
      </button>
    </div>
  );
}

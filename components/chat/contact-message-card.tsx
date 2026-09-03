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
//
// 2026-09-03 (Aleksandr, live screenshot of a received contact card:
// "Если контакта которым со мной поделились нет у меня в контактах
// добавь справа круглую кнопку (+), сделай чуть уже кнопку
// 'повідомлення'. При наведенні + повинен бути з анімацією, при
// натисканні зникати а кнопка 'повідомлення' розширюватися. Сам
// контакт буде добавлятися нам в контакти") -- adds a round "+" button
// next to Message, shown only when the caller says this contact isn't
// already in the visitor's own book (`canAddContact`, computed in app/
// chats/[chatId]/page.tsx from a one-shot /api/contacts/list fetch --
// this card itself has no idea what the visitor's contact book holds).
// Deliberately mine-agnostic in that prop (a card for a contact *I*
// sent never gets `canAddContact: true` from the caller -- it's already
// pulled from my own book by definition). POSTs the same
// /api/contacts/add route components/profile-action-row.tsx's own
// toggleContact already uses. The "+ shrinks to nothing, Message grows"
// effect is a plain CSS width/opacity transition on the + button inside
// a flex row -- Message is already flex-1, so it fills the freed space
// for free the moment its sibling collapses; `settled` swaps back to
// the original single-button markup ~300ms later (matching the
// transition length) so a permanently-hidden 0-width button never
// lingers in the DOM.
"use client";

import { useState } from "react";
import { ChatExpertiseIcon, ChatPhoneIcon } from "@/components/chat/icons";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { OCCUPATION_LABELS } from "@/components/occupation-labels";
import { T } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

export type ContactCardSummary = {
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  occupation: string;
  expertise: string | null;
};

type AddState = "idle" | "adding" | "added" | "error";

// 2026-09-03 (Aleksandr, follow-up correction with a native-app
// reference screenshot: "эта кнопка выглядит как дичь... маленький
// аккуратний крестик, а сама заливка такого же кольору як і
// 'повідомлення'") -- was a standalone bg-[#335ef7] accent circle with a
// thick white plus; now shares the exact same conditional fill classes
// as the neighboring Message button (no more hardcoded color of its
// own, so the glyph just inherits currentColor) and a thinner,
// smaller stroke.
function PlusIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function AddSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ContactMessageCard({
  userId,
  firstName,
  lastName,
  phoneNumber,
  summary,
  mine,
  canAddContact,
  onMessage,
  onContactAdded,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  summary: ContactCardSummary | null | undefined;
  mine: boolean;
  // 2026-09-03: see this file's own header comment. Ignored entirely
  // once this card has already added the contact this render (`added`/
  // `settled` below take over) -- only ever gates showing the option in
  // the first place.
  canAddContact: boolean;
  onMessage: () => void;
  onContactAdded?: () => void;
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || summary?.fullName || phoneNumber;
  const occupationLabel = summary?.occupation ? OCCUPATION_LABELS[summary.occupation] : null;
  const avatarUrl = summary?.avatarUrl ?? pickDefaultCatAvatar(userId);

  const [addState, setAddState] = useState<AddState>("idle");
  const [settled, setSettled] = useState(false);

  async function handleAddContact() {
    if (addState === "adding" || addState === "added") return;
    setAddState("adding");
    try {
      const res = await authFetch("/api/contacts/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setAddState("added");
        onContactAdded?.();
        window.setTimeout(() => setSettled(true), 320);
      } else {
        setAddState("error");
        window.setTimeout(() => setAddState("idle"), 2200);
      }
    } catch {
      setAddState("error");
      window.setTimeout(() => setAddState("idle"), 2200);
    }
  }

  const showAddRow = canAddContact && !settled;

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

      {showAddRow ? (
        <div className={`flex items-center transition-all duration-300 ${addState === "added" ? "gap-0" : "gap-2"}`}>
          <button
            type="button"
            onClick={onMessage}
            className={`flex-1 rounded-full py-1.5 text-[14px] font-medium transition ${
              mine ? "bg-white/20 hover:bg-white/30" : "bg-black/5 hover:bg-black/10 dark:bg-white/15 dark:hover:bg-white/25"
            }`}
          >
            <T
              uk="Повідомлення" en="Message" ru="Сообщение" de="Nachricht" es="Mensaje"
              fr="Message" pl="Wiadomość" ptBR="Mensagem" zh="消息"
            />
          </button>
          <button
            type="button"
            onClick={handleAddContact}
            disabled={addState === "adding" || addState === "added"}
            aria-label="Add to contacts"
            className={`group flex shrink-0 items-center justify-center overflow-hidden rounded-full transition-all duration-300 ease-out disabled:cursor-default ${
              mine ? "bg-white/20 hover:bg-white/30" : "bg-black/5 hover:bg-black/10 dark:bg-white/15 dark:hover:bg-white/25"
            } ${addState === "added" ? "w-0 opacity-0" : "h-9 w-9 opacity-100 active:scale-95"}`}
          >
            {addState === "adding" ? <AddSpinner /> : <PlusIcon className="animate-theme-pop" />}
          </button>
        </div>
      ) : (
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
      )}

      {addState === "error" && (
        <p className="text-[11px] text-red-500 dark:text-red-400">
          <T
            uk="Не вдалося додати" en="Couldn't add" ru="Не удалось добавить" de="Konnte nicht hinzugefügt werden"
            es="No se pudo añadir" fr="Impossible d'ajouter" pl="Nie udało się dodać" ptBR="Não foi possível adicionar"
            zh="添加失败"
          />
        </p>
      )}
    </div>
  );
}

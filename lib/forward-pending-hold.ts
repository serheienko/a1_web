// lib/forward-pending-hold.ts
//
// Pending-forward composer preview (Форвард 2.0, Phase 3 -- Aleksandr,
// re-emphasizing an open question from the master-plan after
// greenlighting the rest of it: "должен быть момент, что ты типа
// когда пересылаешь и открываешь чат, и там тоже сверху это
// появляется в композере, типа в input field'е... У нас в нашем
// приложении оно уже построено, а нам тоже надо такой preview").
//
// Mirrors the mobile app's own ForwardPendingHold -- a static
// in-memory holder that survives GoRouter navigation between picking a
// destination chat and that chat's own view mounting (read directly
// off the mobile source, not guessed). A plain module-level variable
// serves the exact same purpose across a Next.js client-side route
// change: simpler than threading this through React Context for a
// value that only ever needs to survive ONE navigation (picker close
// -> destination chat mount) and is read by at most one component at
// a time.
"use client";

import type { ChatMessage } from "@/lib/a1/chat-schemas";

export type ForwardPendingDraft = {
  targetChatId: string;
  // Oldest-first, matching mobile's own send order -- the LAST entry
  // is the one that gets the composer's typed caption (see page.tsx's
  // own sendPendingForwardBatch, mirroring forward_multi_send.dart's
  // "caption attached only to the newest message" comment).
  messages: ChatMessage[];
  // Precomputed at putForwardPending() time (from contactSummaries,
  // already resolved for anything currently on screen) so the banner
  // has a name to show on the very first paint of the destination
  // chat -- no extra fetch/race to wait on there.
  ownerLabel: string;
  // Форвард 2.0, Phase 4 (Aleksandr, Telegram Web reference screen
  // recording: tapping the pending-forward banner opens a menu with
  // "Show Sender's Name" / "Hide Sender's Name") -- undefined/false is
  // the default ("show", i.e. every send still carries forwardFrom as
  // before this existed). When true, page.tsx's own sendPendingForward
  // Batch omits forwardFrom entirely on every send in this batch, so
  // the messages land in the target chat as plain, unattributed
  // messages instead of "Переслано від X" bubbles.
  hideSenderName?: boolean;
};

let held: ForwardPendingDraft | null = null;

export function putForwardPending(draft: ForwardPendingDraft): void {
  held = draft;
}

// Consumes the held draft ONLY if it targets this exact chat -- a
// picker opened from chat A that navigates to chat B should never
// leak into chat C if the user backs out and opens a third chat
// before ever visiting B.
export function takeForwardPendingFor(chatId: string): ForwardPendingDraft | null {
  if (held && held.targetChatId === chatId) {
    const draft = held;
    held = null;
    return draft;
  }
  return null;
}

export function clearForwardPending(): void {
  held = null;
}

// lib/a1/meeting-protocol.ts
//
// Scheduled Meetings (2026-09-04, Aleksandr Figma spec, then his own
// "давай типа делать функцию начинать" -- go ahead and start building
// the actual scheduling flow, after the earlier "Quick Invites" popup
// half shipped as its own commit).
//
// ARCHITECTURE NOTE -- read this before touching anything meeting-
// related in this codebase. The Figma spec's own annotations describe
// a custom `entity-meeting` object riding in MessageInput.entities, the
// exact same shape entity-calculation already uses (see app/api/chats/
// send/route.ts's own header comment). The difference: entity-
// calculation is a CONFIRMED, backend-known type -- Resource.RichText.
// Calculation is a real, documented member of chat-server's own schema
// union. Several passes through https://api.a1appp.com/openapi.json
// (WebFetch, both targeted and broad) found NO entity-meeting
// equivalent anywhere in the spec, and there is no safe way to confirm
// messages.send would even accept (let alone durably store) an
// unrecognized entities[].object value short of live-testing a real
// send on this production chat backend and risking a rejected or
// silently-mangled message in an actual user's chat. That is not a risk
// worth taking to save one indirection layer.
//
// So: this feature is built ENTIRELY on top of plain text messages
// (`message: string` / `entities: [{object:"entity-text"}]`), the one
// send shape already confirmed to work unconditionally for this app.
// A "meeting proposal" is a normal text message whose text is
// MEETING_PREFIX followed by base64(JSON.stringify(MeetingPayload));
// components/chat/meeting-message-card.tsx recognizes that prefix and
// renders a real card instead of raw text. "Accept" is the same trick
// one level up: a follow-up text message carrying MEETING_ACCEPT_PREFIX
// + base64(JSON) referencing the proposal's own real message _id, which
// app/chats/[chatId]/page.tsx's render pass hides from the visible
// timeline entirely (same idea as a calc-only message never showing an
// empty caption) and instead folds into the proposal card it points at.
//
// A client that doesn't know this convention -- the native mobile app,
// today -- would show the raw prefix+base64 as plain garbled text
// instead of a card. Not pretty, but harmless (it's still just a text
// message), and an accepted v1 trade-off for a web-only feature shipped
// under Aleksandr's own explicit "start building it now" -- flagged to
// him directly once this lands, same as every other scope-cut this
// session.
//
// TIMEZONE NOTE: this design deliberately needs NO cross-user backend
// timezone lookup at all (the open question from the earlier "Profile
// time zone override" thread). A MeetingPayload stores exactly one
// absolute instant, `startsAtUtcMs` -- a real Unix-ms timestamp, the
// same value everywhere on Earth. EVERY viewer (proposer, receiver,
// after accept, before accept) converts that ONE instant to their OWN
// local wall time locally, via Intl/Date, using their OWN device's
// timezone -- exactly the same "device-automatic, no permission needed"
// timezone source Aleksandr already confirmed is enough ("Автоматически"
// -- no profile-level manual override needed for v1). There is nothing
// to look up about the OTHER participant's timezone, ever. The Figma
// spec's pre-accept "fuzzy time range" (a coarse morning/day/evening/
// night bucket instead of an exact clock time) is purely a UX choice on
// top of that same locally-computed value, not a technical necessity --
// see bucketForHour below.

export type MeetingTimeBucket = "early-morning" | "daytime" | "evening" | "late-night";

// Figma "(2) Display Meeting" reference, confirmed bucket boundaries:
// Early morning 05:00-08:00, Daytime 08:00-18:00, Evening 18:00-22:00,
// Late night 22:00-05:00 (wraps past midnight).
export function bucketForHour(hour: number): MeetingTimeBucket {
  if (hour >= 5 && hour < 8) return "early-morning";
  if (hour >= 8 && hour < 18) return "daytime";
  if (hour >= 18 && hour < 22) return "evening";
  return "late-night";
}

// 2026-09-04 (Aleksandr, reference screenshot of the native app's own
// "User A" bucket legend + "Все те иконки это обычные эмодзи" -- these
// four glyphs are plain Unicode emoji, not custom art or the native
// app's own early_morning.png/day_time.png/evening.png/late_night.png
// assets (those exist too, aone_private/assets/img/, but he confirmed
// the simpler plain-emoji route instead of pulling those PNGs across).
// Single source of truth shared by meeting-message-card.tsx's own
// per-participant bucket row AND schedule-meeting-modal.tsx's live
// "which bucket is the currently-scrolled hour in" indicator, so the
// glyph<->bucket mapping only ever lives in one place.
export function bucketEmoji(bucket: MeetingTimeBucket): string {
  switch (bucket) {
    case "early-morning":
      return "\u{1F305}"; // sunrise
    case "daytime":
      return "\u{2600}\u{FE0F}"; // sun
    case "evening":
      return "\u{1F3D9}\u{FE0F}"; // cityscape at dusk
    case "late-night":
      return "\u{1F319}"; // crescent moon
  }
}

export type MeetingPayload = {
  v: 1;
  startsAtUtcMs: number;
  link: string | null;
  // 2026-09-04, round two (Figma "(2) Display Meeting" reference,
  // Aleksandr: "1-3 допили") -- the reference shows BOTH participants
  // as their own name+avatar+"Local Time" row, each in their OWN
  // locally-converted clock time, not just the single shared instant
  // this payload started with. Still no backend timezone lookup of any
  // kind (this file's own TIMEZONE NOTE above still holds) -- only the
  // PROPOSER's own IANA zone (Intl.DateTimeFormat().resolvedOptions().
  // timeZone, read on their own device at schedule time, no permission
  // prompt) needs to ride along, same as every other field here
  // already does: it's the one piece of information about them nobody
  // else's device could otherwise derive. Their NAME and AVATAR do NOT
  // need to travel with the payload at all -- this is always a 1:1
  // chat, so from any viewer's own side "the proposer" is either
  // themselves (their own name/avatar, already known locally) or their
  // one chat partner (app/chats/[chatId]/page.tsx's own headerTitle/
  // headerAvatar) -- see that file's own MeetingMessageCard call site
  // for exactly how `mine` picks between the two, no payload field
  // needed either way.
  proposerTimeZone: string;
};

export type MeetingAcceptPayload = {
  v: 1;
  meetingMsgId: string;
  // Mirrors proposerTimeZone above, captured on the ACCEPTER's own
  // device at the moment they press Accept -- the one point this
  // feature ever learns the other participant's real zone, given
  // voluntarily by that participant's own client, never looked up.
  // Same as above, no name/avatar field needed -- chat context alone
  // (mine vs. headerTitle/headerAvatar) already identifies who the
  // accepter is.
  accepterTimeZone: string;
};

const MEETING_PREFIX = "A1MEETINGv1::";
const MEETING_ACCEPT_PREFIX = "A1MEETINGACCEPTv1::";

function b64encode(json: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

function b64decode(b64: string): string {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return decodeURIComponent(escape(window.atob(b64)));
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function encodeMeetingText(payload: Omit<MeetingPayload, "v">): string {
  return MEETING_PREFIX + b64encode(JSON.stringify({ v: 1, ...payload }));
}

// Falls back to "" for proposerTimeZone on an older-shaped payload
// missing the field entirely -- never throws, same "degrade, don't
// crash" contract this function already had. meeting-message-card.tsx
// treats an empty proposerTimeZone as "unknown" and falls back to the
// viewer's own device zone for that row rather than a hard failure.
export function decodeMeetingText(text: string | null | undefined): MeetingPayload | null {
  if (!text || !text.startsWith(MEETING_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(b64decode(text.slice(MEETING_PREFIX.length)));
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { v?: unknown }).v === 1 &&
      typeof (parsed as { startsAtUtcMs?: unknown }).startsAtUtcMs === "number"
    ) {
      const p = parsed as { startsAtUtcMs: number; link?: unknown; proposerTimeZone?: unknown };
      return {
        v: 1,
        startsAtUtcMs: p.startsAtUtcMs,
        link: typeof p.link === "string" ? p.link : null,
        proposerTimeZone: typeof p.proposerTimeZone === "string" ? p.proposerTimeZone : "",
      };
    }
  } catch {
    // Malformed/foreign text that merely happens to start with the
    // marker -- render as plain text rather than throw.
  }
  return null;
}

export function encodeMeetingAcceptText(payload: Omit<MeetingAcceptPayload, "v">): string {
  return MEETING_ACCEPT_PREFIX + b64encode(JSON.stringify({ v: 1, ...payload }));
}

export function decodeMeetingAcceptText(text: string | null | undefined): MeetingAcceptPayload | null {
  if (!text || !text.startsWith(MEETING_ACCEPT_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(b64decode(text.slice(MEETING_ACCEPT_PREFIX.length)));
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { v?: unknown }).v === 1 &&
      typeof (parsed as { meetingMsgId?: unknown }).meetingMsgId === "string"
    ) {
      const p = parsed as { meetingMsgId: string; accepterTimeZone?: unknown };
      return {
        v: 1,
        meetingMsgId: p.meetingMsgId,
        accepterTimeZone: typeof p.accepterTimeZone === "string" ? p.accepterTimeZone : "",
      };
    }
  } catch {
    // Same as decodeMeetingText above.
  }
  return null;
}

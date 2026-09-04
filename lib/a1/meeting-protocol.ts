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

export type MeetingPayload = {
  v: 1;
  startsAtUtcMs: number;
  link: string | null;
};

export type MeetingAcceptPayload = {
  v: 1;
  meetingMsgId: string;
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
      const p = parsed as { startsAtUtcMs: number; link?: unknown };
      return { v: 1, startsAtUtcMs: p.startsAtUtcMs, link: typeof p.link === "string" ? p.link : null };
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
      return { v: 1, meetingMsgId: (parsed as { meetingMsgId: string }).meetingMsgId };
    }
  } catch {
    // Same as decodeMeetingText above.
  }
  return null;
}

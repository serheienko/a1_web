// lib/a1/sticker-sets-cache.ts
//
// Fix Tracker (order 71, "При нажатии на стикер в чате, надо открывать
// стикерпак полностью"): tapping a sticker that's already been SENT in a
// chat needs to know which stickerset it came from, so the picker panel
// can jump straight to that pack. A message's own attribute-sticker
// attachment carries no stickerset id in this backend's schema
// (confirmed against packages/types -- see media-panel-schemas.ts's own
// header), so the workaround is matching the sticker doc's stable _id
// against messages.getAllStickers's sets, client-side.
//
// Module-level cache (same pattern as media-picker-panel.tsx's own
// gifSearchCache) so this lookup and the picker panel's sticker tab
// share ONE fetch of /api/chats/stickers/sets instead of each
// re-requesting it -- a bare click on a sticker bubble shouldn't refire
// the same network call the panel just made (or is about to make).
import { authFetch } from "@/lib/auth-fetch";
import { isRealStickerset, isRealMediaDocument, type Stickerset } from "./media-panel-schemas";
import type { MediaDocument } from "./schemas";

let cachedSets: Stickerset[] | null = null;
let inFlight: Promise<Stickerset[]> | null = null;

async function fetchSets(): Promise<Stickerset[]> {
  try {
    const data = await authFetch("/api/chats/stickers/sets").then((r) => r.json());
    const realSets: Stickerset[] = Array.isArray(data?.sets) ? data.sets.filter(isRealStickerset) : [];
    cachedSets = realSets;
    return realSets;
  } catch {
    return [];
  } finally {
    inFlight = null;
  }
}

// Returns the cached sets instantly once fetched at least once this
// session; otherwise kicks off (or joins) a single in-flight fetch so
// concurrent callers (e.g. the panel's own effect + a sticker-bubble
// click racing it) don't double-request.
export function getStickerSets(): Promise<Stickerset[]> {
  if (cachedSets) return Promise.resolve(cachedSets);
  if (!inFlight) inFlight = fetchSets();
  return inFlight;
}

// Synchronous peek, no fetch triggered -- lets a caller (the panel's
// own loading-skeleton gate, order 79) tell a genuine first-load apart
// from a cache-hit reopen BEFORE it commits to showing a spinner.
export function hasCachedStickerData(): boolean {
  return cachedSets !== null && cachedRecent !== null;
}

// Fix Tracker (order 79, Aleksandr: "стикеры сейчас не кешируются" --
// closing and reopening the sticker panel re-fetched everything from
// scratch every single time, sets AND recent alike, flashing the
// loading skeleton (order 68) on every open even though nothing had
// changed). `getStickerSets` above already solved half of this (the
// pack list); this is the same module-level singleton pattern for
// /api/chats/stickers/recent, so a re-open within the same page session
// reads the cached array instantly instead of round-tripping again.
// `bumpRecentSticker` keeps this in sync the moment the user actually
// sends a sticker (see media-picker-panel.tsx's own onSendMedia), so
// the NEXT open shows it under Recent without waiting on a refetch.
let cachedRecent: MediaDocument[] | null = null;
let recentInFlight: Promise<MediaDocument[]> | null = null;

async function fetchRecent(): Promise<MediaDocument[]> {
  try {
    const data = await authFetch("/api/chats/stickers/recent").then((r) => r.json());
    const realRecent: MediaDocument[] = Array.isArray(data?.stickers) ? data.stickers.filter(isRealMediaDocument) : [];
    cachedRecent = realRecent;
    return realRecent;
  } catch {
    return [];
  } finally {
    recentInFlight = null;
  }
}

export function getRecentStickers(): Promise<MediaDocument[]> {
  if (cachedRecent) return Promise.resolve(cachedRecent);
  if (!recentInFlight) recentInFlight = fetchRecent();
  return recentInFlight;
}

// Optimistically moves a just-sent sticker to the front of the cached
// Recent list (deduped by _id, same MAX_RECENT the server itself caps
// /api/chats/stickers/recent at) so the picker doesn't need a network
// round-trip to reflect what the user just did.
const MAX_RECENT = 30;

export function bumpRecentSticker(doc: MediaDocument): void {
  const withoutDupe = (cachedRecent ?? []).filter((d) => d._id !== doc._id);
  cachedRecent = [doc, ...withoutDupe].slice(0, MAX_RECENT);
}

// Scans every set's documents for a matching doc _id (stable across
// contexts, unlike fileReference -- see stable-media-url.ts) and returns
// that set's own _id, or null if the sticker's pack can't be resolved
// (e.g. sticker was sent from a pack the current user no longer has).
export function findStickerSetIdForDocId(sets: Stickerset[], docId: string): string | null {
  for (const set of sets) {
    if (set.documents.some((doc) => doc._id === docId)) return set._id;
  }
  return null;
}

// lib/a1/media-panel-schemas.ts
//
// Sticker/GIF picker panel (Block 1 of Aleksandr's 2026-09-06 go-ahead,
// see STICKERS_AND_REACTIONS_PLAN.md). Schemas for the three chat-
// server/media-server methods that panel needs, CONFIRMED against real
// backend source (not guessed -- see packages/types/methods/
// messages_getAllStickers.d.ts, messages_getRecentStickers.d.ts,
// media_globalSearch.d.ts and packages/types/resources/Stickerset.d.ts,
// StickersetEmpty.d.ts):
//
//   messages.getAllStickers   {} -> { sets: (Stickerset|StickersetEmpty)[] }
//   messages.getRecentStickers {} -> { stickers: (MediaDocument|MediaDocumentEmpty)[], dates: number[] }
//   media.globalSearch (media-server, same public API base as chat-server
//     -- lib/a1/client.ts's call() has no per-method routing, confirmed)
//     { q, documentType: 'gif', next? } -> { items: MediaDocument[], previewUrls: Record<string,string>, pagination: Pagination.Result }
//
// Reuses MediaDocumentSchema from ./schemas (object:"media-document" --
// the RESOURCE-level tag) rather than chat-schemas.ts's
// MessageMediaDocumentSchema (object:"media-doc", a MESSAGE-attachment
// shape) -- the two are different wire shapes despite both being "a
// media document"; this file's methods return the former.
import { z } from "zod";
import { MediaDocumentSchema } from "./schemas";

// A sticker set can come back as a real Stickerset or, per the backend's
// own union type, an empty placeholder tagged "stickerset-empty" -- keep
// both, filter out the empty ones where the panel renders (a set with no
// documents/thumb isn't worth a tab row).
export const StickersetSchema = z
  .object({
    object: z.literal("stickerset"),
    _id: z.string(),
    flags: z.number().catch(0),
    title: z.string().catch(""),
    shortName: z.string().catch(""),
    count: z.number().catch(0),
    thumb: MediaDocumentSchema.nullable().catch(null),
    documents: z.array(MediaDocumentSchema).catch([]),
  })
  .catchall(z.unknown());
export type Stickerset = z.infer<typeof StickersetSchema>;

export const StickersetEmptySchema = z.object({
  object: z.literal("stickerset-empty"),
  _id: z.string(),
});

const StickersetOrEmptySchema = z.union([StickersetSchema, StickersetEmptySchema]);

export const GetAllStickersOutputSchema = z.object({
  sets: z.array(StickersetOrEmptySchema).catch([]),
});
export type GetAllStickersOutput = z.infer<typeof GetAllStickersOutputSchema>;

// getRecentStickers can also hand back "media-document-empty" entries
// (a ttl-expired/deleted doc) -- MediaDocumentSchema alone would reject
// those and drop the whole array via zod's array-of-object strictness,
// so this filters at the parse boundary instead of failing the request.
const MediaDocumentOrEmptySchema = z.union([
  MediaDocumentSchema,
  z.object({ object: z.literal("media-document-empty"), _id: z.string() }),
]);

export const GetRecentStickersOutputSchema = z.object({
  stickers: z.array(MediaDocumentOrEmptySchema).catch([]),
  dates: z.array(z.number()).catch([]),
});
export type GetRecentStickersOutput = z.infer<typeof GetRecentStickersOutputSchema>;

export const PaginationResultSchema = z.object({
  next: z.string().nullable().catch(null),
  previous: z.string().nullable().catch(null),
  hasMore: z.boolean().catch(false),
});

export const GifSearchOutputSchema = z.object({
  items: z.array(MediaDocumentSchema).catch([]),
  // Record<MediaDocId, url> -- keyed by each item's own _id, gives a
  // ready CDN thumbnail URL without a round-trip through our own
  // /api/media proxy (that proxy is for OUR stored documents; these
  // previews point straight at the GIF provider's own CDN, per
  // media.globalSearch's own doc comment).
  previewUrls: z.record(z.string(), z.string()).catch({}),
  pagination: PaginationResultSchema.catch({ next: null, previous: null, hasMore: false }),
});
export type GifSearchOutput = z.infer<typeof GifSearchOutputSchema>;

export function isRealStickerset(set: Stickerset | z.infer<typeof StickersetEmptySchema>): set is Stickerset {
  return set.object === "stickerset";
}

export function isRealMediaDocument(
  doc: z.infer<typeof MediaDocumentOrEmptySchema>,
): doc is z.infer<typeof MediaDocumentSchema> {
  return doc.object === "media-document";
}

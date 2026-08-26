// lib/avatars.ts
//
// The app's own default-avatar set for a user with no uploaded photo.
// Found by accident in the backend's own OpenAPI spec (2026-08-26) —
// Resource.UserHidden's `photo` field example is literally
// `https://aone-bucket-photos.s3.eu-central-1.amazonaws.com/cats/16.png`.
// Confirmed live: cats/1.png through cats/30.png exist (30 images, as
// Aleksandr described — the app's cat mascot, different pose/color per
// number), cats/31.png 404s (S3 NoSuchKey). Unlike a real uploaded photo
// (lib/a1/mappers.ts's mapAuthor — a pre-signed S3 URL expiring in ~2
// minutes), these are plain public objects with no query string or
// expiry, so they're safe to link to directly, forever, from an
// ISR-cached page — no need to route them through /api/media.
//
// Picked deterministically from a seed (author username, falling back to
// full name or post id) so the same person shows the same cat every time
// rather than a new random one on every page load.

const CAT_COUNT = 30;
const CAT_BASE_URL = "https://aone-bucket-photos.s3.eu-central-1.amazonaws.com/cats";

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickDefaultCatAvatar(seed: string): string {
  const index = (stableHash(seed) % CAT_COUNT) + 1;
  return `${CAT_BASE_URL}/${index}.png`;
}

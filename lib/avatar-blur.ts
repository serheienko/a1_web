// lib/avatar-blur.ts
//
// Aleksandr, 2026-08-28: "тут трабла, аватары подгружаются не через блюр
// с разными цветами" — avatars used lib/blur-placeholder.ts's ONE shared
// generic gray shimmer for every avatar, deliberately (see that file's
// own comment): a true per-photo blur wasn't wired up when it was built.
// lib/covers.ts now already does exactly that for Favorites cover art
// (fetch the real image, shrink it to a tiny blurred JPEG via sharp) —
// this applies the same real per-avatar blur instead of the shared
// shimmer, so each avatar's placeholder is actually colored like that
// avatar's own photo while it loads.
//
// avatarUrl (see buildMediaProxyUrl in lib/a1/mappers.ts) is always our
// own same-origin /api/media/<id> proxy, which 302-redirects to the real
// (short-lived, signed) photo URL — a normal fetch() follows that
// redirect on its own, so one fetch here gets the real image bytes.
// Best-effort, same contract as lib/covers.ts: any failure (network,
// timeout, decode) resolves to null, and every call site falls back to
// the generic shimmer (lib/blur-placeholder.ts's BLUR_DATA_URL) — a
// slow or broken avatar blur must never break the feed or a profile
// page.
//
// Wrapped in React's cache() for per-request dedup, same pattern as
// lib/covers.ts and lib/a1/datasets.ts.
//
// 2026-09-02 (Aleksandr, live screen recording + "не будет ли конского
// счёта от того что раз в пару секунд идёт какой-то ненужный запрос" --
// app/chats/page.tsx polls /api/chats/list every 5s while its tab is
// open (app/chats/[chatId]/page.tsx polls its own messages every 3s),
// and every one of those polls used to re-run this ENTIRE fetch+sharp-
// resize+base64 pipeline for every avatar in the list. The `next:
// {revalidate}` below only ever cached the HTTP round-trip to the media
// proxy -- the CPU-bound sharp() work after it re-ran from scratch on
// every single poll regardless, for a photo that essentially never
// changes tick to tick. That's real, wasted compute that scales with
// (open tabs) x (chats per list) x (one recompute per poll interval),
// not a one-time cost -- exactly the kind of invisible recurring spend
// worth catching. Fixed by caching the whole COMPUTED result (not just
// the fetch) in Next's persistent Data Cache, keyed on the avatar's own
// URL, via unstable_cache -- a given avatar's blur is now computed once
// and just read back for the next 24h, matching the one-day staleness
// this file already said was fine for the fetch alone.
import { cache } from "react";
import { unstable_cache } from "next/cache";
import sharp from "sharp";

const FETCH_TIMEOUT_MS = 4000;
const SITE_URL = "https://jobs.a1appp.com";

async function computeAvatarBlurDataUrl(avatarUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    // avatarUrl is a same-origin relative path (e.g. "/api/media/abc?...")
    // — fetch() needs an absolute URL server-side, so it's resolved
    // against the site's own known origin (same constant every SEO
    // metadata call in app/ already hardcodes).
    const res = await fetch(`${SITE_URL}${avatarUrl}`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const tiny = await sharp(buffer)
      .resize(16, 16, { fit: "cover" })
      .jpeg({ quality: 40 })
      .toBuffer();
    return `data:image/jpeg;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}

const cachedComputeAvatarBlurDataUrl = unstable_cache(computeAvatarBlurDataUrl, ["avatar-blur-v1"], {
  revalidate: 86400,
});

export const generateAvatarBlurDataUrl = cache(async function generateAvatarBlurDataUrl(
  avatarUrl: string | null,
): Promise<string | null> {
  if (!avatarUrl) return null;
  try {
    return await cachedComputeAvatarBlurDataUrl(avatarUrl);
  } catch {
    return null;
  }
});

// 2026-08-28: "на будущее все фото/видео делаем через такую подгрузку" —
// this has nothing avatar-specific about it (just fetch + sharp resize),
// so post photos reuse it too now (components/post-images.tsx via
// app/jobs/[slug]/page.tsx and app/talents/[slug]/page.tsx). Kept the
// original name/call sites for the existing avatar spots (this file's
// own history) and export this alias under the name new call sites
// should actually reach for.
export const generateImageBlurDataUrl = generateAvatarBlurDataUrl;

// lib/seo/og-image.tsx
//
// Shared og:image builder for app/opengraph-image.tsx, app/talents/
// opengraph-image.tsx, app/jobs/[slug]/opengraph-image.tsx and
// app/talents/[slug]/opengraph-image.tsx (2026-08-28).
//
// Two shapes, one function:
//  - a post with a real photo -> that photo, cropped to 1200x630, with a
//    bottom gradient + title/author overlay (like a magazine cover, not
//    a screenshot of the page)
//  - no photo (feed pages, or a post with none) -> a generated branded
//    card: gradient background (PLAN.md §4 phase 5's brand gradient,
//    #4F71EB -> #C830FF), mascot emoji, title
//
// Commissioner, not a system font: this repo already committed to
// Commissioner as "the real typeface used in the Figma mockups" (see
// app/layout.tsx's comment), and crucially the site is Ukrainian/Russian
// by default — a system font stack inside next/og's renderer (Satori)
// has no guaranteed Cyrillic coverage on Vercel's build image, which is
// exactly how a title silently renders as empty boxes. Fetching the
// actual Commissioner font bytes from Google Fonts, subset to only the
// characters this image actually needs, sidesteps that.

import { ImageResponse } from "next/og";
import type { WebPost } from "@/types/web-post";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_CONTENT_TYPE = "image/png";

const BRAND_GRADIENT = "linear-gradient(135deg, #4F71EB 0%, #C830FF 100%)";
const MASCOT_CAT = "\u{1F408}‍⬛"; // 🐈‍⬛ — app's black-cat mascot (see lib/avatars.ts)

// In-memory only: og-image routes are invoked per-request on Vercel's
// serverless runtime, so this cache only helps warm instances, but a
// cold fetch to Google Fonts (a few hundred ms) is still far cheaper
// than the alternative of shipping font files in the repo. Keyed by the
// exact glyph set requested, since that's what changes the response.
const fontCache = new Map<string, ArrayBuffer | null>();

/**
 * Fetches Commissioner Bold, subset to exactly the characters `text`
 * uses. Google Fonts' `text=` param does real subsetting server-side —
 * this keeps the transfer small AND, more importantly, is what makes
 * arbitrary post titles (Ukrainian, Russian, or any of the other 7 UI
 * languages) actually render instead of falling back to tofu boxes.
 *
 * Requests with an old-browser User-Agent on purpose: Google Fonts only
 * hands back a plain .ttf link for user agents it doesn't recognize as
 * woff2-capable, and Satori (next/og's renderer) wants ttf/otf, not
 * woff2. This is the same trick Vercel's own og-image examples use.
 */
async function loadCommissionerBold(text: string): Promise<ArrayBuffer | null> {
  const uniqueChars = Array.from(new Set(Array.from(text))).join("");
  if (fontCache.has(uniqueChars)) return fontCache.get(uniqueChars)!;

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Commissioner:wght@700&text=${encodeURIComponent(uniqueChars)}`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.7 Safari/534.34",
      },
    });
    if (!cssRes.ok) throw new Error(`google fonts css2 responded ${cssRes.status}`);
    const css = await cssRes.text();
    const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
    if (!fontUrl) throw new Error("no font src in css2 response");

    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) throw new Error(`font file responded ${fontRes.status}`);
    const buffer = await fontRes.arrayBuffer();
    fontCache.set(uniqueChars, buffer);
    return buffer;
  } catch (err) {
    // A missing/failed font must never break the whole og:image — a
    // Satori render with no custom font just falls back to its own
    // default (Latin-only, but still a valid image), which is a far
    // better failure mode than a 500 on every share preview.
    console.warn("[og-image] Commissioner font load failed, falling back to default:", err instanceof Error ? err.message : err);
    fontCache.set(uniqueChars, null);
    return null;
  }
}

type OgImageParams = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Absolute URL of a real photo to use as the background, if any. */
  photoUrl?: string | null;
};

export async function buildOgImage({ eyebrow, title, subtitle, photoUrl }: OgImageParams): Promise<ImageResponse> {
  const fontText = `${eyebrow}${title}${subtitle ?? ""}${MASCOT_CAT}`;
  const fontData = await loadCommissionerBold(fontText);
  const fonts = fontData ? [{ name: "Commissioner", data: fontData, weight: 700 as const, style: "normal" as const }] : [];
  const fontFamily = fontData ? "Commissioner" : undefined;

  if (photoUrl) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#111" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            width={OG_IMAGE_SIZE.width}
            height={OG_IMAGE_SIZE.height}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)",
            }}
          />
          <div style={{ position: "absolute", left: 64, right: 64, bottom: 56, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.85)", fontFamily }}>{eyebrow}</div>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "#fff", marginTop: 12, fontFamily, lineHeight: 1.2 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.85)", marginTop: 16, fontFamily }}>{subtitle}</div>
            )}
          </div>
        </div>
      ),
      { ...OG_IMAGE_SIZE, fonts },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: BRAND_GRADIENT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, color: "rgba(255,255,255,0.9)", fontFamily }}>
          <span>{MASCOT_CAT}</span>
          <span>{eyebrow}</span>
        </div>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 700, color: "#fff", marginTop: 28, lineHeight: 1.15, fontFamily }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.9)", marginTop: 28, fontFamily }}>{subtitle}</div>
        )}
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts },
  );
}

// Same constant every other file in this repo hardcodes locally (see
// app/page.tsx, app/layout.tsx, lib/seo/jsonld.ts) rather than a shared
// config module — matching that existing convention here too.
const SITE_URL = "https://jobs.a1appp.com";

/** Convenience for the two per-post routes: pulls eyebrow/title/subtitle/photo out of a WebPost. */
export function ogImageParamsForPost(post: WebPost, eyebrow: string): OgImageParams {
  // post.images[*].url is our own /api/media/<id> proxy path (relative —
  // fine for next/image in a browser, useless for next/og's renderer,
  // which fetches server-side with no notion of "relative to this site").
  const rawPhotoUrl = post.images[0]?.url ?? null;
  return {
    eyebrow,
    title: post.title,
    subtitle: post.author.isAnonymous ? undefined : post.author.name,
    photoUrl: rawPhotoUrl ? `${SITE_URL}${rawPhotoUrl}` : null,
  };
}

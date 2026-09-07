// app/api/chats/gifs/proxy/route.ts
//
// Fix Tracker (order 63, 2026-09-07): the GIF picker's inline preview
// videos pointed straight at the provider's own CDN
// (static.klipy.com/*.mp4 -- see lib/a1/media-panel-schemas.ts's
// GifSearchOutputSchema comment for why previewUrls were left
// unproxied on purpose). Confirmed live via devtools: the search
// request itself succeeds, but the browser never even issues a network
// request for the individual .mp4 files (readyState stays 0, no
// entry in the network tab, no error) -- the signature of a
// domain-level block (ad/privacy-extension blocklist or network
// firewall flagging "klipy" as a tracker/ad host) rather than anything
// our own server does, since this app sets no CSP at all (checked
// next.config.ts/middleware.ts -- neither sets any header). Routing
// the actual bytes through our own origin instead of a client-side
// redirect (like /api/media/[docId] does for our own stored documents)
// is what actually avoids that: the browser only ever talks to
// api/chats/gifs/proxy on OUR domain, never to static.klipy.com
// directly, so a blocklist keyed on the third-party hostname no longer
// applies. A same-origin 302 (the OTHER pattern in this codebase)
// would NOT have fixed this -- the browser still ends up issuing the
// final request to the blocked host after following the redirect.
//
// `u` is the exact previewUrls value the search route already handed
// back from media.globalSearch -- validated against an allowlist of
// klipy hosts before this ever fetches it, so this can't be turned
// into an open proxy for arbitrary URLs.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIXES = [".klipy.com", "klipy.com"];

function isAllowedUpstream(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix));
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "missing u" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid u" }, { status: 400 });
  }

  if (!isAllowedUpstream(target)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }

  // Forward Range so the <video> tag can still seek/partial-load like it
  // would against the real CDN -- without this, some browsers' video
  // pipelines behave oddly on a 200-only source that doesn't advertise
  // range support.
  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: range ? { range } : undefined,
      // These clips are short, static, and keyed by an opaque provider
      // URL -- nothing about them is specific to the visitor, so no
      // credentials/cookies of ours should ever go out with this.
      credentials: "omit",
      cache: "no-store",
    });
  } catch (err) {
    console.error("[api/chats/gifs/proxy] upstream fetch failed:", err);
    return NextResponse.json({ error: "upstream_fetch_failed" }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: "upstream_error" }, { status: upstream.status || 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") ?? "bytes");
  // Stable provider URL -> stable bytes -- safe to cache hard, same
  // reasoning as any other content-addressed asset.
  headers.set("Cache-Control", "public, max-age=604800, immutable");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

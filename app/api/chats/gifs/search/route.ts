// app/api/chats/gifs/search/route.ts
//
// Block 1 -- thin proxy for media.globalSearch. Confirmed live in
// apps/media-server/src/api/v1/media/media.globalSearch.ts this method
// lives on the media-server microservice, NOT chat-server -- but
// lib/a1/client.ts's call() posts every method to the same one public
// API base regardless of namespace (no per-service routing needed on
// this side), so callAsVisitor works unchanged here.
//
// `q` empty-string is a valid "trending/default" query per the panel's
// own reference screenshots (a GIF grid shows before any search text is
// typed) -- not rejected here, just passed through as-is.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { GifSearchOutputSchema } from "@/lib/a1/media-panel-schemas";

export const runtime = "nodejs";

const GifSearchInput = z.object({
  q: z.string().trim().max(200).catch(""),
  next: z.string().trim().min(1).max(500).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = GifSearchInput.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    next: request.nextUrl.searchParams.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { q, next } = parsed.data;

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("media.globalSearch", {
      q,
      documentType: "gif",
      ...(next ? { next } : {}),
    });
    const gifs = GifSearchOutputSchema.safeParse(data);
    // Fix Tracker (order 63, 2026-09-07): route every preview URL
    // through our own /api/chats/gifs/proxy instead of handing the
    // client the raw static.klipy.com URL straight from
    // media.globalSearch -- see that proxy route's header comment for
    // why a same-origin byte-proxy (not just a redirect) is what
    // actually fixes GIF previews silently never loading. Any URL that
    // isn't actually klipy's own CDN (shouldn't happen, but the proxy
    // route itself also allowlist-checks) is left as-is rather than
    // wrapped, so it fails the same way it would have before instead of
    // being silently swallowed by the proxy's own host check.
    const previewUrls = gifs.success
      ? Object.fromEntries(
          Object.entries(gifs.data.previewUrls).map(([id, url]) => [
            id,
            /^https:\/\/([a-z0-9-]+\.)*klipy\.com\//i.test(url)
              ? `/api/chats/gifs/proxy?u=${encodeURIComponent(url)}`
              : url,
          ]),
        )
      : {};
    const response = NextResponse.json({
      ok: true,
      items: gifs.success ? gifs.data.items : [],
      previewUrls,
      pagination: gifs.success ? gifs.data.pagination : { next: null, previous: null, hasMore: false },
    });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/chats/gifs/search] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/gifs/search] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "gif_search_failed" }, { status: 502 });
  }
}

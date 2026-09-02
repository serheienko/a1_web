export const runtime = "nodejs";

// app/api/media/[docId]/route.ts — resolves a MediaDocument to a real,
// signed download URL and 302-redirects there (PLAN.md §2.6). This is the
// only place media.getUrl is called from — nothing else touches a raw S3
// URL, so a backend change to how URLs are signed is a one-file fix. Also
// the only reason a WebPostImage.url ever needs "remotePatterns" wiring in
// next.config: it doesn't, because from next/image's point of view the
// source is this same-origin route, not the eventual S3 host.
//
// 2026-09-02 (Aleksandr: "Че то по всему сайту периодически отваливаются
// аватарки, после релоада появляются" -- avatars across the whole site
// intermittently render as next/image's broken-image placeholder, fixed
// only by a manual reload): every single image on the site funnels
// through this one route, and it made exactly one live media.getUrl call
// per image with no retry -- a single transient timeout/network hiccup on
// that call produced a 502 that <Image> has no built-in recovery from
// (next/image does not retry a failed src on its own; only a full page
// reload re-triggers the request). Root-caused, not just guessed at: a
// manual reload being the only fix is the signature of "the one shot at
// the live call happened to fail," not a broken fileReference or a real
// 404 (those would fail identically forever, reload or not). Fixed with a
// small in-process retry below rather than touching lib/a1/client.ts's
// call() itself, since call() is shared by every other endpoint in this
// app and a blanket retry-on-any-call policy is a much bigger behavior
// change than this one hot, high-fanout, idempotent GET needs.

import { NextRequest, NextResponse } from "next/server";
import { call } from "@/lib/a1/client";

type MediaGetUrlOutput = { downloadUrl: string };

const MEDIA_URL_MAX_ATTEMPTS = 3;
const MEDIA_URL_RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const fileReference = request.nextUrl.searchParams.get("ref");
  const size = request.nextUrl.searchParams.get("size") ?? "size-photo";

  if (!fileReference) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  // trackView/trackUsage are NOT booleans, despite how PLAN.md §2.6 reads
  // ("Set trackUsage/trackView to false") — confirmed against the live
  // OpenAPI spec on 2026-08-26: both are optional objects
  // `{ id: string, type: UInt, at?: timestamp }` used to attribute a
  // view/usage event to some context. Passing `false` gets a real
  // validation error ("'trackView' must be of type object"). Since both
  // are optional and we have no meaningful context to attribute a website
  // pageview to anyway, omitting them entirely is what actually achieves
  // "don't pollute in-app analytics" — there's no tracking event without
  // a tracking context.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MEDIA_URL_MAX_ATTEMPTS; attempt++) {
    try {
      const { downloadUrl } = await call<MediaGetUrlOutput>("media.getUrl", {
        fileId: docId,
        fileReference,
        size,
      });

      return NextResponse.redirect(downloadUrl, {
        status: 302,
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch (err) {
      lastErr = err;
      if (attempt < MEDIA_URL_MAX_ATTEMPTS) {
        await sleep(MEDIA_URL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error(
    `[app/api/media] media.getUrl failed after ${MEDIA_URL_MAX_ATTEMPTS} attempts`,
    lastErr,
  );
  return NextResponse.json({ error: "failed to resolve media" }, { status: 502 });
}

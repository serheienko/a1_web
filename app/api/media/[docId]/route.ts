export const runtime = "nodejs";

// app/api/media/[docId]/route.ts — resolves a MediaDocument to a real,
// signed download URL and 302-redirects there (PLAN.md §2.6). This is the
// only place media.getUrl is called from — nothing else touches a raw S3
// URL, so a backend change to how URLs are signed is a one-file fix. Also
// the only reason a WebPostImage.url ever needs "remotePatterns" wiring in
// next.config: it doesn't, because from next/image's point of view the
// source is this same-origin route, not the eventual S3 host.

import { NextRequest, NextResponse } from "next/server";
import { call } from "@/lib/a1/client";

type MediaGetUrlOutput = { downloadUrl: string };

export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const fileReference = request.nextUrl.searchParams.get("ref");
  const size = request.nextUrl.searchParams.get("size") ?? "size-photo";

  if (!fileReference) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  try {
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
    console.error("[app/api/media] media.getUrl failed", err);
    return NextResponse.json({ error: "failed to resolve media" }, { status: 502 });
  }
}

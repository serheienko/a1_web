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
    const { downloadUrl } = await call<MediaGetUrlOutput>("media.getUrl", {
      fileId: docId,
      fileReference,
      size,
      // Website traffic must not pollute in-app view/usage analytics
      // (PLAN.md §2.6).
      trackView: false,
      trackUsage: false,
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

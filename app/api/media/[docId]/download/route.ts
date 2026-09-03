export const runtime = "nodejs";

// app/api/media/[docId]/download/route.ts
//
// 2026-09-03 (Aleksandr, photo-viewer spec: "Save — это сохранить в
// телефон"): a plain `<a href={mediaProxyUrl} download>` doesn't
// reliably force a download here, because the sibling ../route.ts
// redirects cross-origin to S3 -- per spec, the `download` attribute
// is only honored when the resulting resource is same-origin (or the
// origin itself sets Content-Disposition: attachment, which this
// bucket's objects don't). Rather than fight that from the client,
// this route does the fetch server-side (same media.getUrl + retry
// this file's sibling already established, PLAN.md §2.6) and streams
// the bytes back itself with an explicit Content-Disposition, so the
// browser downloads no matter what the S3 object's own headers say.
import { NextRequest, NextResponse } from "next/server";
import { call } from "@/lib/a1/client";

type MediaGetUrlOutput = { downloadUrl: string };

const MEDIA_URL_MAX_ATTEMPTS = 3;
const MEDIA_URL_RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Strip anything that isn't safe inside a Content-Disposition filename
// (quotes/newlines could break the header) -- the name itself is just a
// courtesy for the saved file, never trusted for anything else.
function sanitizeFilename(name: string): string {
  return name.replace(/["\r\n]/g, "").slice(0, 200) || "download";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const fileReference = request.nextUrl.searchParams.get("ref");
  const size = request.nextUrl.searchParams.get("size") ?? "size-photo";
  const filename = sanitizeFilename(request.nextUrl.searchParams.get("filename") ?? docId);

  if (!fileReference) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MEDIA_URL_MAX_ATTEMPTS; attempt++) {
    try {
      const { downloadUrl } = await call<MediaGetUrlOutput>("media.getUrl", {
        fileId: docId,
        fileReference,
        size,
      });

      const upstream = await fetch(downloadUrl);
      if (!upstream.ok || !upstream.body) {
        throw new Error(`upstream fetch failed: ${upstream.status}`);
      }
      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (err) {
      lastErr = err;
      if (attempt < MEDIA_URL_MAX_ATTEMPTS) {
        await sleep(MEDIA_URL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error(`[api/media/download] failed after ${MEDIA_URL_MAX_ATTEMPTS} attempts`, lastErr);
  return NextResponse.json({ error: "failed to resolve media" }, { status: 502 });
}

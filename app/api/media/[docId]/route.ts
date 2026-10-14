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

// 14.10.2026 (SEO, Search Console). Раньше маршрут отвечал 302 на подписанную ссылку S3, живущую 120 секунд.
// Googlebot (логотипы компаний в разметке вакансий, картинки постов) ставит такую ссылку в очередь и
// приходит позже -- S3 отвечает 403. В Search Console это были 76 страниц «403» и 8% обхода на редиректах.
// Теперь отдаём сами байты с постоянного адреса /api/media/<doc>?ref=... и кешем на сутки: один запрос
// вместо двух, и ничего не протухает. Маленький кеш в памяти, чтобы не ходить в бэкенд и S3 за каждым логотипом.

type MediaGetUrlOutput = { downloadUrl: string };

const MEDIA_URL_MAX_ATTEMPTS = 3;
const MEDIA_URL_RETRY_DELAY_MS = 300;
const MAX_BYTES = 8 * 1024 * 1024;
const CACHE_MAX_BYTES = 64 * 1024 * 1024;
const CACHE_TTL_MS = 60 * 60_000;

type Entry = { body: Uint8Array; type: string; at: number };
const cache = new Map<string, Entry>();
let cacheBytes = 0;

function remember(key: string, e: Entry) {
  if (e.body.byteLength > 2 * 1024 * 1024) return;
  const old = cache.get(key);
  if (old) {
    cacheBytes -= old.body.byteLength;
    cache.delete(key);
  }
  cache.set(key, e);
  cacheBytes += e.body.byteLength;
  for (const [k, v] of cache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(k);
    cacheBytes -= v.body.byteLength;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function respond(e: Entry) {
  return new NextResponse(new Uint8Array(e.body), {
    status: 200,
    headers: {
      "Content-Type": e.type,
      "Content-Length": String(e.body.byteLength),
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const fileReference = request.nextUrl.searchParams.get("ref");
  const size = request.nextUrl.searchParams.get("size") ?? "size-photo";

  if (!fileReference) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  const key = `${docId}|${size}|${fileReference}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    cache.delete(key);
    cache.set(key, hit);
    return respond(hit);
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MEDIA_URL_MAX_ATTEMPTS; attempt++) {
    try {
      const { downloadUrl } = await call<MediaGetUrlOutput>("media.getUrl", {
        fileId: docId,
        fileReference,
        size,
      });
      const upstream = await fetch(downloadUrl, { cache: "no-store" });
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      const len = Number(upstream.headers.get("content-length") ?? "0");
      if (len > MAX_BYTES) {
        // Большой файл не тащим через себя -- как раньше, редирект.
        return NextResponse.redirect(downloadUrl, { status: 302, headers: { "Cache-Control": "public, max-age=45, s-maxage=45" } });
      }
      const body = new Uint8Array(await upstream.arrayBuffer());
      const e: Entry = { body, type: upstream.headers.get("content-type") ?? "application/octet-stream", at: Date.now() };
      remember(key, e);
      return respond(e);
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

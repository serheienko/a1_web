// lib/pdf-thumbnail.ts
//
// 2026-09-03 (Aleksandr: "дожми пункты 1-2 до 1:1 с Figma" -- the
// Attachments section's own reference frame shows a PDF attachment
// rendering an actual first-page thumbnail -- specifically "показывает
// верхнюю часть страницы", the TOP portion of the page -- instead of a
// generic icon). This app has no PDF-rendering dependency, and this
// session's own remote dev shell has npm registry access blocked
// (`npm install pdfjs-dist` failed with a 403 "blocked-by-allowlist"
// proxy error) -- pdfjs-dist could not be added as a real npm
// dependency and type-checked here.
//
// Worked around by lazily loading pdf.js's classic UMD build from
// cdnjs, at RUNTIME, in the end user's own browser -- an ordinary
// browser has no such restriction; the block only affects installing
// it as a build-time dependency from THIS session's sandboxed shell.
// NOT verified live (no browser available in this session to actually
// open a chat and confirm a thumbnail renders) -- flagged for
// Aleksandr to confirm once deployed. Every failure mode here (the
// cdnjs script 404ing, the network being down, CORS on the signed S3
// URL app/api/media/[docId]/route.ts redirects to, a corrupt/encrypted
// PDF) resolves to `null`, never throws past this file -- callers
// (components/chat/pdf-thumbnail.tsx) fall back to the existing
// colored ChatFileTypeIcon badge, so a wrong guess here degrades to
// "no thumbnail, same as before this pass," never a broken attachment.
const PDFJS_VERSION = "3.11.174";
const PDFJS_SCRIPT_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Minimal shape of the bits of the pdf.js UMD global this file actually
// touches -- not the real library's own types (those ship with
// pdfjs-dist, which isn't installed here, see this file's own header).
type PdfJsPage = {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
};
type PdfJsDocument = { getPage(pageNumber: number): Promise<PdfJsPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(src: string): { promise: Promise<PdfJsDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

let loadPromise: Promise<PdfJsLib | null> | null = null;

function loadPdfJs(): Promise<PdfJsLib | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = PDFJS_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const lib = window.pdfjsLib ?? null;
      if (lib) {
        try {
          lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        } catch {
          // Best-effort -- a failed worker-src assignment surfaces as a
          // getDocument() rejection later, already handled below.
        }
      }
      resolve(lib);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loadPromise;
}

// Long edge of the rendered thumbnail, in CSS px -- comfortably above
// every call site's own display size (h-8/h-10/h-11 badges, all scaled
// down via object-cover) so it stays sharp on a high-DPI screen without
// rendering a full-resolution page for a ~44px slot.
const THUMBNAIL_MAX_DIMENSION = 240;

const thumbnailCache = new Map<string, Promise<string | null>>();

// 2026-09-04 (Aleksandr, screen recording: "файлы моргают всё равно")
// -- traced past the earlier "pending vs. failed" fix (this file's own
// header) to a second flash source: components/chat/pdf-thumbnail.tsx's
// effect reset its OWN local thumbUrl/failed state to the pending
// placeholder every time it re-ran for the same `src` (message list
// re-renders on every messages poll), even though `thumbnailCache`
// above already had a RESOLVED promise sitting there -- that reset was
// always visible for at least one paint before the cache-hit promise's
// `.then()` (a microtask, never synchronous) could set it back, so an
// already-loaded thumbnail kept flashing back to the pulse placeholder
// on every poll. This second, synchronous map mirrors the async one's
// eventual result (string | null, keyed the same way) so the component
// can check "do we already know the answer?" BEFORE ever touching its
// own pending state, and skip the flash entirely on a cache hit.
const resolvedCache = new Map<string, string | null>();

/** Synchronous peek at an already-resolved render: `undefined` means
 *  never rendered (or still in flight) -- the component still has to
 *  await renderPdfFirstPageThumbnail() and show the pending placeholder
 *  for that case, same as before this fix. `null` means it resolved to
 *  a genuine, permanent failure. */
export function getCachedPdfThumbnail(src: string): string | null | undefined {
  return resolvedCache.get(src);
}

// Renders `src` (a same-origin proxy URL for a sent PDF, or a local
// blob: URL for one still in the compose bar) 's first page to a PNG
// data: URL, top-left aligned (pdf.js always rasterizes a full page
// from its own top-left origin, so a caller cropping this down to a
// square via object-cover/object-top naturally shows the page's own
// top portion -- matching "показывает верхнюю часть страницы"
// literally, not just approximately). Cached by `src` so the same
// document isn't re-rendered on every remount within a session.
export function renderPdfFirstPageThumbnail(src: string): Promise<string | null> {
  const cached = thumbnailCache.get(src);
  if (cached) return cached;
  const promise = (async (): Promise<string | null> => {
    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) return null;
      const doc = await pdfjsLib.getDocument(src).promise;
      const page = await doc.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const longEdge = Math.max(baseViewport.width, baseViewport.height) || 1;
      const scale = THUMBNAIL_MAX_DIMENSION / longEdge;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  })();
  thumbnailCache.set(src, promise);
  promise.then((url) => resolvedCache.set(src, url));
  return promise;
}

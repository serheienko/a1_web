"use client";

// components/chat/tgs-sticker.tsx
//
// Block 1 follow-up (Aleksandr's 2026-09-06 go-ahead): app/chats/
// [chatId]/page.tsx's own sticker-message branch has shipped since
// 2026-09-03 as a deliberately-scoped placeholder chip ("Стикер" label,
// no rendered image) -- its own comment flagged the real fix as "its
// own decode pass, separate follow-up" because a .tgs attachment is a
// gzip-compressed Lottie JSON, not a browser-renderable raster format
// (confirmed off the mobile app's own
// `LottieBuilder.asset(decoder: LottieComposition.decodeGZip)`). This
// is that follow-up.
//
// Deliberately NOT reusing components/lottie-player.tsx as-is: that
// component's effect does `fetch(src).then(r => r.json())`, which can't
// work here -- the bytes behind buildMediaProxyUrl(doc) for a sticker
// are gzip, and `.json()` on a gzip body throws a parse error every
// time. This component does its own fetch -> arrayBuffer -> gunzip ->
// JSON.parse, then feeds the same lottie-web imperative loadAnimation()
// call LottiePlayer already uses.
//
// Gunzip via the browser's native DecompressionStream('gzip') -- no new
// dependency, and it's been supported in every browser this app
// otherwise targets (Chrome/Edge 80+, Firefox 113+, Safari 16.4+) for
// well over two years as of 2026. A browser old enough to lack it (or
// any other failure -- a corrupt file, a network error, lottie-web
// rejecting malformed JSON) falls back to `fallback` (the pre-existing
// placeholder chip) rather than showing a broken box -- same "always
// degrade to something, never a dead render" rule LottiePlayer's own
// error path follows.
import { useEffect, useRef, useState, type ReactNode } from "react";

async function gunzipToJson(bytes: ArrayBuffer): Promise<unknown> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream unsupported");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

export function TgsSticker({
  src,
  size,
  className,
  loop = true,
  fallback,
}: {
  /** buildMediaProxyUrl(doc) -- resolves to the raw .tgs bytes. */
  src: string;
  size: number;
  className?: string;
  loop?: boolean;
  fallback: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    let cancelled = false;
    let anim: { destroy: () => void } | null = null;

    (async () => {
      try {
        const [lottieModule, res] = await Promise.all([import("lottie-web"), fetch(src)]);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const bytes = await res.arrayBuffer();
        const animationData = await gunzipToJson(bytes);
        if (cancelled || !containerRef.current) return;
        const lottie = lottieModule.default;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay: true,
          animationData: animationData as object,
        });
        setLoaded(true);
      } catch (err) {
        // Expected for anything not actually a gzipped Lottie file (or
        // a browser without DecompressionStream) -- not logged as an
        // error, just a silent fall back to the chip, same as
        // isStickerMediaDocument's existing placeholder used to be
        // unconditionally.
        if (!cancelled) setFailed(true);
        void err;
      }
    })();

    return () => {
      cancelled = true;
      anim?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loop is
    // fixed per call site, src identity alone should restart the load.
  }, [src]);

  if (failed) return <>{fallback}</>;

  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse rounded-[12px] bg-black/5 dark:bg-white/10" />}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
    </div>
  );
}

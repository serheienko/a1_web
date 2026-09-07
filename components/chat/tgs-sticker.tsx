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
//
// Fix Tracker (2026-09-06, "когда показывается сразу много котов
// анимаций в паке они жестко виснут"): a sticker grid/pack renders
// every doc with no virtualization, so every single TgsSticker mounted
// -- visible or not -- used to fetch+gunzip+JSON.parse+loadAnimation
// immediately and run its own full SVG animation loop forever. With a
// few dozen stickers on screen at once that's a few dozen concurrent
// rAF-driven SVG re-renders, which is exactly the freeze Aleksandr saw.
// Telegram's own web client avoids this the same two ways applied
// below: (1) only decode/play what is actually in (or near) the
// viewport -- an IntersectionObserver gates the whole load, and
// scrolling something off-screen pauses rather than destroys it, so
// scrolling back doesn't re-fetch/re-decode; (2) render to canvas
// instead of SVG -- canvas playback is a cheap bitmap blit per frame,
// SVG playback means lottie-web mutating a live DOM subtree every
// frame, which is the more expensive of the two for busy vector
// stickers. This isn't Telegram's full RLottie/WASM pipeline (that's a
// much bigger rewrite), but it removes the actual cause of the hang --
// dozens of animations nobody's looking at -- with no new dependency.
import { useEffect, useRef, useState, type ReactNode } from "react";

async function gunzipToJson(bytes: ArrayBuffer): Promise<unknown> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream unsupported");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

type LottieAnimation = {
  destroy: () => void;
  play?: () => void;
  pause?: () => void;
};

export function TgsSticker({
  src,
  size,
  className,
  loop = true,
  fallback,
  previewUrl,
}: {
  /** getStableMediaProxyUrl(doc) (or buildMediaProxyUrl for a non-rotating id) -- resolves to the raw .tgs bytes. */
  src: string;
  size: number;
  className?: string;
  loop?: boolean;
  fallback: ReactNode;
  // Fix Tracker (2026-09-07, "скелетон лоад но как-будто их актульную
  // форму, но просто темные стикеры") -- lib/a1/media-proxy.ts's own
  // strippedPreviewDataUrl(doc), computed by the caller (this component
  // only ever gets a plain `src` string, not the doc itself, so it
  // can't derive this on its own). Optional: a call site with no
  // stripped preview available (or that hasn't been updated to pass
  // one yet) just keeps the old plain grey pulse box.
  previewUrl?: string | null;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<LottieAnimation | null>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  // Gate everything on real viewport visibility -- see header comment.
  // rootMargin gives a little lookahead so scrolling feels instant
  // instead of popping the sticker in a beat late.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(entry.isIntersecting);
      },
      { rootMargin: "200px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // New sticker identity -- drop whatever was loaded for the old one.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    loadedSrcRef.current = null;
    animRef.current?.destroy();
    animRef.current = null;
  }, [src]);

  // Load lazily on first visibility; otherwise just play/pause the
  // already-decoded animation instead of re-fetching it every time it
  // scrolls in and out of view.
  useEffect(() => {
    if (!visible) {
      animRef.current?.pause?.();
      return;
    }
    if (loadedSrcRef.current === src && animRef.current) {
      animRef.current.play?.();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [lottieModule, res] = await Promise.all([import("lottie-web"), fetch(src)]);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const bytes = await res.arrayBuffer();
        const animationData = await gunzipToJson(bytes);
        if (cancelled || !containerRef.current) return;
        const lottie = lottieModule.default;
        const anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "canvas",
          loop,
          autoplay: true,
          animationData: animationData as object,
        });
        animRef.current = anim;
        loadedSrcRef.current = src;
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loop is
    // fixed per call site, [visible, src] alone should drive reloads.
  }, [visible, src]);

  // Unmount: always tear the animation down.
  useEffect(() => {
    return () => {
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  if (failed) return <>{fallback}</>;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      {!loaded &&
        (previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- an inline base64 blob, not a proxied URL.
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full animate-pulse rounded-[12px] object-contain"
            style={{ filter: "brightness(0.4) saturate(1.15)" }}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse rounded-[12px] bg-black/5 dark:bg-white/10" />
        ))}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
    </div>
  );
}

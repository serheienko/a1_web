// components/profile-photo-viewer.tsx
//
// Fix Tracker (2026-09-07, order 109: "При нажатии на аватар в чатах:
// надо делать переход в профиль и сразу открывать фото профиля в
// большом виде, если нас еще нет просмотра фото профиля в большом
// виде - то его надо сделать правой кнопкой мыше, чтобы оно не
// конфликтовало с аудиовизиткой") -- this app had no full-size profile
// photo view anywhere yet, so this component adds one for app/u/
// [username]/page.tsx's own avatar. Ways in:
//
// 1. Left-click -- ONLY when this profile has no recorded voice intro
//    (useVoiceIntro() below returns null in that case, see
//    voice-intro-context.tsx's own `if (!url) return <>{children}</>`).
//    Fix Tracker order 122 (Aleksandr, live screenshot on Sofia
//    Benett's profile: "При нажатии на аватар из профиля открывай
//    аватар крупно") -- order 109 above deliberately scoped this to
//    right-click ONLY, for every profile, out of caution about
//    fighting voice-intro-ring.tsx's left-click-to-play; but the vast
//    majority of profiles have no voice intro at all, so for THEM
//    left-click did nothing (no ring, no context menu on mobile
//    either) -- the plain tap Aleksandr expected simply had no handler.
//    Right-click remains the only way in for a profile that DOES have
//    a voice intro, unchanged from order 109.
// 2. Right-click (onContextMenu, preventDefault to suppress the
//    browser's own image context menu) -- works everywhere this wraps
//    an avatar, independent of left-click; the one entry point left for
//    a profile whose avatar's left-click is already spoken for by
//    voice-intro-ring.tsx (tap to play/pause) -- see that file's own
//    header.
// 3. A `?photo=1` URL param, auto-opening this viewer on mount -- this
//    is what app/chats/page.tsx's chat-list avatar link (and any other
//    future "open this profile's photo" entry point) targets, since
//    THOSE avatars have no voice-intro conflict of their own and can
//    freely use a plain left-click Link straight into this page with
//    the param already set.
//
// 2026-09-13 (Aleksandr, screen recording on Solidgate's profile:
// "Сделай подгрузку аватарки в профиле через блюр тоже, чтобы не было
// пустоты") -- opening this viewer used to paint NOTHING for as long as
// the full-size photo took to come back: the <img> below is the only
// child of the backdrop, and an <img> that hasn't decoded yet has no
// intrinsic size at all, so `max-h-full max-w-full object-contain`
// collapsed it to a 0x0 box and left the dark overlay visibly empty for
// a beat. (The small avatar on the page underneath is NOT a free
// warm-up here: components/cached-avatar.tsx renders it from a blob:
// URL out of lib/avatar-image-cache.ts, while this lightbox loads the
// /api/media proxy URL itself, whose own Cache-Control window is 45s --
// see that route's header.) Fixed the same way every other photo
// surface in this app already handles it (lib/blur-placeholder.ts's own
// header, components/chat/blurred-photo.tsx): the profile's real 16x16
// blur data URL -- already computed server-side for the small avatar by
// lib/avatar-blur.ts, so it costs this page nothing extra -- is shown
// blown up and blurred, holding the box at a sensible size, and the
// real photo cross-fades in over it once decoded.
//
// 2026-09-13 follow-up, same day (Aleksandr, second screen recording on
// Mavericks Agency's profile: the stand-in was a square guess, the photo
// that replaced it was narrower -- "получается такой прыжок, типа. Ну,
// мне это не нравится... чтобы он в своём размере появился, в таком же
// как и аватар, и плавненько себе загрузился"). Both halves of that:
//   * Exact size, not a guess. The client cannot know a photo's
//     dimensions before it loads, but the SERVER already had them --
//     lib/avatar-blur.ts runs the photo through sharp anyway to make the
//     blur, so it now returns width/height alongside it
//     (generateAvatarBlurMeta) at no extra cost, and they come in here
//     as width/height attributes on the <img>. A browser lays a replaced
//     element out from those before the image loads, so the box is
//     correct from the first frame and the blur is pinned to that exact
//     box.
//   * A fade, not a cut. The photo transitions opacity 0 -> 1 over
//     PHOTO_FADE_MS ON TOP of the blur, which stays fully opaque
//     underneath for the whole fade and is dropped afterwards.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVoiceIntro } from "@/components/voice-intro-context";

// How long the photo takes to fade in over its own blur. Long enough to
// read as "плавненько", short enough not to feel like a wait.
const PHOTO_FADE_MS = 450;

// The backdrop's own padding (p-4, plus the safe-area inset at the top),
// subtracted here so the photo's max box is expressed in viewport units
// rather than as a percentage of a parent whose height is auto -- a
// percentage there silently resolves to "no limit" and lets a tall photo
// run off the screen.
const MAX_W = "calc(100vw - 2rem)";
const MAX_H = "calc(100dvh - 2rem - env(safe-area-inset-top))";

export function ProfilePhotoViewer({
  photoUrl,
  blurDataUrl,
  photoWidth,
  photoHeight,
  children,
}: {
  photoUrl: string;
  // The same per-photo 16x16 JPEG placeholder (lib/avatar-blur.ts)
  // the small avatar on this page is already given. Optional: a
  // caller without one falls back to a neutral pulsing box, which is
  // still a box rather than nothing.
  blurDataUrl?: string | null;
  // The photo's real pixel size (generateAvatarBlurMeta()). This is
  // what makes the placeholder exactly the size of the photo instead
  // of a guess -- see the header. 0/absent falls back to a square,
  // which is what a profile avatar almost always is anyway.
  photoWidth?: number;
  photoHeight?: number;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  // null whenever THIS profile has no recorded voice intro (see header
  // comment, entry point 1) -- that's when left-click is free to open
  // the photo instead of being reserved for voice-intro-ring's tap-to-play.
  const voice = useVoiceIntro();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Whether the full-size photo has decoded. Reset on every close so
  // a reopen after the browser dropped the image again (45s proxy
  // cache, see header) shows the placeholder once more instead of an
  // empty box -- when it is still cached, onLoad fires synchronously
  // enough that the placeholder is never perceived.
  const [loaded, setLoaded] = useState(false);
  // The blur layer sits UNDER the photo and is only dropped once the
  // photo has finished fading in over it. Keeping it up for the whole
  // fade is the point: two layers cross-fading at 50/50 would show the
  // dark backdrop through both, which is the flicker this is meant to
  // remove. Dropping it afterwards matters for a logo saved as a PNG
  // with a transparent background -- leave it mounted and its blur
  // shows through the photo forever.
  const [showBlur, setShowBlur] = useState(true);

  // Auto-open once on arrival when the link that brought us here asked
  // for it (see this file's own header, entry point 2).
  useEffect(() => {
    if (searchParams.get("photo") === "1") setOpen(true);
  }, [searchParams]);

  function close() {
    setOpen(false);
    setLoaded(false);
    setShowBlur(true);
    // Drop ?photo=1 so a reload/back button doesn't reopen the viewer
    // out of nowhere -- this page's other query-free URL is the real
    // "at rest" state.
    if (searchParams.get("photo") === "1") {
      router.replace(pathname, { scroll: false });
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Matches PHOTO_FADE_MS below. A timer rather than onTransitionEnd:
  // that event never fires at all when the photo was already in cache
  // and painted at opacity 1 on its very first frame, which would pin
  // the blur layer under it permanently.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => setShowBlur(false), PHOTO_FADE_MS + 60);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <>
      {/* `contents` -- this wrapper exists only to attach
          onContextMenu; it must not add a layout box of its own
          (the avatar wrapper it sits inside sizes itself off this
          child's box, see this page's own header comment at the call
          site). */}
      <div
        className="contents"
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onClick={
          voice
            ? undefined
            : () => setOpen(true)
        }
      >
        {children}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm"
          {...backdropDismiss(close)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {/* One box, sized from the photo's own pixel dimensions, with
              the blur underneath and the photo fading in on top of it.
              The size comes from the width/height attributes on the
              <img>: a browser lays a replaced element out from those
              (and the max constraints, ratio preserved) BEFORE a single
              byte of the image arrives, so the blur below -- absolutely
              positioned against this same box -- is exactly the size
              the photo lands at. No guess, no jump. The wrapper is
              inline-flex so it shrink-wraps that box rather than
              stretching. */}
          <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
            {showBlur && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-white/5"
              >
                {blurDataUrl ? (
                  <div
                    className="h-full w-full scale-110 bg-cover bg-center"
                    style={{ backgroundImage: `url(${blurDataUrl})`, filter: "blur(24px)" }}
                  />
                ) : (
                  <div className="h-full w-full animate-pulse bg-white/10" />
                )}
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- a
                full-res lightbox render, not a thumbnail; next/image's
                fixed-layout sizing fights the "shrink to fit viewport,
                whatever its aspect ratio" behavior this needs. */}
            <img
              src={photoUrl}
              alt=""
              // Fallbacks, not guesses about this particular photo: a
              // profile avatar is square, and any square number here
              // gives the right SHAPE even when the server-side probe
              // came back empty -- the max constraints below decide the
              // actual size either way.
              width={photoWidth && photoWidth > 0 ? photoWidth : 640}
              height={photoHeight && photoHeight > 0 ? photoHeight : 640}
              // A photo still in the browser's cache can finish loading
              // BEFORE React has attached onLoad, and its load event is
              // then already gone -- without this the photo would sit at
              // opacity 0 under the blur forever. `complete` +
              // naturalWidth is the standard way to ask "did I miss it?".
              // Re-setting an already-true state is a no-op in React, so
              // this cannot loop.
              ref={(el) => {
                if (el?.complete && el.naturalWidth > 0) setLoaded(true);
              }}
              onLoad={() => setLoaded(true)}
              // A photo that fails outright would otherwise leave the
              // blur up forever; better to fall back to the browser's
              // own empty <img>, exactly as before this.
              onError={() => setLoaded(true)}
              // `relative` purely to put it in the paint order ABOVE the
              // absolutely positioned blur layer -- an in-flow sibling
              // would sit under it.
              className="relative rounded-2xl object-contain"
              style={{
                // Required, and not redundant with the attributes: left
                // at their attribute values, width and height are both
                // "specified", and the max constraints below then clamp
                // each one independently -- a 900x900 photo in an
                // 800px-tall window comes out 900x768, i.e. squashed,
                // with the blur showing through the letterbox gaps.
                // `auto` restores the ratio-preserving shrink-to-fit,
                // while the attributes still supply the ratio and the
                // pre-load layout.
                width: "auto",
                height: "auto",
                maxWidth: MAX_W,
                maxHeight: MAX_H,
                opacity: loaded ? 1 : 0,
                transition: `opacity ${PHOTO_FADE_MS}ms ease-out`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

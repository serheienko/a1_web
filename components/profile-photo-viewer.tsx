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
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVoiceIntro } from "@/components/voice-intro-context";

export function ProfilePhotoViewer({
  photoUrl,
  blurDataUrl,
  children,
}: {
  photoUrl: string;
  // The same per-photo 16x16 JPEG placeholder (lib/avatar-blur.ts)
  // the small avatar on this page is already given. Optional: a
  // caller without one falls back to a neutral pulsing box, which is
  // still a box rather than nothing.
  blurDataUrl?: string | null;
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

  // Auto-open once on arrival when the link that brought us here asked
  // for it (see this file's own header, entry point 2).
  useEffect(() => {
    if (searchParams.get("photo") === "1") setOpen(true);
  }, [searchParams]);

  function close() {
    setOpen(false);
    setLoaded(false);
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
          onClick={close}
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
          {/* Deliberately a SIBLING of the <img> below rather than a
              wrapper around it: `max-h-full` on the photo resolves
              against this backdrop's own definite height (it is
              `fixed inset-0`), and an intermediate auto-height box
              would break that percentage and let a tall photo overflow
              the viewport. The placeholder simply takes the flex slot
              while the photo has no size of its own, then gets out of
              the way. A square is the right guess for it: this viewer
              only ever shows a profile avatar, and those are stored
              already cropped square. `overflow-hidden` keeps the blur
              inside the rounded corners, and the inner `scale-110`
              hides the soft, half-transparent edge a CSS blur always
              leaves behind. */}
          {!loaded && (
            <div
              aria-hidden
              onClick={(e) => e.stopPropagation()}
              className="h-[min(85vw,80vh)] w-[min(85vw,80vh)] shrink-0 overflow-hidden rounded-2xl bg-white/5"
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
            onLoad={() => setLoaded(true)}
            // A photo that fails outright would otherwise pin the
            // placeholder on screen forever; better to fall back to the
            // browser's own empty <img>, exactly as before this.
            onError={() => setLoaded(true)}
            // Parked in a 1px invisible corner rather than `hidden`
            // while it loads -- a display:none image is still fetched,
            // but this keeps that off the list of things to be sure
            // about. No cross-fade between the two on purpose: the
            // blurred stand-in is replaced by the sharp photo in one
            // frame, the same way components/chat/blurred-photo.tsx
            // swaps its own placeholder out; fading them over each
            // other would show the dark backdrop through both for a
            // moment -- the very emptiness this is here to remove.
            className={
              loaded
                ? "max-h-full max-w-full rounded-2xl object-contain"
                : "pointer-events-none absolute h-px w-px opacity-0"
            }
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

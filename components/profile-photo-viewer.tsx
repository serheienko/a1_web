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
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVoiceIntro } from "@/components/voice-intro-context";

export function ProfilePhotoViewer({ photoUrl, children }: { photoUrl: string; children: ReactNode }) {
  const searchParams = useSearchParams();
  // null whenever THIS profile has no recorded voice intro (see header
  // comment, entry point 1) -- that's when left-click is free to open
  // the photo instead of being reserved for voice-intro-ring's tap-to-play.
  const voice = useVoiceIntro();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auto-open once on arrival when the link that brought us here asked
  // for it (see this file's own header, entry point 2).
  useEffect(() => {
    if (searchParams.get("photo") === "1") setOpen(true);
  }, [searchParams]);

  function close() {
    setOpen(false);
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
          {/* eslint-disable-next-line @next/next/no-img-element -- a
              full-res lightbox render, not a thumbnail; next/image's
              fixed-layout sizing fights the "shrink to fit viewport,
              whatever its aspect ratio" behavior this needs. */}
          <img
            src={photoUrl}
            alt=""
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// components/profile-photo-viewer.tsx
//
// Fix Tracker (2026-09-07, order 109: "При нажатии на аватар в чатах:
// надо делать переход в профиль и сразу открывать фото профиля в
// большом виде, если нас еще нет просмотра фото профиля в большом
// виде - то его надо сделать правой кнопкой мыше, чтобы оно не
// конфликтовало с аудиовизиткой") -- this app had no full-size profile
// photo view anywhere yet, so this component adds one for app/u/
// [username]/page.tsx's own avatar. Two ways in:
//
// 1. Right-click (onContextMenu, preventDefault to suppress the
//    browser's own image context menu) -- works everywhere this wraps
//    an avatar, deliberately independent of left-click, because this
//    exact avatar is also wrapped in components/voice-intro-ring.tsx
//    when the profile has a recorded voice intro, and THAT already
//    owns left-click (tap to play/pause) -- see that file's own
//    header. Left-click here must never fight that existing gesture.
// 2. A `?photo=1` URL param, auto-opening this viewer on mount -- this
//    is what app/chats/page.tsx's chat-list avatar link (and any other
//    future "open this profile's photo" entry point) targets, since
//    THOSE avatars have no voice-intro conflict of their own and can
//    freely use a plain left-click Link straight into this page with
//    the param already set.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function ProfilePhotoViewer({ photoUrl, children }: { photoUrl: string; children: ReactNode }) {
  const searchParams = useSearchParams();
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

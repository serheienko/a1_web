// components/app-open-banner.tsx
//
// 2026-09-08 (Aleksandr): "покажем его, начиная с первой главной
// страницы, и покажем его над всеми кнопками сверху, ровно так, как
// делает iOS ... UI полностью копируем, как делает Apple ... ещё
// адаптируем тёмную тему цвет под нас, сделаем этот наш фирменный
// голубой ... поставим крестик, чтобы можно было закрыть ... когда
// человек нажимает крестик — анимация ровная, красивая, заезжает,
// подтягивается наверх." Replaces the old components/get-app-banner.tsx
// (a single static box wired into just app/jobs/[slug]/page.tsx, no
// close button, no animation) with one global banner shown site-wide.
//
// The REAL native "Open in the A1 app" banner Aleksandr compared this
// to (screenshot on a1appp.com) turned out, once checked, to not be
// page markup at all — no <meta name="apple-itunes-app">, no banner
// plugin anywhere in that page's <head> (grepped it live). It's iOS's
// own OS-level UI, tied to a1appp.com being one of the app's
// Associated Domains — which is also exactly why it can't be
// dismissed, and why it can't simply be added to jobs.a1appp.com from
// here: that needs a new native app build with jobs.a1appp.com added
// to the same entitlement, a separate task. This is a same-*look*
// stand-in, not that OS feature — same layout (X, icon, two-line
// title/subtitle, OPEN button), but real HTML/CSS so it also works
// outside Safari, and — unlike the real one — can be closed.
//
// Mounted as <SiteNav/>'s own first child (see that component) rather
// than a sibling in app/layout.tsx, so its height rides for free on
// that nav's existing ResizeObserver -> --site-nav-h publish
// (app/chats/[chatId]/page.tsx's 100dvh math already subtracts that
// var; a separate top-level element here would silently overflow that
// page by this banner's height until given the same plumbing) — and
// the collapse animation below rides the exact same wire: shrinking
// this element's real layout height, frame by frame, is what makes
// that ResizeObserver smoothly pull --site-nav-h (and so the rest of
// the page) up along with it, with no separate hookup needed.
//
// Dark theme swaps the background to --color-accent (Aleksandr:
// "адаптируем тёмную тему цвет под нас, сделаем этот наш фирменный
// голубой") instead of copying Apple's own near-black dark banner —
// that CSS variable is already the site's themed brand blue
// (#335EF7 light / #0C8CE9 dark, see app/globals.css), so no new
// color was invented here.
//
// Close animation: a plain height/max-height transition needs a
// hardcoded pixel target to animate *to*, which doesn't exist here
// (the banner can wrap to two lines on a narrow phone) — the
// grid-template-rows "1fr -> 0fr" trick sidesteps that by animating a
// track size, not a length, so it collapses cleanily from whatever
// height it actually rendered at down to exactly 0, no measuring
// needed. `closing` starts the CSS transition; `removed` (set after a
// timeout matched to that transition's own duration) unmounts the
// element for real once it's finished, so a closed banner doesn't
// leave an invisible-but-still-tabbable button/link sitting in the
// page. A visitor who already dismissed this in an earlier visit skips
// both states entirely (set closing=true straight away, before first
// paint) -- no pop-in-then-collapse on a page they've already closed
// this on once.
//
// Link target: on a job's own detail page the URL already carries a
// real post id (lib/seo/slug.ts's parseSlugId, read straight off
// usePathname() — no server round-trip needed), so this points at the
// same a1appp.com Universal Link the app itself already shares for
// that post: opens the app straight to it when installed, falls
// through to this same page via app/resolve/route.ts when it isn't
// (both shipped and live-tested earlier the same day). Every other
// page (home, /talents, a profile, chats, ...) has no single piece of
// content to deep-link to, so it falls back to the real App Store
// listing (confirmed live, id6443859764).
//
// Platform gate (2026-09-08, Aleksandr, on being asked about Android/
// desktop: "в зависимости от девайса показываем... на андроидных
// девайсах нам надо их тречить и показывать ссылку на ГП... на
// десктопе — скрываем"): iOS only for now, detected once from
// navigator.userAgent on mount -- same device-not-browser signal any
// "smart banner" implementation reads (Safari vs. Chrome-on-iPhone
// doesn't matter, the OS does). Android is a real, separate future
// branch, not a permanent skip -- there is simply no Google Play URL
// to link to anywhere in either repo yet (grepped both, and the "Для
// Android" button on a1appp.com's own homepage isn't wired to one
// either): the app is still in Play Store review. Wire ANDROID_STORE_URL
// below the moment Aleksandr has one and this becomes a real 3-way
// (iOS/Android/hidden) instead of a 2-way (iOS/hidden). Desktop stays
// hidden on purpose, not as a stand-in for a missing link -- standard
// practice (per that same conversation) is either no install nag on
// desktop web at all, or a QR code; a QR code is a deliberate follow-up
// if Aleksandr wants the more conversion-minded version later, not an
// oversight here.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { T } from "@/components/t";
import { parseSlugId } from "@/lib/seo/slug";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/a1-job-search-jobs-hiring/id6443859764";
// Still in Play Store review as of 2026-09-08 -- no real URL to put
// here yet. Once it exists, give Android the same treatment iOS
// already gets below instead of leaving it hidden.
const ANDROID_STORE_URL: string | null = null;

const DISMISS_KEY = "a1_app_banner_dismissed";
const COLLAPSE_MS = 280;

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function resolveHref(pathname: string | null, platform: Platform): string | null {
  // Desktop: hidden everywhere, on purpose, regardless of page -- see
  // header comment. Android: hidden until ANDROID_STORE_URL is real,
  // same reasoning, checked before the job-page branch below so a job
  // page can't accidentally show a deep link on a platform this
  // banner otherwise hides on entirely.
  if (platform === "other") return null;
  if (platform === "android" && !ANDROID_STORE_URL) return null;

  if (pathname?.startsWith("/jobs/")) {
    const slug = pathname.slice("/jobs/".length);
    const id = parseSlugId(slug);
    if (id) return `https://a1appp.com/postDetails/${id}`;
  }
  if (platform === "ios") return APP_STORE_URL;
  return ANDROID_STORE_URL;
}

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function AppOpenBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [closing, setClosing] = useState(false);
  const [removed, setRemoved] = useState(false);

  // Reads localStorage and the platform only after mount (never on the
  // server) so neither ever causes a hydration mismatch — same
  // tradeoff app/layout.tsx's own THEME_INIT_SCRIPT comment already
  // documents for anti-flash client-only state, just without that
  // script's beforeInteractive trick: a one-frame flash on a
  // *returning, already-dismissed* visitor (or one on a platform this
  // banner hides on) is a fair trade against a second server-vs-client
  // script just for this. Jumps straight past the collapse animation
  // for an already-dismissed visitor (closing=true with no transition
  // class applied yet) rather than playing it on a page load, which is
  // reserved for an actual, in-session close click below.
  useEffect(() => {
    setMounted(true);
    setPlatform(detectPlatform());
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        setClosing(true);
        setRemoved(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!closing || removed) return;
    const timer = setTimeout(() => setRemoved(true), COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [closing, removed]);

  const href = resolveHref(pathname, platform);

  if (!mounted || removed || !href) return null;

  function handleClose() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setClosing(true);
  }

  return (
    <div
      className="grid transition-[grid-template-rows] ease-out"
      style={{
        gridTemplateRows: closing ? "0fr" : "1fr",
        transitionDuration: `${COLLAPSE_MS}ms`,
      }}
    >
      <div className="overflow-hidden">
        <div
          className={
            "flex items-center gap-2 border-b border-black/10 bg-white pl-1 pr-3 py-2 transition-opacity dark:border-white/10 dark:bg-accent " +
            (closing ? "opacity-0" : "opacity-100")
          }
          style={{ transitionDuration: `${COLLAPSE_MS}ms` }}
          aria-hidden={closing}
        >
          <button
            type="button"
            onClick={handleClose}
            tabIndex={closing ? -1 : 0}
            aria-label="Закрити"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/40 transition hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            <CloseGlyph className="h-3.5 w-3.5" />
          </button>

          <a href={href} tabIndex={closing ? -1 : 0} className="flex min-w-0 flex-1 items-center gap-2.5">
            <img
              src="https://a1appp.com/wp-content/uploads/2024/02/favicon.png"
              alt="A1"
              className="h-10 w-10 shrink-0 rounded-[9px]"
            />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-black dark:text-white">
                A1
              </span>
              <span className="block truncate text-xs text-black/60 dark:text-white/80">
                <T
                  uk="Відкрити у застосунку A1"
                  en="Open in the A1 app"
                  ru="Открыть в приложении A1"
                  de="In der A1-App öffnen"
                  es="Abrir en la app A1"
                  fr="Ouvrir dans l'app A1"
                  pl="Otwórz w aplikacji A1"
                  ptBR="Abrir no app A1"
                  zh="在 A1 应用中打开"
                />
              </span>
            </span>

            <span className="shrink-0 pl-2 text-sm font-semibold text-accent dark:text-white">
              <T
                uk="ВІДКРИТИ"
                en="OPEN"
                ru="ОТКРЫТЬ"
                de="ÖFFNEN"
                es="ABRIR"
                fr="OUVRIR"
                pl="OTWÓRZ"
                ptBR="ABRIR"
                zh="打开"
              />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

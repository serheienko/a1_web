// components/app-open-banner.tsx
//
// 2026-09-08 (Aleksandr): "покажем его, начиная с первой главной
// страницы, и покажем его над всеми кнопками сверху, ровно так, как
// делает iOS ... UI полностью копируем, как делает Apple ... ещё
// адаптируем тёмную тему цвет под нас, сделаем этот наш фирменный
// голубой ... поставим крестик, чтобы можно было закрыть." Replaces
// the old components/get-app-banner.tsx (a single static box wired
// into just app/jobs/[slug]/page.tsx, no close button) with one global
// banner shown site-wide.
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
// page by this banner's height until given the same plumbing).
//
// Dark theme swaps the background to --color-accent (Aleksandr:
// "адаптируем тёмную тему цвет под нас, сделаем этот наш фирменный
// голубой") instead of copying Apple's own near-black dark banner —
// that CSS variable is already the site's themed brand blue
// (#335EF7 light / #0C8CE9 dark, see app/globals.css), so no new
// color was invented here.
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
// listing on iOS (confirmed live, id6443859764). No Play Store link
// exists anywhere in either repo yet (grepped both, and the "Для
// Android" button on a1appp.com's own homepage isn't wired to one
// either) — Android/desktop visitors fall back to a1appp.com itself
// until Aleksandr has a real one to swap in here.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { T } from "@/components/t";
import { parseSlugId } from "@/lib/seo/slug";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/a1-job-search-jobs-hiring/id6443859764";
// No confirmed Play Store URL yet — see header comment. Swap this the
// moment Aleksandr hands one over; every Android/desktop visitor lands
// here in the meantime, which at least has its own download section.
const FALLBACK_URL = "https://a1appp.com/";

const DISMISS_KEY = "a1_app_banner_dismissed";

function resolveHref(pathname: string | null): string {
  if (pathname?.startsWith("/jobs/")) {
    const slug = pathname.slice("/jobs/".length);
    const id = parseSlugId(slug);
    if (id) return `https://a1appp.com/postDetails/${id}`;
  }
  if (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
    return APP_STORE_URL;
  }
  return FALLBACK_URL;
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
  const [dismissed, setDismissed] = useState(false);

  // Reads localStorage only after mount (never on the server) so this
  // never causes a hydration mismatch — same tradeoff app/layout.tsx's
  // own THEME_INIT_SCRIPT comment already documents for anti-flash
  // client-only state, just without that script's beforeInteractive
  // trick: a one-frame flash on a *returning, already-dismissed*
  // visitor is a fair trade against a second server-vs-client theme
  // script just for this.
  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {}
  }, []);

  if (!mounted || dismissed) return null;

  const href = resolveHref(pathname);

  return (
    <div className="flex items-center gap-2 border-b border-black/10 bg-white pl-1 pr-3 py-2 dark:border-white/10 dark:bg-accent">
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {}
          setDismissed(true);
        }}
        aria-label="Закрити"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/40 transition hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
      >
        <CloseGlyph className="h-3.5 w-3.5" />
      </button>

      <a href={href} className="flex min-w-0 flex-1 items-center gap-2.5">
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
  );
}

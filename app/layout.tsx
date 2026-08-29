import type { Metadata, Viewport } from "next";
import { Commissioner } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { CreatePostFab } from "@/components/create-post-fab";

// Commissioner: the real typeface used in the Figma mockups (confirmed via
// Inspect on "Feed Preview White", 2026-08-26), not a generic system stack.
// Cyrillic coverage was verified before adopting it — the UI is Russian —
// see the comment block in app/globals.css for the full source note.
const commissioner = Commissioner({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-commissioner",
  display: "swap",
});


// Anti-flash theme script: next/script's `beforeInteractive` strategy is
// the documented way to run something before hydration/paint AND have
// Next guarantee it's hoisted into <head> regardless of where the
// component sits in the tree — a plain <script> placed inside a literal
// <head> tag in the root layout does NOT reliably get that same ordering
// guarantee (confirmed against Next's own docs before using this, not
// assumed). Reads the same localStorage key components/theme-toggle.tsx
// writes; falls back to the OS preference (by setting neither class) when
// nothing's stored yet — matches the @custom-variant in app/globals.css.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var root = document.documentElement;
    if (stored === "dark") root.classList.add("dark");
    else if (stored === "light") root.classList.add("light");
  } catch (e) {}
})();
`;

// Same anti-flash trick, now for the full 9-language switcher (2026-08-27,
// see components/lang-toggle.tsx and components/t.tsx). Every language —
// including Ukrainian — needs an explicit lang-XX class for its <T/> spans
// to show (components/t.tsx wraps ALL nine locales symmetrically in
// "hidden lang-XX:inline", not just a non-default one), so this always
// ends by setting exactly one such class, clearing any others first
// (the <html> tag below bakes in lang-uk as the no-JS/pre-hydration
// fallback; this script corrects it to the real resolved locale before
// first paint, same guarantee beforeInteractive already gives THEME_INIT_SCRIPT).
//
// Resolution order: (1) an explicit stored choice from LangToggle always
// wins; (2) otherwise, a geo-based default computed from middleware.ts's
// a1_geo cookie (IP-detected, mirrors "хотелось бы, чтобы сайт
// автоматически определял [язык] в зависимости от IP, но при этом выбор
// также оставался" — auto-detect by default, manual pick always
// override-able); (3) unmapped/unknown countries fall back to the site's
// own default, Ukrainian — deliberately not English, matching the
// existing <html lang="uk"> choice below.
//
// Ukraine carve-out (2026-08-27/28, see middleware.ts, quoted precisely
// because the scope matters): "это только касается русского языка в гео
// Украине... все остальные языки... должны показываться как
// переключатель" — geo-ua drops ONLY "ru" from consideration, both as a
// stored choice (even stale localStorage from before this rule existed)
// and as a geo-detected default. It never disables language-switching
// itself — see components/lang-toggle.tsx, which keeps every other
// language selectable for Ukraine-geo visitors.
const LANG_INIT_SCRIPT = `
(function () {
  try {
    var root = document.documentElement;
    var LOCALES = ["uk", "en", "ru", "de", "es", "fr", "pl", "ptBR", "zh"];
    var CLASS_FOR = {
      uk: "lang-uk", en: "lang-en", ru: "lang-ru", de: "lang-de",
      es: "lang-es", fr: "lang-fr", pl: "lang-pl", ptBR: "lang-ptbr", zh: "lang-zh"
    };
    var TAG_FOR = {
      uk: "uk", en: "en", ru: "ru", de: "de", es: "es", fr: "fr",
      pl: "pl", ptBR: "pt-BR", zh: "zh-Hans"
    };

    var match = document.cookie.match(/(?:^|; )a1_geo=([^;]*)/);
    var country = match ? decodeURIComponent(match[1]) : "";
    var isGeoUa = country === "UA";
    if (isGeoUa) root.classList.add("geo-ua");

    var stored = null;
    try {
      var s = localStorage.getItem("lang");
      if (s && LOCALES.indexOf(s) !== -1) stored = s;
    } catch (e) {}
    // Hard rule, no exceptions: never Russian for a Ukraine-geo visitor,
    // even a choice they made before this rule existed.
    if (isGeoUa && stored === "ru") stored = null;

    var locale = stored;
    if (!locale) {
      var GEO_DEFAULT = {
        UA: "uk",
        DE: "de", AT: "de", CH: "de",
        ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
        EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
        SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es",
        FR: "fr", BE: "fr",
        PL: "pl",
        BR: "ptBR",
        CN: "zh",
        RU: "ru", BY: "ru", KZ: "ru"
      };
      locale = GEO_DEFAULT[country] || "uk";
      if (isGeoUa && locale === "ru") locale = "uk";
    }
    if (LOCALES.indexOf(locale) === -1) locale = "uk";

    for (var i = 0; i < LOCALES.length; i++) root.classList.remove(CLASS_FOR[LOCALES[i]]);
    root.classList.add(CLASS_FOR[locale]);
    root.lang = TAG_FOR[locale];
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  // Absolute base for every relative URL in metadata across the app —
  // notably the file-convention opengraph-image.tsx/twitter-image
  // outputs (2026-08-28: added alongside those), which need an absolute
  // <meta property="og:image"> URL to be usable when a link is shared.
  metadataBase: new URL("https://jobs.a1appp.com"),
  title: "A1 Web",
  description: "A1 — вакансии и специалисты из приложения A1, в вебе.",
  // Set GOOGLE_SITE_VERIFICATION in Vercel once you create the Search
  // Console property (Settings -> Ownership verification -> HTML tag ->
  // copy just the `content` value, not the whole tag) — this renders it
  // as <meta name="google-site-verification">. No code change needed
  // after that; omitted entirely if the env var isn't set.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// Aleksandr, 2026-08-27: header should fog/blur under the iPhone status
// bar/notch like the native app does, instead of a hard white edge —
// needs `viewport-fit=cover` or `env(safe-area-inset-top)` in
// site-nav.tsx's CSS always resolves to 0 and the notch area just shows
// plain page background with nothing painted into it.
export const viewport: Viewport = {
  viewportFit: "cover",
  // 2026-08-28: partial fix for a dark-theme flash on a hard reload
  // (repro'd on video) — this tells the browser BOTH color schemes are
  // supported so its own UA chrome (scrollbars, form controls, the
  // flash-of-white/black before THEME_INIT_SCRIPT above runs) picks
  // whichever matches the OS immediately, instead of always assuming
  // light. Does not fully eliminate the flash for a user with an
  // explicit stored light/dark choice that differs from their OS
  // setting — that needs the class read on the server before first
  // paint, which means reading a cookie in the root layout, which would
  // force server-dynamic rendering and drop ISR site-wide (app/page.tsx,
  // app/talents/page.tsx). Aleksandr: leave it here, don't chase the
  // rest — see PLAN.md's ISR tradeoffs.
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={commissioner.variable + " lang-uk"}>
      <body className="bg-app font-sans text-ink dark:bg-black dark:text-neutral-100">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Script id="lang-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: LANG_INIT_SCRIPT }} />
        <SiteNav />
        {children}
        {/* 2026-08-29: floating "+" create-post button, mounted globally
            here next to <SiteNav/> for the same reason that one is —
            shown on every page, signed in or not (Aleksandr: "С логином
            и без"). See components/create-post-fab.tsx's own comment. */}
        <CreatePostFab />
        <Analytics />
      </body>
    </html>
  );
}

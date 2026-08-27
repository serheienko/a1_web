import type { Metadata } from "next";
import { Commissioner } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

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

// Same anti-flash trick, for the UA/RU switch (2026-08-27, see
// components/lang-toggle.tsx and components/t.tsx). Default is Ukrainian
// (no class, no stored choice, matches <html lang="uk"> below) — this
// only ever needs to ADD .lang-ru when "ru" was explicitly chosen.
//
// Ukraine carve-out (2026-08-27, see middleware.ts): if the visitor is
// geolocated to Ukraine, this returns immediately after stamping
// .geo-ua — it never even LOOKS at a stored "ru" preference for them.
// Wartime context, Aleksandr was explicit: not just "default to
// Ukrainian", the RU option shouldn't be offered at all for a Ukraine
// visitor, no exceptions (stale localStorage from before included).
const LANG_INIT_SCRIPT = `
(function () {
  try {
    var root = document.documentElement;
    if (document.cookie.indexOf("a1_geo=UA") !== -1) {
      root.classList.add("geo-ua");
      return;
    }
    var stored = localStorage.getItem("lang");
    if (stored === "ru") {
      root.classList.add("lang-ru");
      root.lang = "ru";
    }
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={commissioner.variable}>
      <body className="bg-app font-sans text-ink dark:bg-black dark:text-neutral-100">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Script id="lang-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: LANG_INIT_SCRIPT }} />
        <SiteNav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

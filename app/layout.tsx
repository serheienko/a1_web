import type { Metadata } from "next";
import { Commissioner } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
    <html lang="ru" className={commissioner.variable}>
      <body className="bg-app font-sans text-ink dark:bg-black dark:text-neutral-100">
        <SiteNav />
        {/* md:pl-64 offsets for the fixed sidebar SiteNav becomes at the md
            breakpoint — see components/site-nav.tsx. Below md, SiteNav is a
            normal top bar in flow, so this padding is inert there (0). */}
        <div className="md:pl-64">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}

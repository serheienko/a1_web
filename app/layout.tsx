import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

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
    <html lang="ru">
      <body className="bg-white text-neutral-900 dark:bg-black dark:text-neutral-100">
        <SiteNav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

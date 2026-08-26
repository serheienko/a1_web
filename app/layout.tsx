import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "A1 Web",
  description: "A1 — вакансии и специалисты из приложения A1, в вебе.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-white text-neutral-900">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}

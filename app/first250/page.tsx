// app/first250/page.tsx -- акция «Перші 250» (14.10.2026, Александр): первые 250 человек, которые
// скачали A1 и заполнили профиль, получают Premium на год, когда он появится. Ссылка -- из поста в
// Telegram-группе. Вся логика и вид -- first250-client.tsx, запись -- app/api/first250.
import type { Metadata } from "next";
import { First250Client } from "./first250-client";

export const metadata: Metadata = {
  title: "Перші 250 — A1 Premium на рік у подарунок",
  description: "Завантаж A1, заповни профіль і забери місце серед перших 250 — Premium на рік безкоштовно.",
  alternates: { canonical: "https://jobs.a1appp.com/first250" },
  openGraph: {
    title: "Перші 250 — A1 Premium на рік у подарунок 🎁",
    description: "Завантаж A1, заповни профіль і забери місце серед перших 250.",
    url: "https://jobs.a1appp.com/first250",
    type: "website",
    images: [{ url: "https://jobs.a1appp.com/first250/og.jpg", width: 1200, height: 675, alt: "Welcome to A1 — First 250" }],
  },
  twitter: { card: "summary_large_image", images: ["https://jobs.a1appp.com/first250/og.jpg"] },
  // Акционная страница на пару недель -- в поиске ей делать нечего.
  robots: { index: false, follow: true },
};

export default function First250Page() {
  return <First250Client />;
}

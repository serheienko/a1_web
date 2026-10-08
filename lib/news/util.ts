// lib/news/util.ts -- мелкие общие функции раздела «IT новини».
import type { NewsArticle } from "./types";

export function readingMinutes(a: NewsArticle): number {
  const words = a.blocks
    .map((b) => {
      switch (b.t) {
        case "p":
        case "h2":
        case "note":
          return b.text;
        case "ul":
          return b.items.join(" ");
        default:
          return "";
      }
    })
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function newsDate(iso: string, lang: "uk" | "en"): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString(lang === "uk" ? "uk-UA" : "en-US", { day: "numeric", month: "long", year: "numeric" });
}

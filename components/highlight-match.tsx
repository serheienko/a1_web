// components/highlight-match.tsx
//
// Wraps every case-insensitive occurrence of `query` inside `text` in a
// blue mark -- Aleksandr, 2026-09-09, looking at a search for "consultant"
// where none of the three matching words in the results stood out: "можем
// красиво подсвечивать синей подсветкой слова которые метчатся по вводу".
// Pure string splitting, renders plain text back when there's no query or
// no match -- safe to call from PostCard, which is a server component
// (no client JS needed for this).
import type { ReactNode } from "react";

export function HighlightMatches({ text, query }: { text: string; query?: string | null }): ReactNode {
  const trimmed = query?.trim();
  if (!trimmed) return text;

  // The search box passes whatever the visitor typed straight through as
  // `q` -- a stray "(", "+", "." etc. in a real search term must not be
  // read as regex syntax here.
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length === 1) return text;

  const lowerTrimmed = trimmed.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lowerTrimmed ? (
      // Same accent-blue token the "Вакансія" kind badge uses
      // (bg-accent/10 + text-accent), so this reads as "highlighted",
      // not as a random new color -- and it already tracks both themes.
      <mark key={i} className="rounded bg-accent/10 px-0.5 text-accent dark:bg-accent/20">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

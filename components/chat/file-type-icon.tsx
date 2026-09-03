// components/chat/file-type-icon.tsx
//
// 2026-09-03 (Aleksandr, Figma ref https://figma.com/design/.../node-id=
// 24368-126, "5. Chat view": "надо, чтобы показывало разные иконки...
// если ZIP, показывает такую вот иконку с ZIP этим. Если XLS -- другую.
// Плюс ещё показывает вес") -- a per-extension colored badge (own
// glyph label + brand-ish color per family: Excel green, Word blue,
// PDF red, archive amber, ...) instead of one generic paperclip icon
// for every non-image attachment, used by both the compose-side
// previews and the sent-message document row in
// app/chats/[chatId]/page.tsx.
//
// The reference frame's own PDF card shows an actual rendered
// page-thumbnail, not an icon. This badge itself still doesn't do
// that (it's a pure per-kind icon, no rendering) -- as of 2026-09-03,
// app/chats/[chatId]/page.tsx now renders a real thumbnail
// client-side (components/chat/pdf-thumbnail.tsx + lib/
// pdf-thumbnail.ts, a CDN-loaded pdf.js) and falls BACK to this same
// PDF badge (kind="pdf") while that's loading, or if it fails --
// still the fallback for every non-PDF kind, and for a PDF too until
// the real pipeline note below matures. See lib/pdf-thumbnail.ts's
// own header for exactly what's confirmed vs. not about that
// approach (it could not be tested live in this session).
export type FileKind = "zip" | "sheet" | "doc" | "slides" | "pdf" | "text" | "audio" | "other";

const KIND_STYLE: Record<FileKind, { bg: string; fg: string; label: string }> = {
  zip: { bg: "#f2b134", fg: "#7a4b00", label: "ZIP" },
  sheet: { bg: "#1f9d55", fg: "#ffffff", label: "XLS" },
  doc: { bg: "#2b6cd4", fg: "#ffffff", label: "DOC" },
  slides: { bg: "#d24726", fg: "#ffffff", label: "PPT" },
  pdf: { bg: "#e5493f", fg: "#ffffff", label: "PDF" },
  text: { bg: "#8a93a6", fg: "#ffffff", label: "TXT" },
  audio: { bg: "#7c5cff", fg: "#ffffff", label: "MP3" },
  // Fallback -- keeps this app's existing received-doc-bubble tint
  // (#5577a4, see the docMedia row this replaces) so an unrecognized
  // extension doesn't jump out as an error state.
  other: { bg: "#5577a4", fg: "#ffffff", label: "FILE" },
};

// Extension -> kind lookup. `csv`/`numbers` fold into "sheet",
// `pages`/`odt`/`rtf` into "doc", `key`/`odp` into "slides" -- grouped
// by what they visually are (a spreadsheet, a document, a deck), not
// by which app produced them.
const KIND_EXTENSIONS: Record<string, FileKind> = {
  zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip",
  xls: "sheet", xlsx: "sheet", csv: "sheet", numbers: "sheet",
  doc: "doc", docx: "doc", rtf: "doc", pages: "doc", odt: "doc",
  ppt: "slides", pptx: "slides", key: "slides", odp: "slides",
  pdf: "pdf",
  txt: "text", md: "text", log: "text",
  mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", aac: "audio",
};

export function fileKindFromName(fileName: string, mimetype?: string): FileKind {
  const ext = fileName.includes(".") ? (fileName.split(".").pop()?.toLowerCase() ?? "") : "";
  if (ext && KIND_EXTENSIONS[ext]) return KIND_EXTENSIONS[ext];
  if (mimetype) {
    if (mimetype.startsWith("audio/")) return "audio";
    if (mimetype === "application/pdf") return "pdf";
    if (mimetype === "application/zip" || mimetype === "application/x-zip-compressed") return "zip";
    if (mimetype.includes("spreadsheet") || mimetype === "text/csv") return "sheet";
    if (mimetype.includes("wordprocessing") || mimetype === "application/msword") return "doc";
    if (mimetype.includes("presentation")) return "slides";
    if (mimetype.startsWith("text/")) return "text";
  }
  return "other";
}

type Props = {
  kind: FileKind;
  className?: string;
  // 2026-09-03 (Aleksandr: "1:1 с Figma" follow-up on the Attachments
  // feature's red "too large" card -- the reference screenshot shows
  // the WHOLE card red-tinted, icon included, not just the surrounding
  // card/text) -- "error" swaps this badge's own per-kind brand color
  // for a flat red, keeping the same glyph+label so the file TYPE is
  // still legible, just recolored to read as an error state. Only
  // caller today is the tooLarge attachment card in
  // app/chats/[chatId]/page.tsx.
  tone?: "brand" | "error";
};

// A flat colored badge -- faint document-silhouette watermark behind a
// short bold extension label, this app's own established icon style
// (components/chat/icons.tsx: flat stroke shapes, no gradients/shadows)
// applied to a per-type color instead of one shared neutral tone.
export function ChatFileTypeIcon({ kind, className = "h-11 w-11", tone = "brand" }: Props) {
  const { bg, fg, label } = KIND_STYLE[kind];
  const bgColor = tone === "error" ? "#ef4444" : bg;
  const fgColor = tone === "error" ? "#ffffff" : fg;
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={fgColor} strokeWidth="1.5" className="absolute inset-0 h-full w-full p-[16%] opacity-25" aria-hidden="true">
        <path d="M6 2h8l4 4v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
        <path d="M14 2v4h4" />
      </svg>
      <span className="relative text-[9px] font-bold tracking-tight" style={{ color: fgColor }}>
        {label}
      </span>
    </div>
  );
}

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
// page-thumbnail, not an icon -- this app has no PDF-thumbnail
// generation pipeline (no library, no server-side renderer, nothing in
// chat-server's own upload response to point at one), so PDF gets its
// own red icon like every other kind here instead of a real preview.
// Flagged as a known, deliberate gap -- revisit if Aleksandr wants a
// true page thumbnail (would need a server-side render step on
// upload).
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

type Props = { kind: FileKind; className?: string };

// A flat colored badge -- faint document-silhouette watermark behind a
// short bold extension label, this app's own established icon style
// (components/chat/icons.tsx: flat stroke shapes, no gradients/shadows)
// applied to a per-type color instead of one shared neutral tone.
export function ChatFileTypeIcon({ kind, className = "h-11 w-11" }: Props) {
  const { bg, fg, label } = KIND_STYLE[kind];
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] ${className}`}
      style={{ backgroundColor: bg }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.5" className="absolute inset-0 h-full w-full p-[16%] opacity-25" aria-hidden="true">
        <path d="M6 2h8l4 4v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
        <path d="M14 2v4h4" />
      </svg>
      <span className="relative text-[9px] font-bold tracking-tight" style={{ color: fg }}>
        {label}
      </span>
    </div>
  );
}

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
import { T } from "@/components/t";

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

// 2026-09-04 (Aleksandr, live /api/chats/messages data he pulled himself
// via Safari Web Inspector, chat 6a9850d1c9f67752c6aa2303): a .docx
// message and an application/octet-stream message in that same chat
// both came back with `attributes: []` -- completely empty, no
// `attribute-filename` at all -- while three PDF messages in the SAME
// chat correctly carried one. Traced app/api/upload/create/route.ts:
// this app's own upload flow already attaches `attribute-filename` for
// EVERY file type it uploads (fixed 2026-09-03, not just PDFs), so a
// file sent through this website from here on will always carry its
// real name. These two empty-attribute messages predate that fix (or
// came from a different client) -- there's no name left to recover for
// them; a filename that was never stored can't be reconstructed
// client-side. This component only softens the fallback for messages
// stuck in that state: instead of a bare, unhelpful "Document" for
// every kind, a recognizable kind (docx's mimetype IS still present,
// even with no filename) gets a specific generic label ("Word
// document" instead of "Document"). A truly generic upload (like the
// octet-stream one, which carries no type info at all) still falls
// back to the plain "Document" text -- there's genuinely nothing more
// to say about it.
export function DocumentFallbackLabel({ kind }: { kind: FileKind }) {
  switch (kind) {
    case "doc":
      return <T uk="Документ Word" en="Word document" ru="Документ Word" de="Word-Dokument" es="Documento de Word" fr="Document Word" pl="Dokument Word" ptBR="Documento do Word" zh="Word 文档" />;
    case "sheet":
      return <T uk="Таблиця Excel" en="Excel spreadsheet" ru="Таблица Excel" de="Excel-Tabelle" es="Hoja de Excel" fr="Feuille Excel" pl="Arkusz Excel" ptBR="Planilha do Excel" zh="Excel 表格" />;
    case "slides":
      return <T uk="Презентація" en="Presentation" ru="Презентация" de="Präsentation" es="Presentación" fr="Présentation" pl="Prezentacja" ptBR="Apresentação" zh="演示文稿" />;
    case "pdf":
      return <T uk="Документ PDF" en="PDF document" ru="Документ PDF" de="PDF-Dokument" es="Documento PDF" fr="Document PDF" pl="Dokument PDF" ptBR="Documento PDF" zh="PDF 文档" />;
    case "zip":
      return <T uk="Архів" en="Archive" ru="Архив" de="Archiv" es="Archivo comprimido" fr="Archive" pl="Archiwum" ptBR="Arquivo compactado" zh="压缩包" />;
    case "text":
      return <T uk="Текстовий файл" en="Text file" ru="Текстовый файл" de="Textdatei" es="Archivo de texto" fr="Fichier texte" pl="Plik tekstowy" ptBR="Arquivo de texto" zh="文本文件" />;
    case "audio":
      return <T uk="Аудіофайл" en="Audio file" ru="Аудиофайл" de="Audiodatei" es="Archivo de audio" fr="Fichier audio" pl="Plik audio" ptBR="Arquivo de áudio" zh="音频文件" />;
    default:
      return <T uk="Документ" en="Document" ru="Документ" de="Dokument" es="Documento" fr="Document" pl="Dokument" ptBR="Documento" zh="文档" />;
  }
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

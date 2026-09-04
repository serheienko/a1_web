// components/chat/chat-preview-line.tsx
//
// 2026-09-04 (Aleksandr, 5 reference screenshots of the reference app's
// own chat-list preview line: "Вот, на все наши entity в сообщениях,
// должно так отображать в чат листе") -- app/api/chats/list/route.ts's
// previewText used to come from extractMessageText alone, which only
// reads entity-text and returns "" for a caption-less media/entity
// message -- exactly the "chats look empty but aren't, there was a
// file or a voice message" bug he flagged. That route now also sends
// previewKind (lib/a1/chat-schemas.ts's describeMessagePreview) and,
// for a photo, previewPhotoUrl. This renders the right localized label
// per kind, reused identically by app/chats/page.tsx's own row and
// components/chats-flyout.tsx's nav flyout (both showed the same
// previewText before this).
//
// 2026-09-04 follow-up: "Scheduled meeting" was deliberately left out
// of the kinds handled here when this file was first written, same
// day, before Meetings had a real send path yet ("это наперед, функцию
// еще запилим"). It shipped later that same day (PLAN.md 6.124), and a
// meeting proposal/accept rides as plain text with its own marker
// prefix (lib/a1/meeting-protocol.ts) -- so a chat whose last message
// is one showed the raw "A1MEETINGv1::eyJ2Ijox..." marker+base64 as
// its preview line, same bug class this file exists to fix for every
// OTHER entity type, just not caught here yet (Aleksandr, live
// screenshot of the chat list). describeMessagePreview
// (lib/a1/chat-schemas.ts) now recognizes it and returns kind
// "meeting" before ever reaching the raw-text fallback; this file only
// needed the matching label + icon below.
"use client";

import { T } from "@/components/t";
import { ChatMicGlyph, ChatCalculatorAttachIcon, ChatMeetingAttachIcon, ChatContactAttachIcon } from "./icons";

export type MessagePreviewKind = "text" | "voice" | "photo" | "video" | "sticker" | "file" | "contact" | "calc" | "meeting";

function PreviewLabel({ kind }: { kind: Exclude<MessagePreviewKind, "text" | "file"> }) {
  switch (kind) {
    case "voice":
      return (
        <T
          uk="Голосове повідомлення" en="Voice Message" ru="Голосовое сообщение" de="Sprachnachricht"
          es="Mensaje de voz" fr="Message vocal" pl="Wiadomość głosowa" ptBR="Mensagem de voz" zh="语音消息"
        />
      );
    case "photo":
      return <T uk="Фото" en="Photo" ru="Фото" de="Foto" es="Foto" fr="Photo" pl="Zdjęcie" ptBR="Foto" zh="照片" />;
    case "video":
      return <T uk="Відео" en="Video" ru="Видео" de="Video" es="Video" fr="Vidéo" pl="Wideo" ptBR="Vídeo" zh="视频" />;
    case "sticker":
      return <T uk="Стікер" en="Sticker" ru="Стикер" de="Sticker" es="Sticker" fr="Autocollant" pl="Naklejka" ptBR="Figurinha" zh="贴纸" />;
    case "contact":
      return <T uk="Контакт" en="Contact" ru="Контакт" de="Kontakt" es="Contacto" fr="Contact" pl="Kontakt" ptBR="Contato" zh="联系人" />;
    case "calc":
      return (
        <T
          uk="Розрахунок" en="Calculation" ru="Калькуляция" de="Berechnung" es="Cálculo"
          fr="Calcul" pl="Kalkulacja" ptBR="Cálculo" zh="计算"
        />
      );
    case "meeting":
      // Same label either way (a proposal or its Accept echo) -- see
      // describeMessagePreview's own comment on why the list row
      // doesn't distinguish the two.
      return (
        <T
          uk="Запланована зустріч" en="Scheduled meeting" ru="Запланированная встреча" de="Geplantes Treffen"
          es="Reunión programada" fr="Réunion planifiée" pl="Zaplanowane spotkanie" ptBR="Reunião agendada" zh="已安排会议"
        />
      );
  }
}

export function ChatPreviewLine({
  kind,
  text,
  photoUrl,
  className,
}: {
  kind: MessagePreviewKind;
  text: string;
  photoUrl: string | null;
  className?: string;
}) {
  if (kind === "text" || kind === "file") {
    if (!text) return null;
    return <div className={className}>{text}</div>;
  }
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      {kind === "photo" && photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- proxied
        // through /api/media, not a next/image-configured remote host.
        <img src={photoUrl} alt="" className="h-4 w-4 shrink-0 rounded-[4px] object-cover" />
      )}
      {/* 2026-09-04 (Aleksandr, screenshot of the chat list: "На
          голосовое сообщение и калькуляции добавь иконки слева
          вначале") -- same slot/size the photo thumbnail above already
          uses (h-4 w-4 shrink-0), reusing the exact glyphs the attach
          menu itself already ships (components/chat/icons.tsx) instead
          of drawing new ones -- currentColor picks up this line's own
          muted preview-text color automatically. */}
      {/* 2026-09-04 (Aleksandr, screenshot: "Увеличь иконку голосового,
          щоб +- менчилась с розрахунком") -- both sit in the same h-4
          box, but ChatMicGlyph's own glyph (icons.tsx) fills noticeably
          less of its 38x38 viewBox than ChatCalculatorAttachIcon's does
          of its 24x24 one, so at equal container size the mic read
          smaller/thinner. Bumped the mic's own box up a notch (h-4 ->
          h-[18px]) rather than touching the calc icon, which already
          looked right. */}
      {kind === "voice" && <ChatMicGlyph className="h-[18px] w-[18px] shrink-0" />}
      {kind === "calc" && <ChatCalculatorAttachIcon className="h-4 w-4 shrink-0" />}
      {kind === "meeting" && <ChatMeetingAttachIcon className="h-4 w-4 shrink-0" />}
      {/* 2026-09-04 follow-up (Aleksandr, live screenshot: "'Контакт'
          надо иконка слева") -- same slot every other non-text/file
          kind already gets; contact was the one left without one. */}
      {kind === "contact" && <ChatContactAttachIcon className="h-4 w-4 shrink-0" />}
      <span className="truncate">
        <PreviewLabel kind={kind} />
      </span>
    </div>
  );
}

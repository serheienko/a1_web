// components/chat/meetings-menu-modal.tsx
//
// 2026-09-04 (Aleksandr, full-flow voice spec + Figma "Scheduled
// Meetings" reference screenshots he dropped into the connected
// A1_Web_Figma folder): the popup behind the attach menu's "Meetings"
// row (app/chats/[chatId]/page.tsx), previously a placeholder with no
// feature behind it ("у нас появится встречи, но чуть позже я
// расскажу"). This first pass ships only the "Quick Invites" half he
// called done/simple -- two one-tap canned-message buttons, each with
// its own cat mascot animation (Figma "2. Menu.png": a waving cat for
// "Let's meet online?", a cat carrying a bag for "Let's meet in
// person?" -- his own supplied HiCat.tgs/Coffee_cat.tgs, decompressed
// to public/animations/cat-hi.json [byte-identical to the app's
// existing cat-hi.json/hi-cat-email-code.json, reused rather than
// duplicated] and cat-coffee.json).
//
// "Schedule meeting" (the structured propose/accept/reveal flow, Figma
// "(1) Schedule a Meeting" / "(2) Display Meeting") is now wired below
// to open components/chat/schedule-meeting-modal.tsx. It ships on the
// text-message protocol documented in lib/a1/meeting-protocol.ts's own
// header comment, NOT a real `entity-meeting` backend object -- chat-
// server's live OpenAPI spec (api.a1appp.com/openapi.json) has no
// meeting-related schema at all, unlike Contact/Calculation (which it
// does define), and there was no safe way to confirm messages.send
// would accept an unrecognized entities[].object value without gambling
// on a live production send. The manual profile-timezone-override
// question is resolved too (Aleksandr, "Автоматически" -- device-
// automatic only, no override needed for v1); see meeting-protocol.ts's
// own TIMEZONE NOTE for why that's enough.
"use client";

import { T, type Locale } from "@/components/t";
import { LottiePlayer } from "@/components/lottie-player";
import { ChatBackArrow, ChatMeetingAttachIcon } from "./icons";

type StringKey = "title" | "scheduleMeeting" | "quickInvites" | "meetOnline" | "meetInPerson";

// Quick-invite copy is CONFIRMED, not guessed -- exact text pulled from
// Aleksandr's own Figma export "(4.1) Sent invite.png" (his prior
// placeholder text -- "How about in online meeting" / "how about
// meeting up in person" -- was explicitly flagged by him as wrong/too
// long). Other locales are this session's own translation of that
// confirmed English line, same convention every other multi-locale
// string in this codebase already follows.
const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Зустрічі", en: "Meetings", ru: "Встречи", de: "Treffen", es: "Reuniones",
    fr: "Rendez-vous", pl: "Spotkania", ptBR: "Reuniões", zh: "会议",
  },
  scheduleMeeting: {
    uk: "Запланувати зустріч", en: "Schedule meeting", ru: "Запланировать встречу", de: "Treffen planen",
    es: "Programar reunión", fr: "Planifier une réunion", pl: "Zaplanuj spotkanie", ptBR: "Agendar reunião", zh: "安排会议",
  },
  quickInvites: {
    uk: "Швидкі запрошення", en: "Quick Invites", ru: "Быстрые приглашения", de: "Schnelleinladungen",
    es: "Invitaciones rápidas", fr: "Invitations rapides", pl: "Szybkie zaproszenia", ptBR: "Convites rápidos", zh: "快速邀请",
  },
  meetOnline: {
    uk: "Може, зустрінемось онлайн?", en: "How about an online meeting?", ru: "Может, встретимся онлайн?",
    de: "Wie wäre es mit einem Online-Meeting?", es: "¿Qué tal una reunión en línea?", fr: "Et si on se voyait en ligne ?",
    pl: "Może spotkajmy się online?", ptBR: "Que tal uma reunião online?", zh: "线上见个面怎么样?",
  },
  meetInPerson: {
    uk: "Може, зустрінемось наживо?", en: "How about meeting up in person?", ru: "Может, встретимся лично?",
    de: "Wie wäre es, sich persönlich zu treffen?", es: "¿Qué tal si nos vemos en persona?", fr: "Et si on se rencontrait en personne ?",
    pl: "Może spotkajmy się osobiście?", ptBR: "Que tal nos encontrarmos pessoalmente?", zh: "线下见面怎么样?",
  },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

// 2026-09-04 (Aleksandr, screenshot of an already-SENT "Може,
// зустрінемось онлайн?" bubble: "В бабле сообщения должна быть
// анімація з котом. Текст + анімація") -- the cat mascot above was only
// ever shown on the QUICK INVITE BUTTON itself, inside this menu; the
// instant it's tapped, send(overrideText) fires off the plain text
// alone and the animation never reaches the actual message bubble. This
// is the other half: a message bubble whose text matches one of these
// two canned invites EXACTLY (any locale -- the sender and viewer don't
// have to share one, and there's no marker/metadata riding along with
// this plain text to read a locale off of) renders with the same cat
// animation next to it, in both app/chats/[chatId]/page.tsx and
// components/mini-chat-window.tsx's own duplicate message list.
const QUICK_INVITE_ANIMATIONS: { strings: Record<Locale, string>; src: string }[] = [
  { strings: STRINGS.meetOnline, src: "/animations/cat-hi.json" },
  { strings: STRINGS.meetInPerson, src: "/animations/cat-coffee.json" },
];

export function quickInviteCatAnimation(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const { strings, src } of QUICK_INVITE_ANIMATIONS) {
    if (Object.values(strings).includes(trimmed)) return src;
  }
  return null;
}

export function MeetingsMenuModal({
  lang,
  onBack,
  onSendQuickInvite,
  onOpenSchedule,
}: {
  lang: Locale;
  // 2026-09-04 (Aleksandr: "Эту модалку делай тоже внутри модалки из
  // скрепки, не надо весь экран перекрывать" + "Стрелка назад должна
  // возвращать сразу в модалку") -- this used to be its own `fixed
  // inset-0` full-screen overlay (own onClose prop, backdrop click to
  // dismiss). Now a plain content block meant to be dropped straight
  // into app/chats/[chatId]/page.tsx's own attach-popover panel (same
  // spot/sizing DailyUploadsModal's `variant="inline"` already uses),
  // so there's no backdrop or width of its own left to own -- `onBack`
  // replaces `onClose`: it steps back to that popover's normal Photo/
  // File/Meetings/Calculation/Contact row list, not out of the popover
  // entirely (closing the whole popover is still just clicking outside
  // it, same as any other attach-menu state).
  onBack: () => void;
  // Sends whatever this locale's own button label reads -- tapping a
  // Ukrainian-localized button should send the Ukrainian text, same as
  // if he'd typed it himself; not silently translated to English under
  // the hood.
  onSendQuickInvite: (text: string) => void;
  // 2026-09-04 (Aleksandr, mini-chat-window's own "Зустрічі" row: "шо то
  // не работает кнопка") -- was a dead placeholder there (no Meetings
  // feature wired at all in that file yet). Wiring up the FULL
  // structured Schedule flow there too would also need that file's own
  // MeetingMessageCard rendering/Accept plumbing, none of which exists
  // in that smaller widget -- out of scope for this fix. Quick Invites
  // alone (this component's other half) has no such dependency, so
  // `onOpenSchedule` is now optional: omitting it hides the "Schedule
  // meeting" row entirely rather than wiring it to a button that would
  // silently do nothing (or worse, send a proposal that widget can't
  // ever render back). app/chats/[chatId]/page.tsx keeps passing it,
  // full flow unchanged there.
  onOpenSchedule?: () => void;
}) {
  return (
    // 2026-09-04, follow-up (Aleksandr, 2 screenshots of this same
    // panel: "Делай фикс падинги") -- was relying entirely on the
    // parent popover box's own p-4 (app/chats/[chatId]/page.tsx),
    // which reads cramped now that everything else in this popover
    // got bigger (the +50% mobile font bump on the row list one
    // level up). A bit more breathing room here: bigger gap between
    // rows, and each row's own internal padding bumped too (below).
    <div className="flex flex-col gap-2 p-1">
      <div className="mb-1 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#335ef7] transition hover:bg-neutral-50 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#0c8ce9] dark:hover:bg-[#1c1c1e]"
        >
          <ChatBackArrow className="h-2.5 w-[6px] animate-back-arrow" />
        </button>
        <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">
          <T
            uk={t("title", "uk")} en={t("title", "en")} ru={t("title", "ru")} de={t("title", "de")} es={t("title", "es")}
            fr={t("title", "fr")} pl={t("title", "pl")} ptBR={t("title", "ptBR")} zh={t("title", "zh")}
          />
        </h2>
      </div>

        {onOpenSchedule && (
          <button
            type="button"
            onClick={onOpenSchedule}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5fa2] to-[#2bd6c7] text-white">
              <ChatMeetingAttachIcon className="h-5 w-5" />
            </span>
            <T
              uk={t("scheduleMeeting", "uk")} en={t("scheduleMeeting", "en")} ru={t("scheduleMeeting", "ru")} de={t("scheduleMeeting", "de")}
              es={t("scheduleMeeting", "es")} fr={t("scheduleMeeting", "fr")} pl={t("scheduleMeeting", "pl")} ptBR={t("scheduleMeeting", "ptBR")}
              zh={t("scheduleMeeting", "zh")}
            />
          </button>
        )}

        <div className="mb-1 mt-2 px-3 text-[12px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          <T
            uk={t("quickInvites", "uk")} en={t("quickInvites", "en")} ru={t("quickInvites", "ru")} de={t("quickInvites", "de")}
            es={t("quickInvites", "es")} fr={t("quickInvites", "fr")} pl={t("quickInvites", "pl")} ptBR={t("quickInvites", "ptBR")}
            zh={t("quickInvites", "zh")}
          />
        </div>

        <button
          type="button"
          onClick={() => onSendQuickInvite(t("meetOnline", lang))}
          className="flex w-full items-center justify-between gap-2 rounded-full bg-black/5 px-5 py-3 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <span>
            <T
              uk={t("meetOnline", "uk")} en={t("meetOnline", "en")} ru={t("meetOnline", "ru")} de={t("meetOnline", "de")}
              es={t("meetOnline", "es")} fr={t("meetOnline", "fr")} pl={t("meetOnline", "pl")} ptBR={t("meetOnline", "ptBR")}
              zh={t("meetOnline", "zh")}
            />
          </span>
          <LottiePlayer src="/animations/cat-hi.json" size={40} />
        </button>

        <button
          type="button"
          onClick={() => onSendQuickInvite(t("meetInPerson", lang))}
          className="flex w-full items-center justify-between gap-2 rounded-full bg-black/5 px-5 py-3 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <span>
            <T
              uk={t("meetInPerson", "uk")} en={t("meetInPerson", "en")} ru={t("meetInPerson", "ru")} de={t("meetInPerson", "de")}
              es={t("meetInPerson", "es")} fr={t("meetInPerson", "fr")} pl={t("meetInPerson", "pl")} ptBR={t("meetInPerson", "ptBR")}
              zh={t("meetInPerson", "zh")}
            />
          </span>
          <LottiePlayer src="/animations/cat-coffee.json" size={40} />
        </button>
    </div>
  );
}

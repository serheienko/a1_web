"use client";
// components/chat/rich-blocks.tsx
//
// 2026-09-24 (Александр: форматирование в чатах как в Telegram — код с
// языком и подсветкой, цитаты, спойлеры, ссылки на словах; «сразу с
// правильным UI»). Куски разметки, которым нужно состояние или клики:
// блок кода (кнопка «Скопировать»), спойлер (открывается по клику),
// ссылка, спрятанная за словами (сначала спрашиваем «Открыть ссылку?»).
// Цвета — те же, что в приложении, отдельно для своего (синего)
// пузыря и для чужого в светлой и тёмной теме.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { highlightCode, languageDisplayName } from "@/lib/chat-code";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { Locale } from "@/components/t";

export type RichTone = "mine" | "theirs";

const T = {
  code: { uk: "Код", en: "Code", ru: "Код", de: "Code", fr: "Code", es: "Código", pl: "Kod", ptBR: "Código", zh: "代码" },
  copy: { uk: "Копіювати код", en: "Copy code", ru: "Скопировать код", de: "Code kopieren", fr: "Copier le code", es: "Copiar código", pl: "Kopiuj kod", ptBR: "Copiar código", zh: "复制代码" },
  copied: { uk: "Скопійовано", en: "Copied", ru: "Скопировано", de: "Kopiert", fr: "Copié", es: "Copiado", pl: "Skopiowano", ptBR: "Copiado", zh: "已复制" },
  openLink: { uk: "Відкрити посилання?", en: "Open link?", ru: "Открыть ссылку?", de: "Link öffnen?", fr: "Ouvrir le lien ?", es: "¿Abrir enlace?", pl: "Otworzyć link?", ptBR: "Abrir link?", zh: "打开链接？" },
  open: { uk: "Відкрити", en: "Open", ru: "Открыть", de: "Öffnen", fr: "Ouvrir", es: "Abrir", pl: "Otwórz", ptBR: "Abrir", zh: "打开" },
  cancel: { uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", fr: "Annuler", es: "Cancelar", pl: "Anuluj", ptBR: "Cancelar", zh: "取消" },
  spoiler: { uk: "Спойлер — натисніть, щоб показати", en: "Spoiler — click to reveal", ru: "Спойлер — нажмите, чтобы показать", de: "Spoiler — zum Anzeigen klicken", fr: "Spoiler — cliquez pour afficher", es: "Spoiler — haz clic para ver", pl: "Spoiler — kliknij, aby pokazać", ptBR: "Spoiler — clique para ver", zh: "剧透 — 点击查看" },
} satisfies Record<string, Record<Locale, string>>;

/**
 * Цвета одним набором CSS-переменных на обёртке сообщения: акцент, фон
 * блоков, цвета подсветки. Свой пузырь синий в обеих темах (белый
 * текст), чужой — белый / #1a1a1a.
 */
export function richToneClass(tone: RichTone): string {
  return tone === "mine"
    ? "chat-rich [--rich-link:#cfe3ff] dark:[--rich-link:#fff] [--rich-accent:#fff] [--rich-block:rgb(0_0_0/0.16)] [--rich-dot:#fff] [--hl-kw:#ffe27a] [--hl-type:#b9f6ff] [--hl-str:#c6ffcf] [--hl-num:#ffc7e4] [--hl-com:rgb(255_255_255/0.7)] [--hl-fn:#fff] [--hl-attr:#ffd9b0] [--hl-meta:#ffe27a]"
    : "chat-rich [--rich-link:#335ef7] dark:[--rich-link:#4db1ff] [--rich-accent:#335ef7] [--rich-block:rgb(51_94_247/0.07)] [--rich-dot:#262a34] [--hl-kw:#b0198e] [--hl-type:#0b7285] [--hl-str:#1b7f37] [--hl-num:#1f4fc4] [--hl-com:#7a8490] [--hl-fn:#6f42c1] [--hl-attr:#9a4b00] [--hl-meta:#9a6700] dark:[--rich-accent:#4db1ff] dark:[--rich-block:rgb(77_177_255/0.12)] dark:[--rich-dot:#fff] dark:[--hl-kw:#fc5fa3] dark:[--hl-type:#5dd8ff] dark:[--hl-str:#fc8e75] dark:[--hl-num:#d9c97c] dark:[--hl-com:#7f8c98] dark:[--hl-fn:#67d3b8] dark:[--hl-attr:#b281eb] dark:[--hl-meta:#fd8f3f]";
}

/**
 * Ссылки как в Telegram (Александр, 24.09): в светлой теме — только
 * другим цветом, без подчёркивания; в тёмной — с подчёркиванием.
 */
export const LINK_CLASS =
  "text-[var(--rich-link)] no-underline underline-offset-2 hover:underline dark:underline";

function AccentBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`my-1 block overflow-hidden rounded-lg border-l-[3px] border-[var(--rich-accent)] bg-[var(--rich-block)] ${className}`}
    >
      {children}
    </span>
  );
}

const MONO = "font-mono [font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation_Mono',monospace]";

export function CodeBlock({ code, language }: { code: string; language: string | null }) {
  const lang = useActiveLocale();
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/\n+$/, "");
  const html = highlightCode(trimmed, language);
  const label = languageDisplayName(language) ?? T.code[lang];

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <AccentBox className="whitespace-normal">
      <span className="flex items-center gap-2 pl-2.5 pr-1 pt-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--rich-accent)]">{label}</span>
        <button
          type="button"
          title={T.copy[lang]}
          aria-label={T.copy[lang]}
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard?.writeText(trimmed).then(() => setCopied(true)).catch(() => {});
          }}
          className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-[var(--rich-accent)] transition hover:bg-[var(--rich-block)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rich-accent)]"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {T.copied[lang]}
            </>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="5" width="8.5" height="8.5" rx="2" /><path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10h.2" /></svg>
          )}
        </button>
      </span>
      {html ? (
        <code
          className={`chat-code block whitespace-pre-wrap break-words px-2.5 pb-2 pt-1 text-[13.5px] leading-[1.4] ${MONO}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <code className={`block whitespace-pre-wrap break-words px-2.5 pb-2 pt-1 text-[13.5px] leading-[1.4] ${MONO}`}>
          {trimmed}
        </code>
      )}
    </AccentBox>
  );
}

export function InlineCode({ text }: { text: string }) {
  return <code className={`text-[0.9em] text-[var(--rich-accent)] ${MONO}`}>{text}</code>;
}

export function Quote({ children }: { children: ReactNode }) {
  return (
    <AccentBox className="relative py-1 pl-2.5 pr-7">
      {children}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute right-1.5 top-1.5 h-4 w-4 fill-[var(--rich-accent)]">
        <path d="M9.6 6.5c-2.7 1.2-4.4 3.6-4.4 6.6V17a1 1 0 0 0 1 1h3.6a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-1-1H7.5c.1-1.7 1.1-3.1 2.7-3.9a1 1 0 0 0-.6-1.9Zm8.4 0c-2.7 1.2-4.4 3.6-4.4 6.6V17a1 1 0 0 0 1 1h3.6a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-1-1h-2.3c.1-1.7 1.1-3.1 2.7-3.9a1 1 0 0 0-.6-1.9Z" />
      </svg>
    </AccentBox>
  );
}

export function Spoiler({ children }: { children: ReactNode }) {
  const lang = useActiveLocale();
  const [open, setOpen] = useState(false);
  return (
    <span
      role={open ? undefined : "button"}
      tabIndex={open ? undefined : 0}
      title={open ? undefined : T.spoiler[lang]}
      onClick={(e) => {
        if (open) return;
        e.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (!open && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={open ? "chat-spoiler-open" : "chat-spoiler"}
    >
      {children}
    </span>
  );
}

/**
 * Ссылка, спрятанная за словами: слова могут говорить одно, а адрес вести
 * на другой сайт — поэтому, как Telegram, сначала показываем сам адрес.
 * Если слова и есть адрес, открываем сразу.
 */
export function HiddenLink({ href, children, label }: { href: string; label: string; children: ReactNode }) {
  const lang = useActiveLocale();
  const [asking, setAsking] = useState(false);
  const same = normalize(label) === normalize(href);

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={LINK_CLASS}
        onClick={(e) => {
          e.stopPropagation();
          if (same) return;
          e.preventDefault();
          setAsking(true);
        }}
      >
        {children}
      </a>
      {asking &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-chat-action-menu=""
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 p-4"
            onClick={() => setAsking(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={T.openLink[lang]}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white/95 text-center text-ink shadow-xl backdrop-blur dark:bg-neutral-800/95 dark:text-neutral-100"
            >
              <div className="px-4 pb-3 pt-4">
                <p className="text-[17px] font-semibold">{T.openLink[lang]}</p>
                <p className="mt-1 break-all text-[13px] text-neutral-600 dark:text-neutral-300">{href}</p>
              </div>
              <div className="grid grid-cols-2 border-t border-black/10 text-[17px] dark:border-white/10">
                <button type="button" className="py-2.5 text-[#335ef7] dark:text-[#4db1ff]" onClick={() => setAsking(false)}>
                  {T.cancel[lang]}
                </button>
                <button
                  type="button"
                  autoFocus
                  className="border-l border-black/10 py-2.5 font-semibold text-[#335ef7] dark:border-white/10 dark:text-[#4db1ff]"
                  onClick={() => {
                    setAsking(false);
                    window.open(href, "_blank", "noopener,noreferrer");
                  }}
                >
                  {T.open[lang]}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function normalize(u: string): string {
  return u.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
}

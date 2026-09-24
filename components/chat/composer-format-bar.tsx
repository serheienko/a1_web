"use client";
// components/chat/composer-format-bar.tsx
//
// 2026-09-24 (Александр: «на сайте тоже, чтобы можно было отформатировать
// текст красиво, сделать кодом и так далее... через выделение текста»).
//
// Как в Telegram Web: выделяешь текст в поле ввода — над полем
// появляется стеклянная панель «Жирный · Код · Блок кода · Ссылка ·
// Цитата · Спойлер». Кнопка оборачивает выделение разметкой чатов
// (**…**, `…`, ```…```, [..](url), > …, ||…||); повторное нажатие
// снимает её. Разметку разбирает сервер при отправке, поэтому в поле
// видны сами символы — как в Slack/GitHub, а в пузыре уже результат.
// Горячие клавиши: ⌘/Ctrl+B — жирный, ⌘/Ctrl+E — код, ⌘/Ctrl+K — ссылка.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { Locale } from "@/components/t";

type Kind = "bold" | "mono" | "code" | "link" | "quote" | "spoiler";

const L = {
  bold: { uk: "Жирний", en: "Bold", ru: "Жирный", de: "Fett", fr: "Gras", es: "Negrita", pl: "Pogrubienie", ptBR: "Negrito", zh: "粗体" },
  mono: { uk: "Код у рядку", en: "Inline code", ru: "Код в строке", de: "Inline-Code", fr: "Code en ligne", es: "Código en línea", pl: "Kod w linii", ptBR: "Código em linha", zh: "行内代码" },
  code: { uk: "Блок коду", en: "Code block", ru: "Блок кода", de: "Codeblock", fr: "Bloc de code", es: "Bloque de código", pl: "Blok kodu", ptBR: "Bloco de código", zh: "代码块" },
  link: { uk: "Посилання", en: "Link", ru: "Ссылка", de: "Link", fr: "Lien", es: "Enlace", pl: "Link", ptBR: "Link", zh: "链接" },
  quote: { uk: "Цитата", en: "Quote", ru: "Цитата", de: "Zitat", fr: "Citation", es: "Cita", pl: "Cytat", ptBR: "Citação", zh: "引用" },
  spoiler: { uk: "Спойлер", en: "Spoiler", ru: "Спойлер", de: "Spoiler", fr: "Spoiler", es: "Spoiler", pl: "Spoiler", ptBR: "Spoiler", zh: "剧透" },
  url: { uk: "Вставте посилання", en: "Paste a link", ru: "Вставьте ссылку", de: "Link einfügen", fr: "Collez un lien", es: "Pega un enlace", pl: "Wklej link", ptBR: "Cole um link", zh: "粘贴链接" },
} satisfies Record<string, Record<Locale, string>>;

const SHORTCUT: Partial<Record<Kind, string>> = { bold: "B", mono: "E", link: "K" };

const WRAP: Partial<Record<Kind, [string, string]>> = {
  bold: ["**", "**"],
  mono: ["`", "`"],
  spoiler: ["||", "||"],
};

type Edit = { value: string; start: number; end: number };

/** Применяет формат к выделению [s, e) в тексте v. */
function applyFormat(v: string, s: number, e: number, kind: Kind, url?: string): Edit {
  const sel = v.slice(s, e);
  const wrap = WRAP[kind];
  if (wrap) {
    const [a, b] = wrap;
    // Уже обёрнуто снаружи — снимаем.
    if (v.slice(s - a.length, s) === a && v.slice(e, e + b.length) === b) {
      return { value: v.slice(0, s - a.length) + sel + v.slice(e + b.length), start: s - a.length, end: e - a.length };
    }
    // Обёрнуто внутри выделения — тоже снимаем.
    if (sel.startsWith(a) && sel.endsWith(b) && sel.length >= a.length + b.length) {
      const inner = sel.slice(a.length, sel.length - b.length);
      return { value: v.slice(0, s) + inner + v.slice(e), start: s, end: s + inner.length };
    }
    return { value: v.slice(0, s) + a + sel + b + v.slice(e), start: s + a.length, end: e + a.length };
  }
  if (kind === "link") {
    const md = `[${sel.replace(/[[\]]/g, "")}](${url})`;
    return { value: v.slice(0, s) + md + v.slice(e), start: s, end: s + md.length };
  }
  // Блоки — целыми строками.
  let ls = s;
  while (ls > 0 && v[ls - 1] !== "\n") ls--;
  let le = e;
  while (le < v.length && v[le] !== "\n") le++;
  const lines = v.slice(ls, le);
  if (kind === "quote") {
    const all = lines.split("\n");
    const quoted = all.every((l) => l.startsWith("> "));
    const next = quoted ? all.map((l) => l.slice(2)).join("\n") : all.map((l) => `> ${l}`).join("\n");
    return { value: v.slice(0, ls) + next + v.slice(le), start: ls, end: ls + next.length };
  }
  // code block
  const fenced = /^```[^\n]*\n[\s\S]*\n```$/.test(lines);
  if (fenced) {
    const body = lines.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "");
    return { value: v.slice(0, ls) + body + v.slice(le), start: ls, end: ls + body.length };
  }
  const block = "```\n" + lines + "\n```";
  return { value: v.slice(0, ls) + block + v.slice(le), start: ls + 4, end: ls + 4 + lines.length };
}

export function ComposerFormatBar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const lang = useActiveLocale();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [linkMode, setLinkMode] = useState<{ s: number; e: number } | null>(null);
  const [url, setUrl] = useState("");
  const valueRef = useRef(value);
  valueRef.current = value;
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  const refresh = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const has = document.activeElement === ta && ta.selectionStart !== ta.selectionEnd;
    setRect(has ? ta.getBoundingClientRect() : null);
  }, [textareaRef]);

  const run = useCallback(
    (kind: Kind, withUrl?: string, range?: { s: number; e: number }) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const s = range?.s ?? ta.selectionStart;
      const e = range?.e ?? ta.selectionEnd;
      if (s === e) return;
      if (kind === "link" && !withUrl) {
        setLinkMode({ s, e });
        setUrl("");
        return;
      }
      const next = applyFormat(valueRef.current, s, e, kind, withUrl);
      onChange(next.value);
      window.requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(next.start, next.end);
        refresh();
      });
    },
    [onChange, refresh, textareaRef],
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onKey = (ev: KeyboardEvent) => {
      if (!(ev.metaKey || ev.ctrlKey) || ev.altKey) return;
      const k = ev.key.toLowerCase();
      const kind = (Object.keys(SHORTCUT) as Kind[]).find((x) => SHORTCUT[x]!.toLowerCase() === k);
      if (!kind || ta.selectionStart === ta.selectionEnd) return;
      ev.preventDefault();
      run(kind);
    };
    const onBlur = () => window.setTimeout(refresh, 120);
    ta.addEventListener("keydown", onKey);
    ta.addEventListener("select", refresh);
    ta.addEventListener("keyup", refresh);
    ta.addEventListener("mouseup", refresh);
    ta.addEventListener("input", refresh);
    ta.addEventListener("blur", onBlur);
    document.addEventListener("selectionchange", refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      ta.removeEventListener("keydown", onKey);
      ta.removeEventListener("select", refresh);
      ta.removeEventListener("keyup", refresh);
      ta.removeEventListener("mouseup", refresh);
      ta.removeEventListener("input", refresh);
      ta.removeEventListener("blur", onBlur);
      document.removeEventListener("selectionchange", refresh);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [refresh, run, textareaRef]);

  const anchor = rect ?? (linkMode ? textareaRef.current?.getBoundingClientRect() ?? null : null);
  if (!anchor || typeof document === "undefined") return null;

  const kinds: Kind[] = ["bold", "mono", "code", "link", "quote", "spoiler"];
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 330));
  const bottom = window.innerHeight - anchor.top + 10;

  return createPortal(
    <div
      className="fixed z-[900] animate-[composer-bar-in_160ms_ease-out]"
      style={{ left, bottom }}
      // Кнопки не должны отбирать фокус у поля — иначе пропадёт выделение.
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
    >
      <div className="flex items-center gap-0.5 rounded-2xl border border-black/5 bg-white/85 p-1 shadow-[0_6px_24px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#2c2c30]/85">
        {linkMode ? (
          <form
            className="flex items-center gap-1 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              const u = url.trim();
              if (!u || /\s/.test(u)) return;
              const full = /^https?:\/\//i.test(u) ? u : `https://${u}`;
              const range = linkMode;
              setLinkMode(null);
              run("link", full, range);
            }}
          >
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setLinkMode(null);
                  textareaRef.current?.focus();
                }
              }}
              placeholder={L.url[lang]}
              aria-label={L.url[lang]}
              className="h-8 w-56 rounded-lg bg-black/5 px-2.5 text-[14px] text-ink outline-none placeholder:text-neutral-400 dark:bg-white/10 dark:text-white"
            />
            <button
              type="submit"
              aria-label="OK"
              className="grid h-8 w-8 place-items-center rounded-lg bg-[#335ef7] text-white dark:bg-[#009bff]"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </form>
        ) : (
          kinds.map((k) => {
            const sc = SHORTCUT[k];
            const title = sc ? `${L[k][lang]} (${isMac ? "⌘" : "Ctrl+"}${sc})` : L[k][lang];
            return (
              <button
                key={k}
                type="button"
                title={title}
                aria-label={L[k][lang]}
                onClick={() => run(k)}
                className="grid h-9 w-9 place-items-center rounded-xl text-[#262a34] transition hover:bg-black/5 active:scale-95 dark:text-white dark:hover:bg-white/10"
              >
                <Icon kind={k} />
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}

function Icon({ kind }: { kind: Kind }) {
  const common = { viewBox: "0 0 20 20", className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "bold":
      return <span className="text-[16px] font-bold leading-none">B</span>;
    case "mono":
      return (
        <svg {...common}><path d="M7 6l-4 4 4 4M13 6l4 4-4 4" /></svg>
      );
    case "code":
      return (
        <svg {...common}><path d="M7.5 4.5c-1.5 0-2 .7-2 2v1.6c0 .9-.5 1.4-1.5 1.4 1 0 1.5.5 1.5 1.4v1.6c0 1.3.5 2 2 2M12.5 4.5c1.5 0 2 .7 2 2v1.6c0 .9.5 1.4 1.5 1.4-1 0-1.5.5-1.5 1.4v1.6c0 1.3-.5 2-2 2" /></svg>
      );
    case "link":
      return (
        <svg {...common}><path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" /></svg>
      );
    case "quote":
      return (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor"><path d="M9.6 6.5c-2.7 1.2-4.4 3.6-4.4 6.6V17a1 1 0 0 0 1 1h3.6a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-1-1H7.5c.1-1.7 1.1-3.1 2.7-3.9a1 1 0 0 0-.6-1.9Zm8.4 0c-2.7 1.2-4.4 3.6-4.4 6.6V17a1 1 0 0 0 1 1h3.6a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-1-1h-2.3c.1-1.7 1.1-3.1 2.7-3.9a1 1 0 0 0-.6-1.9Z" /></svg>
      );
    case "spoiler":
      return (
        <svg {...common}><path d="M3 10s2.7-5 7-5c1.3 0 2.4.4 3.4 1M17 10s-2.7 5-7 5c-1.3 0-2.4-.4-3.4-1M4 16L16 4" /></svg>
      );
  }
}

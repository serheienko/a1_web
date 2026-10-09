// components/alpha-ask.tsx
//
// 09.10.2026 (Александр: «должно срабатывать, когда я нажимаю просто на
// строку поиска… если Alpha ещё про меня ничего не сохранила, она прямо в
// этом поиске, в выпадашке, будет спрашивать вопросы… а не внизу строка, что
// ведёт на страницу покупки — мы же уже в Alpha»). Участник Alpha нажал на
// поле поиска, а Alpha его ещё не знает: под полем открывается панель —
// рассказать о себе текстом или голосом, дальше вопросы Alpha (AlphaFlow) и
// совпадения. Портрет сохраняется на сервере, блок «Для Вас» обновляется.
// ✎ «Розповісти заново» в «Для Вас» открывает эту же панель.
"use client";

import { useEffect, useRef, useState } from "react";
import { AlphaFlow } from "@/components/alpha-flow";
import { refreshAlphaMe } from "@/components/alpha-search";
import { DICT_LANGS, GlobeIcon, initialDictLang, saveDictLang } from "@/lib/dictation-langs";
import type { Locale } from "@/components/t";

export const ALPHA_ASK_EVENT = "a1:alpha-ask";
export const ALPHA_PORTRAIT_EVENT = "a1:alpha-portrait";

/** ✎ in «Для Вас»: open the Alpha questions under the search box. */
export function openAlphaAsk() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.dispatchEvent(new Event(ALPHA_ASK_EVENT));
}

type L = "uk" | "ru" | "en";
const S = {
  title: { uk: "Alpha ще Вас не знає", ru: "Alpha ещё Вас не знает", en: "Alpha doesn't know you yet" },
  retitle: { uk: "Розкажіть Alpha заново", ru: "Расскажите Alpha заново", en: "Tell Alpha again" },
  sub: {
    uk: "Розкажіть, яку роботу шукаєте — ким працюєте, формат, гроші. Alpha спитає решту й підбере збіги.",
    ru: "Расскажите, какую работу ищете — кем работаете, формат, деньги. Alpha спросит остальное и подберёт совпадения.",
    en: "Tell what job you're looking for — your role, format, money. Alpha asks the rest and finds matches.",
  },
  ph: { uk: "Напр.: Senior Flutter, віддалено, від $4k", ru: "Напр.: Senior Flutter, удалённо, от $4k", en: "E.g. Senior Flutter, remote, $4k+" },
  send: { uk: "Надіслати", ru: "Отправить", en: "Send" },
  mic: { uk: "Надиктувати", ru: "Надиктовать", en: "Dictate" },
  stop: { uk: "Зупинити запис", ru: "Остановить запись", en: "Stop recording" },
  cancel: { uk: "Скасувати", ru: "Отменить", en: "Cancel" },
  close: { uk: "Закрити", ru: "Закрыть", en: "Close" },
} satisfies Record<string, Record<L, string>>;

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function AlphaAskPanel({ lang, again = false, onClose }: { lang: Locale; again?: boolean; onClose: () => void }) {
  const l: L = lang === "uk" || lang === "ru" ? lang : "en";
  const [text, setText] = useState("");
  const [story, setStory] = useState<string | null>(null);
  const [dictLang, setDictLang] = useState("en");
  const [langOpen, setLangOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  // 09.10.2026 (Александр: «должна же быть кнопка стоп записи»): во время
  // записи -- красная точка, время, «Скасувати» и квадратик «стоп», как в
  // Magic Wand.
  const [secs, setSecs] = useState(0);
  const beforeRef = useRef("");
  const cancelledRef = useRef(false);
  useEffect(() => {
    if (!listening) return;
    setSecs(0);
    const id = window.setInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [listening]);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setDictLang(initialDictLang(String(lang))), [lang]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // 09.10.2026 (Александр: «обычный поиск тоже должен работать»): клик в
      // само поле поиска панель не закрывает -- его родитель тоже «свой».
      const area = boxRef.current?.parentElement ?? boxRef.current;
      if (area && !area.contains(t) && !(t as HTMLElement).closest?.("[data-alpha-ask-keep]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      recRef.current?.stop();
    };
  }, [onClose]);

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const before = text.trim();
    beforeRef.current = text;
    cancelledRef.current = false;
    const rec = new Ctor();
    rec.lang = DICT_LANGS.find((d) => d.code === dictLang)?.bcp ?? "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev) => {
      if (cancelledRef.current) return;
      let heard = "";
      for (let i = 0; i < ev.results.length; i++) heard += ev.results[i]?.[0]?.transcript ?? "";
      setText(before ? `${before} ${heard}` : heard);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function cancelVoice() {
    cancelledRef.current = true;
    recRef.current?.stop();
    setText(beforeRef.current);
  }

  function send() {
    const s = text.trim();
    if (!s) {
      inputRef.current?.focus();
      return;
    }
    recRef.current?.stop();
    setStory(s);
  }

  return (
    <div
      ref={boxRef}
      data-testid="alpha-ask"
      className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[min(70vh,620px)] min-w-[300px] overflow-y-auto rounded-[24px] border border-[#5a4dff]/25 bg-white p-4 text-left shadow-[0_20px_50px_rgba(40,40,120,0.25)] animate-[askIn_.22s_ease-out] sm:min-w-[440px] dark:bg-[#1c1c24]"
    >
      <style>{`@keyframes askIn{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}`}</style>
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="bg-gradient-to-r from-[#0148fc] to-[#963fff] bg-clip-text text-[17px] font-bold text-transparent dark:from-[#4f86ff] dark:to-[#b08cff]">
            ✦ {again ? S.retitle[l] : S.title[l]}
          </div>
          {!story && <p className="mt-1 text-[13.5px] leading-snug text-[#6b6b78] dark:text-[#a9a9b8]">{S.sub[l]}</p>}
        </div>
        <button
          type="button"
          aria-label={S.close[l]}
          onClick={onClose}
          className="group grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 transition duration-200 hover:scale-110 hover:bg-black/5 hover:text-neutral-800 active:scale-90 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="transition duration-300 group-hover:rotate-90"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      {story ? (
        <AlphaFlow
          initial={story}
          lang={lang}
          onUnlock={() => {}}
          onDone={() => {
            refreshAlphaMe();
            window.dispatchEvent(new Event(ALPHA_PORTRAIT_EVENT));
          }}
        />
      ) : (
        <div className="rounded-[18px] bg-[#f2f2f7] p-2.5 dark:bg-[#2a2a33]">
          <textarea
            ref={inputRef}
            autoFocus={again}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={S.ph[l]}
            className="w-full resize-none bg-transparent px-1.5 text-[16px] leading-snug text-neutral-900 outline-none placeholder:text-[#989aa6] dark:text-white"
          />
          <div className="mt-1 flex items-center justify-end gap-2">
            {listening && (
              <div className="flex min-w-0 flex-1 items-center gap-2 pl-1 animate-[askIn_.22s_ease-out]">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#ff3b30]" />
                <span className="w-10 shrink-0 text-[15px] tabular-nums text-neutral-900 dark:text-white">
                  {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
                </span>
                <button type="button" onClick={cancelVoice} className="min-w-0 flex-1 truncate text-center text-[15px] text-[#335ef7] transition hover:opacity-75 dark:text-[#7d93ff]">
                  {S.cancel[l]}
                </button>
              </div>
            )}
            <div className={`relative transition-all duration-200 ${listening ? "pointer-events-none w-0 scale-75 overflow-hidden opacity-0" : "opacity-100"}`}>
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="group flex h-9 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-[#989aa6] transition duration-200 hover:scale-105 hover:text-[#335ef7] active:scale-95 dark:bg-black dark:hover:text-[#7d93ff]"
              >
                <GlobeIcon className="h-4 w-4 transition duration-500 group-hover:rotate-[200deg]" />
                {dictLang.toUpperCase()}
              </button>
              {langOpen && (
                <div className="absolute bottom-[44px] right-0 z-50 max-h-[260px] w-[220px] overflow-y-auto rounded-[20px] bg-white/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur dark:bg-[#1c1c24]/95 dark:ring-white/10">
                  {DICT_LANGS.map((d) => (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => {
                        setDictLang(d.code);
                        saveDictLang(d.code);
                        setLangOpen(false);
                      }}
                      className="flex min-h-[40px] w-full items-center gap-2.5 rounded-2xl px-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span className="text-[18px] leading-none">{d.flag}</span>
                      <span className={`truncate text-[15px] ${d.code === dictLang ? "font-bold text-[#335ef7] dark:text-[#9fb2ff]" : "font-medium text-neutral-900 dark:text-white"}`}>{d.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label={listening ? S.stop[l] : S.mic[l]}
              onClick={toggleVoice}
              className={`group relative grid h-9 w-9 place-items-center rounded-full transition duration-200 hover:scale-110 active:scale-90 ${listening ? "bg-[#ff3b30] text-white shadow-[0_0_0_6px_rgba(255,59,48,0.18)]" : "bg-white text-[#989aa6] hover:text-[#ff3b30] dark:bg-black"}`}
            >
              <svg viewBox="0 0 24 24" className={`absolute h-[18px] w-[18px] transition duration-200 ${listening ? "rotate-90 scale-50 opacity-0" : "opacity-100"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              <svg viewBox="0 0 24 24" className={`absolute h-[14px] w-[14px] transition duration-200 ${listening ? "opacity-100" : "-rotate-90 scale-50 opacity-0"}`} fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="3" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={S.send[l]}
              onClick={send}
              disabled={!text.trim()}
              className="group grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#0148fc] to-[#963fff] text-white transition duration-200 enabled:hover:scale-110 enabled:hover:shadow-[0_6px_16px_rgba(90,80,255,0.45)] active:scale-90 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] transition duration-200 group-enabled:group-hover:-translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

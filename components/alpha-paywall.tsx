"use client";

// components/alpha-paywall.tsx
//
// A1 Premium -- the "Alpha Search" sales window (Aleksandr, 2026-10-07).
// 07.10.2026 вечер (Александр): «Premium» в окне переименовываем в Alpha --
// подписка называется Alpha, плашка у лого «Members», кнопка «Приєднатися
// до Alpha». Остальные функции (палочка и т.д.) свои названия сохраняют.
// Built from his GPT mockup, brought in line with the site: Commissioner
// (the site's own font), the site's blue -> purple gradient instead of the
// mockup's blue -> cyan, the real spinning-can video (light/dark versions,
// same clip as the app's old premium modal) instead of a static render, and
// the "highlighted applications" row dropped (postponed until there is an
// in-chat ATS -- applications are still too few to matter).
//
// Test environment only for now: payments are not connected, so the CTA
// calls `onActivate` and the parent decides what happens.

import { DICT_LANGS, GlobeIcon, initialDictLang, saveDictLang } from "@/lib/dictation-langs";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { AlphaFlow } from "@/components/alpha-flow";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { Locale } from "@/components/t";
import {
  TIER_PRICES,
  formatUsd,
  guessCountry,
  tierForCountry,
} from "@/lib/premium/pricing";

type Plan = "month" | "quarter" | "year";

type Key =
  | "tagline" | "sub" | "placeholder" | "hint" | "alsoTitle" | "alsoSub"
  | "wandT" | "wandD" | "mediaT" | "mediaD" | "statusT" | "statusD"
  | "emojiT" | "emojiD" | "pricesFor" | "month" | "year" | "perMonth"
  | "yearOnce" | "quarter" | "quarterOnce" | "cta" | "ctaSub" | "footer" | "close" | "soundOn"
  | "soundOff" | "needPremium" | "mic" | "save" | "searchWord" | "signInNeed" | "signIn" | "emptyQuery";

const S: Record<Key, Partial<Record<Locale, string>> & { en: string }> = {
  tagline: { uk: "Alpha шукає за Вас.", en: "Alpha searches for you.", ru: "Alpha ищет за Вас." },
  sub: {
    uk: "Ви відповідаєте на кілька питань — Alpha розуміє, що Вам потрібно, і показує найточніші збіги. Далі сама надсилає нові.",
    en: "Answer a few questions — Alpha learns what you need and shows the closest matches. Then it keeps sending new ones.",
    ru: "Вы отвечаете на пару вопросов — Alpha понимает, что Вам нужно, и показывает самые точные совпадения. Дальше сама присылает новые.",
  },
  placeholder: { uk: "Senior Flutter, remote, Київ", en: "Senior Flutter, remote, Kyiv", ru: "Senior Flutter, remote, Киев" },
  hint: {
    uk: "Почніть з одного речення — далі Alpha спитає сама.",
    en: "Start with one sentence — Alpha will ask the rest.",
    ru: "Начните с одного предложения — дальше Alpha спросит сама.",
  },
  alsoTitle: { uk: "Що ще дає Alpha", en: "What else Alpha gives you", ru: "Что ещё даёт Alpha" },
  alsoSub: {
    uk: "Пошук і все нижче — в одній підписці Alpha.",
    en: "Search and everything below — in one Alpha membership.",
    ru: "Поиск и всё ниже — в одной подписке Alpha.",
  },
  wandT: { uk: "Чарівна паличка", en: "Magic wand", ru: "Волшебная палочка" },
  wandD: {
    uk: "Розкажіть голосом чи текстом — поля заповняться самі.",
    en: "Say it or type it — the fields fill themselves.",
    ru: "Расскажите голосом или текстом — поля заполнятся сами.",
  },
  mediaT: { uk: "Медіа без ліміту", en: "No media limits", ru: "Медиа без лимита" },
  mediaD: { uk: "Фото, відео та файли в чатах.", en: "Photos, videos and files in chats.", ru: "Фото, видео и файлы в чатах." },
  statusT: { uk: "Власний статус", en: "Your own status", ru: "Свой статус" },
  statusD: {
    uk: "Ваш текст у профілі біжить рядком.",
    en: "Your text runs as a ticker on your profile.",
    ru: "Ваш текст в профиле бежит строкой.",
  },
  emojiT: { uk: "Значок Alpha", en: "Alpha badge", ru: "Значок Alpha" },
  emojiD: { uk: "Поруч з Вашим іменем — всі бачать, що Ви в Alpha.", en: "Next to your name — everyone sees you're in Alpha.", ru: "Рядом с Вашим именем — все видят, что Вы в Alpha." },
  pricesFor: { uk: "Ціни для", en: "Prices for", ru: "Цены для" },
  month: { uk: "Місяць", en: "Month", ru: "Месяц" },
  year: { uk: "Рік", en: "Year", ru: "Год" },
  quarter: { uk: "3 місяці", en: "3 months", ru: "3 месяца" },
  quarterOnce: { uk: "за 3 місяці", en: "for 3 months", ru: "за 3 месяца" },
  perMonth: { uk: "/ міс.", en: "/ mo", ru: "/ мес." },
  yearOnce: { uk: "за рік", en: "per year", ru: "за год" },
  save: { uk: "−25%", en: "−25%", ru: "−25%" },
  cta: { uk: "Приєднатися до Alpha", en: "Join Alpha", ru: "Присоединиться к Alpha" },
  ctaSub: { uk: "Пошук і всі можливості Alpha", en: "Search and everything in Alpha", ru: "Поиск и все возможности Alpha" },
  footer: {
    uk: "Alpha порівнює вакансії та профілі за їхнім текстом. Решту варто уточнити в розмові.",
    en: "Alpha matches job posts and profiles by what they say. The rest is best asked in conversation.",
    ru: "Alpha сравнивает вакансии и профили по их тексту. Остальное стоит уточнить в разговоре.",
  },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть" },
  soundOn: { uk: "Увімкнути звук", en: "Sound on", ru: "Включить звук" },
  soundOff: { uk: "Вимкнути звук", en: "Sound off", ru: "Выключить звук" },
  // 07.10.2026 (Александр): стрелка при пустом поле -- подсказать, что
  // написать, а не отправлять к тарифам.
  emptyQuery: {
    uk: "Спершу напишіть, що шукаєте.",
    en: "First, type what you're looking for.",
    ru: "Сначала напишите, что ищете.",
    de: "Schreiben Sie zuerst, was Sie suchen.",
    es: "Primero escriba qué busca.",
    fr: "Écrivez d'abord ce que vous cherchez.",
    pl: "Najpierw wpisz, czego szukasz.",
    ptBR: "Primeiro, escreva o que você procura.",
    zh: "请先输入您要找的内容。",
  },
  needPremium: {
    uk: "Пошук доступний в Alpha — оберіть тариф нижче.",
    en: "Search is part of Alpha — pick a plan below.",
    ru: "Поиск доступен в Alpha — выберите тариф ниже.",
  },
  searchWord: { uk: "пошук", en: "Search", ru: "поиск" },
  signInNeed: { uk: "Увійдіть, щоб Alpha запам'ятала Вас.", en: "Sign in so Alpha can remember you.", ru: "Войдите, чтобы Alpha запомнила Вас." },
  signIn: { uk: "Увійти", en: "Sign in", ru: "Войти" },
  mic: { uk: "Сказати голосом", en: "Speak", ru: "Сказать голосом" },
};

function t(key: Key, lang: Locale): string {
  return S[key][lang] ?? S[key].en;
}

const SOUND_KEY = "a1.premium.sound";

// One shared <audio> for the whole page. Safari only lets sound start
// INSIDE a click handler (not in an effect a moment later), so whatever
// opens this window should call startAlphaMusic() in its own onClick, and
// the sound toggle below plays/pauses synchronously too.
let music: HTMLAudioElement | null = null;
function getMusic(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!music) {
    music = new Audio("/premium/eternal.mp3");
    music.loop = true;
    music.volume = 0.35;
    music.preload = "auto";
  }
  return music;
}
function soundMuted(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "off";
  } catch {
    return false;
  }
}
export function startAlphaMusic() {
  if (soundMuted()) return;
  getMusic()?.play().catch(() => {});
}
// Seamless loop for the "flowing" buttons: blue -> violet -> purple -> back.
const FLOW = "linear-gradient(100deg,#0148fc 0%,#5a4dff 25%,#963fff 50%,#5a4dff 75%,#0148fc 100%)";
// 07.10.2026 (Александр: «синий в тёмной темноватый — как основа сайта»):
// в тёмной теме градиент начинается с акцента сайта #0c8ce9, как кнопка «+».
const FLOW_DARK = "linear-gradient(100deg,#0c8ce9 0%,#4f86ff 25%,#9a5cff 50%,#4f86ff 75%,#0c8ce9 100%)";

export function AlphaPaywall({
  open,
  onClose,
  onActivate,
  initialQuery,
}: {
  open: boolean;
  onClose: () => void;
  onActivate?: (plan: Plan) => void;
  /** 09.10.2026: opened from the search box by an Alpha member -- go
   *  straight to the Alpha conversation for this query. */
  initialQuery?: string | null;
}) {
  const lang = useActiveLocale();
  const [plan, setPlan] = useState<Plan>("quarter");
  const [query, setQuery] = useState("");
  const [nudge, setNudge] = useState(false);
  const [emptyTry, setEmptyTry] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [flowQuery, setFlowQuery] = useState<string | null>(null);
  useEffect(() => {
    if (open && initialQuery && initialQuery.trim()) setFlowQuery(initialQuery.trim());
  }, [open, initialQuery]);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [sound, setSound] = useState(true);
  const [listening, setListening] = useState(false);
  // 07.10.2026 (Александр: «показывать выбор языка рядом, как в Magic Wand»):
  // браузер сам язык речи не определяет -- выбираем его у микрофона.
  const [dictLang, setDictLang] = useState<string>("en");
  const [langOpen, setLangOpen] = useState(false);
  useEffect(() => setDictLang(initialDictLang(String(lang))), [lang]);
  const [country, setCountry] = useState<string | null>(null);
  const pricingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCountry(guessCountry());
    try {
      if (localStorage.getItem(SOUND_KEY) === "off") setSound(false);
    } catch {}
  }, []);

  const price = TIER_PRICES[tierForCountry(country)];
  const countryName = useMemo(() => {
    if (!country) return null;
    try {
      return new Intl.DisplayNames([lang === "ptBR" ? "pt-BR" : lang], { type: "region" }).of(country) ?? null;
    } catch {
      return null;
    }
  }, [country, lang]);

  // 07.10.2026 (Александр: «окно появлялось плавно, а не резко»): окно
  // остаётся в DOM ещё 300 мс после закрытия, чтобы успеть погаснуть, а при
  // открытии сначала рисуется прозрачным и на следующем кадре проявляется.
  const [rendered, setRendered] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setRendered(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setShown(false);
    const t = window.setTimeout(() => setRendered(false), 300);
    return () => window.clearTimeout(t);
  }, [open]);

  // Esc closes, page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Music: the app's premium track. Started by the opener's click
  // (startAlphaMusic); this effect is only the fallback for browsers that
  // allow it a moment later, and stops/rewinds the track on close.
  useEffect(() => {
    const a = getMusic();
    if (!a) return;
    if (open) {
      if (!soundMuted() && a.paused) a.play().catch(() => {});
    } else {
      a.pause();
      a.currentTime = 0;
    }
  }, [open]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {}
    const a = getMusic();
    if (!a) return;
    if (next) a.play().catch(() => {});
    else a.pause();
  };

  const toPricing = () => {
    setNudge(true);
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setNudge(false);
      setEmptyTry(true);
      inputRef.current?.focus();
      return;
    }
    try {
      const res = await fetch("/api/account/whoami");
      if (!res.ok) return setAuthNeeded(true);
    } catch {
      return setAuthNeeded(true);
    }
    setAuthNeeded(false);
    setFlowQuery(q);
  };

  const startVoice = () => {
    type SR = {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = DICT_LANGS.find((l) => l.code === dictLang)?.bcp ?? "en-US";
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i]?.[0]?.transcript ?? "";
      setQuery(text);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  if (!rendered) return null;

  return (
    <div
      className={
        "fixed inset-0 z-[200] flex items-end justify-center bg-black/45 backdrop-blur-[6px] transition-opacity duration-300 ease-out sm:items-center sm:p-3 " +
        (shown ? "opacity-100" : "opacity-0")
      }
      {...backdropDismiss(onClose)}
    >
      <style>{`
        @keyframes alphaFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        .alpha-flow { background-image: ${FLOW}; background-size: 200% 100%; animation: alphaFlow 4s linear infinite; }
        .dark .alpha-flow { background-image: ${FLOW_DARK}; }
        @media (prefers-reduced-motion: reduce) { .alpha-flow { animation: none; } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alpha Search"
        className={
          "relative max-h-[100dvh] w-full overflow-y-auto text-left transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none " +
          (shown ? "translate-y-0 opacity-100 sm:scale-100 " : "translate-y-8 opacity-0 sm:translate-y-3 sm:scale-[0.97] ") +
          "rounded-t-[28px] bg-white text-[#0b0b14] shadow-[0_30px_80px_rgba(20,30,80,0.35)] sm:max-h-[calc(100dvh-24px)] sm:max-w-[980px] sm:rounded-[32px] dark:bg-[#232330] dark:text-white"
        }
      >
        {/* top-right controls */}
        <div className="absolute right-3 top-3 z-30 flex gap-1 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={sound ? t("soundOff", lang) : t("soundOn", lang)}
            className="group grid h-10 w-10 place-items-center rounded-full text-[#8e8e93] transition duration-200 hover:scale-110 hover:bg-black/5 hover:text-[#335ef7] active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <span className="transition-transform duration-300 group-hover:-rotate-12">{sound ? <SpeakerIcon /> : <SpeakerOffIcon />}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", lang)}
            className="group grid h-10 w-10 place-items-center rounded-full text-[#8e8e93] transition duration-200 hover:scale-110 hover:bg-black/5 hover:text-[#3a3a3c] active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <svg className="transition-transform duration-300 group-hover:rotate-90" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* HERO */}
        <div className="relative flex flex-col gap-2 px-5 pt-5 sm:block sm:px-10 sm:pt-7">
          <div className="relative z-10 order-2 sm:order-1">
            <AlphaLogo word={t("searchWord", lang)} />
            {flowQuery ? (
              <div className="mt-4">
                <AlphaFlow initial={flowQuery} lang={lang} onUnlock={toPricing} />
              </div>
            ) : (
            <>
            <p className="mt-3 text-[15px] leading-snug text-[#5b5b68] sm:mt-4 sm:max-w-[520px] sm:text-[18px] dark:text-[#a9a9b8]">
              {t("sub", lang)}
            </p>

            <form onSubmit={onSubmit} className="mt-4 sm:mt-5 sm:max-w-[480px]">
              <div
                className="alpha-flow flex items-center gap-2 rounded-full p-[2px]"
              >
                <div className="flex h-[58px] min-w-0 flex-1 items-center gap-1 rounded-full bg-white pl-4 pr-[5px] sm:gap-2 sm:pl-5 dark:bg-[#1a1a24]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 text-[#335ef7] dark:text-[#0c8ce9]"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setNudge(false);
                      setEmptyTry(false);
                    }}
                    placeholder={t("placeholder", lang)}
                    className="min-w-0 flex-1 bg-transparent text-[#0b0b14] outline-none placeholder:text-[#8e8e93] dark:text-white"
                  />
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setLangOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={langOpen}
                      className="flex h-8 items-center gap-1 rounded-full px-1.5 text-[13px] font-semibold sm:px-2 text-[#6b6b78] transition hover:bg-black/5 dark:text-[#a9a9b8] dark:hover:bg-white/10"
                    >
                      <GlobeIcon className="hidden h-4 w-4 sm:block" />
                      {dictLang.toUpperCase()}
                    </button>
                    {langOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                        <div role="listbox" className="absolute right-0 top-[40px] z-50 max-h-[320px] w-[220px] overflow-y-auto rounded-[20px] bg-white/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur dark:bg-[#1c1c24]/95 dark:ring-white/10">
                          {DICT_LANGS.map((l) => (
                            <button
                              key={l.code}
                              type="button"
                              role="option"
                              aria-selected={l.code === dictLang}
                              onClick={() => {
                                setDictLang(l.code);
                                saveDictLang(l.code);
                                setLangOpen(false);
                              }}
                              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-2xl px-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                            >
                              <span className="text-[18px] leading-none">{l.flag}</span>
                              <span className={`truncate text-[15px] ${l.code === dictLang ? "font-bold text-[#335ef7] dark:text-[#9fb2ff]" : "font-medium text-[#0b0b14] dark:text-white"}`}>{l.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={startVoice}
                    aria-label={t("mic", lang)}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${listening ? "animate-pulse bg-[#335ef7]/15 text-[#335ef7]" : "text-[#6b6b78] hover:bg-black/5 dark:text-[#a9a9b8] dark:hover:bg-white/10"}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
                  </button>
                  <button
                    type="submit"
                    aria-label="Alpha Search"
                    className="alpha-flow grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-[0_6px_16px_rgba(53,117,255,0.4)] transition duration-200 hover:scale-105 hover:shadow-[0_8px_22px_rgba(110,77,255,0.55)] active:scale-95"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </div>
              <p className={`mt-2.5 pl-1 text-[13px] sm:text-sm ${nudge || emptyTry ? "font-semibold text-[#6a4dff] dark:text-[#b7a6ff]" : "text-[#8e8e93]"}`}>
                {emptyTry ? t("emptyQuery", lang) : nudge ? t("needPremium", lang) : t("hint", lang)}
              </p>
              {authNeeded && (
                <p className="mt-1 pl-1 text-[14px] font-semibold text-[#3a3a3c] dark:text-white">
                  {t("signInNeed", lang)}{" "}
                  <a href={`/sign-in?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`} className="text-[#335ef7] underline dark:text-[#9fb2ff]">
                    {t("signIn", lang)}
                  </a>
                </p>
              )}
            </form>
            </>
            )}
          </div>

          <div className={`${flowQuery ? "hidden" : "flex"} order-1 items-center justify-center sm:pointer-events-none sm:absolute sm:right-8 md:right-[88px] sm:top-1/2 sm:z-0 sm:order-2 sm:-translate-y-1/2 sm:mt-[70px]`}>
            <div className="relative h-[150px] w-[150px] sm:h-[272px] sm:w-[272px]">
              <CanVideo />
            </div>
          </div>
        </div>

        {/* ALSO IN PREMIUM */}
        <div className={`mx-5 mt-5 sm:mx-10 sm:mt-4 ${flowQuery ? "hidden" : ""}`}>
          <h3 className="text-[21px] font-bold tracking-[-0.02em] sm:text-[24px]">{t("alsoTitle", lang)}</h3>
          <p className="mt-1 text-[14px] text-[#6b6b78] sm:text-[15px] dark:text-[#a9a9b8]">{t("alsoSub", lang)}</p>
          <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Feature icon={<WandIcon />} title={t("wandT", lang)} desc={t("wandD", lang)} />
            <Feature icon={<MediaIcon />} title={t("mediaT", lang)} desc={t("mediaD", lang)} />
            <Feature icon={<StatusIcon />} title={t("statusT", lang)} desc={t("statusD", lang)} />
            <Feature icon={<CanIcon />} title={t("emojiT", lang)} desc={t("emojiD", lang)} />
          </div>
        </div>

        {/* PRICING */}
        <div ref={pricingRef} className="mx-5 mt-5 border-t border-black/[0.07] pb-5 pt-4 sm:mx-10 sm:mt-4 sm:pb-4 dark:border-white/10">
          {countryName && (
            <div className="mb-2.5 text-[13px] font-medium text-[#8e8e93]">
              {t("pricesFor", lang)}: {countryName}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_1fr_1.35fr] sm:items-stretch sm:gap-3">
            <PlanCard
              active={plan === "month"}
              onClick={() => setPlan("month")}
              title={t("month", lang)}
              price={formatUsd(price.month)}
              per={t("perMonth", lang)}
            />
            <PlanCard
              active={plan === "quarter"}
              onClick={() => setPlan("quarter")}
              title={t("quarter", lang)}
              badge="−17%"
              price={formatUsd(price.quarterPerMonth)}
              per={t("perMonth", lang)}
              note={`${formatUsd(price.quarterTotal)} ${t("quarterOnce", lang)}`}
            />
            <PlanCard
              active={plan === "year"}
              onClick={() => setPlan("year")}
              title={t("year", lang)}
              badge={t("save", lang)}
              price={formatUsd(price.yearPerMonth)}
              per={t("perMonth", lang)}
              note={`${formatUsd(price.yearTotal)} ${t("yearOnce", lang)}`}
            />
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => onActivate?.(plan)}
                className={`alpha-flow flex min-h-[56px] flex-1 items-center justify-center rounded-[18px] px-4 text-[16px] font-bold text-white shadow-[0_10px_24px_rgba(90,80,255,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(110,77,255,0.45)] active:translate-y-0 active:scale-[0.99] sm:text-[17px] ${nudge ? "ring-4 ring-[#6a4dff]/30" : ""}`}
                
              >
                {t("cta", lang)}
              </button>
              <div className="mt-1.5 text-center text-[12px] text-[#8e8e93]">{t("ctaSub", lang)}</div>
            </div>
          </div>
          <p className="mt-3 text-center text-[11.5px] leading-snug text-[#a0a0aa]">{t("footer", lang)}</p>
        </div>
      </div>
    </div>
  );
}

// The spinning can. Fast-opening by design: a tiny first-frame picture
// (~8 KB) shows instantly, then ONE video for the current theme (WebM ~0.85 MB
// where supported, MP4 ~1 MB otherwise) fades in over it once it is actually
// playing -- the window never waits for the video.
function CanVideo() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const dark =
      root.classList.contains("dark") ||
      (!root.classList.contains("light") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(dark ? "dark" : "light");
  }, []);
  const fx =
    "absolute inset-0 h-full w-full object-contain [mask-image:radial-gradient(circle,#000_58%,transparent_71%)] " +
    (theme === "dark" ? "mix-blend-lighten" : "mix-blend-multiply");
  if (!theme) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/premium/can-${theme}.jpg`} alt="" className={`${fx} transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`} />
      <video
        key={theme}
        className={`${fx} transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
      >
        <source src={`/premium/can-${theme}.webm`} type="video/webm" />
        <source src={`/premium/can-${theme}.mp4`} type="video/mp4" />
      </video>
    </>
  );
}

// 07.10.2026 (Александр, запись с телефона: во встроенном браузере лого
// сначала рисовалось половиной, сверху вниз). Причина -- картинка ещё
// докачивалась (90 КБ PNG по медленной сети). Теперь: WebP ~18 КБ, размер
// задан заранее (место не прыгает), а показываем её только целиком --
// плавным проявлением после загрузки. Плюс preloadAlpha() ниже качает лого
// и первый кадр банки заранее, пока человек ещё на странице.
function LogoImg({ src, className = "" }: { src: string; className?: string }) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setReady(true);
  }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt="Alpha"
      width={405}
      height={138}
      decoding="async"
      onLoad={() => setReady(true)}
      className={`h-[38px] w-auto transition-opacity duration-300 sm:h-[46px] ${ready ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}

let preloaded = false;
/** Warm the browser cache: both logos + the can's first frame. Cheap (~45 KB). */
export function preloadAlpha() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  for (const src of ["/premium/alpha-logo.webp", "/premium/alpha-logo-dark.webp", "/premium/can-light.jpg", "/premium/can-dark.jpg"]) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

function AlphaLogo({ word }: { word: string }) {
  // Aleksandr's "Alpha" wordmark (2026-10-07). Dark theme: his glowing
  // render, black background dropped with screen blending. Light theme:
  // typeset stand-in in the logo's own blue until the clean light file
  // arrives.
  return (
    <div className="flex items-center gap-2 select-none sm:gap-2.5">
      <LogoImg src="/premium/alpha-logo.webp" className="dark:hidden" />
      <LogoImg src="/premium/alpha-logo-dark.webp" className="hidden dark:block" />
      <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#3a3a3c] sm:text-[29px] dark:text-[#d6d6e0]">
        {word}
      </span>
      <span
        className="ml-1 self-center rounded-full px-2.5 py-1 text-xs font-semibold text-[#5a4dff] dark:text-[#c3b6ff]"
        style={{ background: "linear-gradient(100deg, rgba(1,72,252,0.12), rgba(150,63,255,0.16))" }}
      >
        Members
      </span>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#335ef7]/[0.08] dark:bg-white/[0.07]">{icon}</div>
      <div className="min-w-0">
        <div className="text-[16px] font-bold leading-tight sm:text-[17px]">{title}</div>
        <div className="mt-0.5 text-[14px] leading-snug text-[#6b6b78] dark:text-[#a9a9b8]">{desc}</div>
      </div>
    </div>
  );
}

function PlanCard({
  active, onClick, title, price, per, note, badge,
}: {
  active: boolean; onClick: () => void; title: string; price: string; per: string; note?: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex items-start gap-3 rounded-[18px] border-2 p-3 text-left transition sm:px-4 sm:py-3 ${
        active
          ? "border-[#335ef7] bg-[#335ef7]/[0.05] dark:border-[#0c8ce9] dark:bg-white/[0.04]"
          : "border-black/[0.08] hover:border-black/15 dark:border-white/10 dark:hover:border-white/20"
      }`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-[#335ef7] dark:border-[#0c8ce9]" : "border-[#c7c7cc] dark:border-white/30"}`}>
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          {title}
          {badge && <span className="rounded-full bg-[#6a4dff]/12 px-1.5 py-0.5 text-[11px] font-bold text-[#6a4dff] dark:text-[#b7a6ff]">{badge}</span>}
        </span>
        <span className="mt-0.5 block whitespace-nowrap text-[19px] font-bold tracking-[-0.01em] sm:text-[21px]">
          {price} <span className="text-[14px] font-medium text-[#6b6b78] dark:text-[#a9a9b8]">{per}</span>
        </span>
        {note && <span className="mt-0.5 block text-[11.5px] leading-tight text-[#8e8e93]">{note}</span>}
      </span>
    </button>
  );
}

/* ---------- icons (stroke, brand gradient) ---------- */

function GradDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3575ff" />
        <stop offset="1" stopColor="#963fff" />
      </linearGradient>
    </defs>
  );
}

function WandIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#gw)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <GradDefs id="gw" />
      <path d="M4 20L15 9" /><path d="M14 4v2M19 9h2M17.5 5.5l1.4-1.4M18 4v0M10 5l.7 1.6M19.4 13l-1.6-.7" />
      <path d="M15 9l1.5-1.5" strokeWidth="3" />
    </svg>
  );
}
function MediaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#gm)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <GradDefs id="gm" />
      <rect x="3" y="4" width="18" height="16" rx="3.5" /><circle cx="9" cy="10" r="1.7" /><path d="M21 16l-5-5-8 9" />
    </svg>
  );
}
function StatusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#gs)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <GradDefs id="gs" />
      <path d="M3 7h12M3 12h8M3 17h12" /><path d="M17 14l3 3-3 3" />
    </svg>
  );
}
function CanIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#gc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <GradDefs id="gc" />
      <ellipse cx="12" cy="7" rx="8" ry="3" /><path d="M4 7v9c0 1.7 3.6 3 8 3s8-1.3 8-3V7" /><path d="M9 13.5c1.2-1.4 3.3-1.4 4.5 0-1.2 1.4-3.3 1.4-4.5 0zM13.5 13.5l1.7-1v2z" />
    </svg>
  );
}
function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>
  );
}
function SpeakerOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>
  );
}

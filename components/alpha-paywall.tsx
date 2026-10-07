"use client";

// components/alpha-paywall.tsx
//
// A1 Premium -- the "Alpha Search" sales window (Aleksandr, 2026-10-07).
// Built from his GPT mockup, brought in line with the site: Commissioner
// (the site's own font), the site's blue -> purple gradient instead of the
// mockup's blue -> cyan, the real spinning-can video (light/dark versions,
// same clip as the app's old premium modal) instead of a static render, and
// the "highlighted applications" row dropped (postponed until there is an
// in-chat ATS -- applications are still too few to matter).
//
// Test environment only for now: payments are not connected, so the CTA
// calls `onActivate` and the parent decides what happens.

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { Locale } from "@/components/t";
import {
  TIER_PRICES,
  formatUsd,
  guessCountry,
  tierForCountry,
} from "@/lib/premium/pricing";

type Plan = "month" | "year";

type Key =
  | "tagline" | "sub" | "placeholder" | "hint" | "alsoTitle" | "alsoSub"
  | "wandT" | "wandD" | "mediaT" | "mediaD" | "statusT" | "statusD"
  | "emojiT" | "emojiD" | "pricesFor" | "month" | "year" | "perMonth"
  | "yearOnce" | "cta" | "ctaSub" | "footer" | "close" | "soundOn"
  | "soundOff" | "needPremium" | "mic" | "save";

const S: Record<Key, Partial<Record<Locale, string>> & { en: string }> = {
  tagline: { uk: "Пошук, який розуміє тебе.", en: "Search that gets you.", ru: "Поиск, который понимает тебя." },
  sub: {
    uk: "Розкажи, що шукаєш. Alpha уточнить важливе й знайде збіги.",
    en: "Tell it what you're looking for. Alpha asks what matters and finds the matches.",
    ru: "Расскажи, что ищешь. Alpha уточнит важное и найдёт совпадения.",
  },
  placeholder: { uk: "Дизайн, remote, гнучкий графік", en: "Design, remote, flexible hours", ru: "Дизайн, remote, гибкий график" },
  hint: {
    uk: "Голосом або текстом. Нові збіги — щойно з'являться.",
    en: "By voice or text. New matches as soon as they appear.",
    ru: "Голосом или текстом. Новые совпадения — как только появятся.",
  },
  alsoTitle: { uk: "Також у твоєму Premium", en: "Also in your Premium", ru: "Также в твоём Premium" },
  alsoSub: {
    uk: "Alpha Search та інші можливості — в одній підписці.",
    en: "Alpha Search and more — in one subscription.",
    ru: "Alpha Search и другие возможности — в одной подписке.",
  },
  wandT: { uk: "Чарівна паличка", en: "Magic wand", ru: "Волшебная палочка" },
  wandD: {
    uk: "Вакансія з голосу чи тексту — поля заповняться самі.",
    en: "A job post from your voice or text — fields fill themselves.",
    ru: "Вакансия из голоса или текста — поля заполнятся сами.",
  },
  mediaT: { uk: "Медіа без ліміту", en: "No media limits", ru: "Медиа без лимита" },
  mediaD: { uk: "Фото, відео та файли в чатах.", en: "Photos, videos and files in chats.", ru: "Фото, видео и файлы в чатах." },
  statusT: { uk: "Власний статус", en: "Your own status", ru: "Свой статус" },
  statusD: {
    uk: "Твій текст у профілі біжить рядком.",
    en: "Your text runs as a ticker on your profile.",
    ru: "Твой текст в профиле бежит строкой.",
  },
  emojiT: { uk: "Преміум-емодзі", en: "Premium emoji", ru: "Премиум-эмодзи" },
  emojiD: { uk: "Фірмовий значок біля твого імені.", en: "A signature badge next to your name.", ru: "Фирменный значок рядом с твоим именем." },
  pricesFor: { uk: "Ціни для", en: "Prices for", ru: "Цены для" },
  month: { uk: "Місяць", en: "Month", ru: "Месяц" },
  year: { uk: "Рік", en: "Year", ru: "Год" },
  perMonth: { uk: "/ міс.", en: "/ mo", ru: "/ мес." },
  yearOnce: { uk: "одним платежем за рік", en: "billed once a year", ru: "одним платежом за год" },
  save: { uk: "−25%", en: "−25%", ru: "−25%" },
  cta: { uk: "Увімкнути Alpha Search", en: "Turn on Alpha Search", ru: "Включить Alpha Search" },
  ctaSub: { uk: "Разом з усіма можливостями Premium", en: "Together with everything in Premium", ru: "Вместе со всеми возможностями Premium" },
  footer: {
    uk: "Alpha аналізує тексти вакансій. Атмосферу в команді уточнюй на співбесіді.",
    en: "Alpha reads job post texts. Ask about the team vibe at the interview.",
    ru: "Alpha анализирует тексты вакансий. Атмосферу в команде уточняй на собеседовании.",
  },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть" },
  soundOn: { uk: "Увімкнути звук", en: "Sound on", ru: "Включить звук" },
  soundOff: { uk: "Вимкнути звук", en: "Sound off", ru: "Выключить звук" },
  needPremium: {
    uk: "Alpha шукає з Premium — обери тариф нижче.",
    en: "Alpha searches with Premium — pick a plan below.",
    ru: "Alpha ищет с Premium — выбери тариф ниже.",
  },
  mic: { uk: "Сказати голосом", en: "Speak", ru: "Сказать голосом" },
};

function t(key: Key, lang: Locale): string {
  return S[key][lang] ?? S[key].en;
}

const SOUND_KEY = "a1.premium.sound";
const GRADIENT = "linear-gradient(100deg,#3575ff 0%,#6a4dff 55%,#963fff 100%)";

export function AlphaPaywall({
  open,
  onClose,
  onActivate,
}: {
  open: boolean;
  onClose: () => void;
  onActivate?: (plan: Plan) => void;
}) {
  const lang = useActiveLocale();
  const [plan, setPlan] = useState<Plan>("year");
  const [query, setQuery] = useState("");
  const [nudge, setNudge] = useState(false);
  const [sound, setSound] = useState(true);
  const [listening, setListening] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Music: the app's premium track. Opening the window is a click, so the
  // browser allows playback; a muted choice is remembered per device.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (open && sound) {
      a.volume = 0.35;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
    if (!open) a.currentTime = 0;
  }, [open, sound]);

  const toggleSound = () => {
    setSound((s) => {
      const next = !s;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {}
      return next;
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNudge(true);
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    rec.lang = lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-US";
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 backdrop-blur-[6px] sm:items-center sm:p-6"
      {...backdropDismiss(onClose)}
    >
      <audio ref={audioRef} src="/premium/eternal.mp3" loop preload="auto" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alpha Search"
        className="relative max-h-[100dvh] w-full overflow-y-auto text-left rounded-t-[28px] bg-white text-[#0b0b14] shadow-[0_30px_80px_rgba(20,30,80,0.35)] sm:max-h-[calc(100dvh-48px)] sm:max-w-[980px] sm:rounded-[32px] dark:bg-[#232330] dark:text-white"
      >
        {/* top-right controls */}
        <div className="absolute right-3 top-3 z-10 flex gap-1 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={sound ? t("soundOff", lang) : t("soundOn", lang)}
            className="grid h-10 w-10 place-items-center rounded-full text-[#8e8e93] transition hover:bg-black/5 hover:text-[#3a3a3c] dark:hover:bg-white/10 dark:hover:text-white"
          >
            {sound ? <SpeakerIcon /> : <SpeakerOffIcon />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", lang)}
            className="grid h-10 w-10 place-items-center rounded-full text-[#8e8e93] transition hover:bg-black/5 hover:text-[#3a3a3c] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* HERO */}
        <div className="grid gap-2 px-5 pt-6 sm:grid-cols-[1fr_330px] sm:gap-6 sm:px-12 sm:pt-12">
          <div className="order-2 sm:order-1">
            <AlphaLogo />
            <h2 className="mt-3 text-[34px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:mt-5 sm:text-[52px]">
              {t("tagline", lang)}
            </h2>
            <p className="mt-3 text-[15px] leading-snug text-[#6b6b78] sm:text-[17px] dark:text-[#a9a9b8]">
              {t("sub", lang)}
            </p>

            <form onSubmit={onSubmit} className="mt-5 sm:mt-7">
              <div
                className="flex items-center gap-2 rounded-full p-[2px]"
                style={{ background: GRADIENT }}
              >
                <div className="flex h-[58px] flex-1 items-center gap-2 rounded-full bg-white pl-5 pr-[5px] dark:bg-[#1a1a24]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#335ef7" strokeWidth="2.4" strokeLinecap="round" className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setNudge(false);
                    }}
                    placeholder={t("placeholder", lang)}
                    className="min-w-0 flex-1 bg-transparent text-[#0b0b14] outline-none placeholder:text-[#8e8e93] dark:text-white"
                  />
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
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-[0_6px_16px_rgba(53,117,255,0.4)] transition active:scale-95"
                    style={{ background: GRADIENT }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </div>
              <p className={`mt-2.5 pl-1 text-[13px] sm:text-sm ${nudge ? "font-semibold text-[#6a4dff] dark:text-[#b7a6ff]" : "text-[#8e8e93]"}`}>
                {nudge ? t("needPremium", lang) : t("hint", lang)}
              </p>
            </form>
          </div>

          <div className="order-1 flex items-center justify-center sm:order-2">
            <div className="relative h-[190px] w-[190px] sm:h-[330px] sm:w-[330px]">
              <video
                className="h-full w-full object-contain dark:hidden"
                src="/premium/can-light.mp4"
                poster="/premium/can-light.jpg"
                autoPlay muted loop playsInline preload="auto"
              />
              <video
                className="hidden h-full w-full object-contain dark:block"
                src="/premium/can-dark.mp4"
                poster="/premium/can-dark.jpg"
                autoPlay muted loop playsInline preload="auto"
              />
            </div>
          </div>
        </div>

        {/* ALSO IN PREMIUM */}
        <div className="mx-5 mt-7 border-t border-black/[0.07] pt-6 sm:mx-12 sm:mt-9 sm:pt-8 dark:border-white/10">
          <h3 className="text-[22px] font-bold tracking-[-0.02em] sm:text-[28px]">{t("alsoTitle", lang)}</h3>
          <p className="mt-1 text-[14px] text-[#6b6b78] sm:text-[15px] dark:text-[#a9a9b8]">{t("alsoSub", lang)}</p>
          <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Feature icon={<WandIcon />} title={t("wandT", lang)} desc={t("wandD", lang)} />
            <Feature icon={<MediaIcon />} title={t("mediaT", lang)} desc={t("mediaD", lang)} />
            <Feature icon={<StatusIcon />} title={t("statusT", lang)} desc={t("statusD", lang)} />
            <Feature icon={<CanIcon />} title={t("emojiT", lang)} desc={t("emojiD", lang)} />
          </div>
        </div>

        {/* PRICING */}
        <div ref={pricingRef} className="mx-5 mt-7 border-t border-black/[0.07] pb-6 pt-5 sm:mx-12 sm:mt-8 sm:pb-8 dark:border-white/10">
          {countryName && (
            <div className="mb-2.5 text-[13px] font-medium text-[#8e8e93]">
              {t("pricesFor", lang)}: {countryName}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.25fr] sm:items-stretch">
            <PlanCard
              active={plan === "month"}
              onClick={() => setPlan("month")}
              title={t("month", lang)}
              price={formatUsd(price.month)}
              per={t("perMonth", lang)}
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
            <div className="col-span-2 flex flex-col sm:col-span-1">
              <button
                type="button"
                onClick={() => onActivate?.(plan)}
                className={`flex min-h-[60px] flex-1 items-center justify-center rounded-[18px] px-5 text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(90,80,255,0.35)] transition hover:brightness-110 active:scale-[0.99] sm:text-[18px] ${nudge ? "ring-4 ring-[#6a4dff]/30" : ""}`}
                style={{ background: GRADIENT }}
              >
                {t("cta", lang)}
              </button>
              <div className="mt-1.5 text-center text-[12px] text-[#8e8e93]">{t("ctaSub", lang)}</div>
            </div>
          </div>
          <p className="mt-5 text-center text-[11.5px] leading-snug text-[#a0a0aa]">{t("footer", lang)}</p>
        </div>
      </div>
    </div>
  );
}

function AlphaLogo() {
  return (
    <div className="flex items-baseline gap-1.5 select-none">
      <span
        className="bg-clip-text pr-1 text-[40px] font-black italic leading-none tracking-[-0.04em] text-transparent sm:text-[52px]"
        style={{ backgroundImage: GRADIENT }}
      >
        Alpha
      </span>
      <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-[#3a3a3c] sm:text-[34px] dark:text-[#d6d6e0]">
        Search
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
      className={`relative flex items-start gap-3 rounded-[18px] border-2 p-3.5 text-left transition sm:p-4 ${
        active
          ? "border-[#335ef7] bg-[#335ef7]/[0.05] dark:border-[#7f8cff] dark:bg-white/[0.04]"
          : "border-black/[0.08] hover:border-black/15 dark:border-white/10 dark:hover:border-white/20"
      }`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-[#335ef7] dark:border-[#7f8cff]" : "border-[#c7c7cc] dark:border-white/30"}`}>
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#335ef7] dark:bg-[#7f8cff]" />}
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

"use client";

// components/magic-wand-panel.tsx
//
// Magic Wand в редакторе профиля (волна 5, 2026-10-03). Логика один в один
// с приложением (features/magic_wand), вид -- в стиле сайта:
//  * свёрнутая строка «Magic Wand» с переливающейся обводкой;
//  * по нажатию панель раскрывается: чипы-подсказки полей, поле для
//    рассказа (текстом), кнопка «Надіслати» / «Застосувати»;
//  * после первого разбора найденные чипы горят зелёным с крестиком,
//    ненайденные остаются серыми и по нажатию подсказывают, что сказать;
//    второй раз «отправить» с пустым полем = применить к форме;
//  * вокруг палочки кольцо с процентом заполнения.
// ИИ только раскладывает рассказ по полям, текст не переписывает; ничего
// не сохраняется, пока человек не нажмёт «Зберегти» в самом редакторе.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authFetch } from "@/lib/auth-fetch";
import type { Locale } from "@/components/t";
import {
  EMPTY_MAGIC_WAND_DATA,
  MAGIC_WAND_CHIPS,
  MAGIC_WAND_CHIP_COLOR,
  adoptMagicWandResult,
  magicWandFilledCount,
  removeMagicWandField,
  type MagicWandField,
  type MagicWandLocation,
  type MagicWandPanelData,
  type MagicWandPatch,
  type MagicWandResult,
} from "@/lib/a1/magic-wand";
import { magicWandText, type MagicWandStr } from "@/lib/a1/magic-wand-i18n";

const FIELD_LABEL: Partial<Record<MagicWandField, MagicWandStr>> = {
  name: "fieldName",
  bio: "fieldBio",
  industry: "fieldIndustry",
  education: "fieldEducation",
  companies: "fieldCompanies",
  hobbies: "fieldHobbies",
  skills: "fieldSkills",
  languages: "fieldLanguages",
  location: "fieldLocation",
};

// Голос: как в приложении, лимит около 10 минут; за минуту до конца --
// мягкое напоминание. Запись уходит на сервер (его расшифровка не зависит
// от языка интерфейса: рассказ может быть на любом языке и даже смесью).
const VOICE_MAX_SECONDS = 600;
const VOICE_WARN_SECONDS = 540;
// Сначала MP4/AAC (m4a), как в приложении: сервер Magic Wand отдаёт запись
// на расшифровку под именем voice.m4a, и только настоящий m4a принимается
// безотказно. WebM остаётся запасным (Firefox) -- он работает, когда сервер
// называет файл по его типу (см. заметку в отчёте по волне 5).
const VOICE_MIMES = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
const VOICE_TTL_SECONDS = 3600;

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** Как в приложении: 0:04,30 (минуты:секунды,сотые). */
function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")},${String(cs).padStart(2, "0")}`;
}

// 04.10.2026 (Александр: «элементы управления такие же, как в приложении»).
// Язык диктовки: как в приложении -- чип с глобусом и кодом, список с
// флагами; выбор запоминается. По умолчанию -- язык сайта.
const DICT_LANGS: { code: string; name: string; flag: string; bcp: string }[] = [
  { code: "uk", name: "Українська", flag: "🇺🇦", bcp: "uk-UA" },
  { code: "en", name: "English", flag: "🇬🇧", bcp: "en-US" },
  { code: "ru", name: "Русский", flag: "🌐", bcp: "ru-RU" },
  { code: "zh", name: "中文", flag: "🇨🇳", bcp: "zh-CN" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", bcp: "de-DE" },
  { code: "pl", name: "Polski", flag: "🇵🇱", bcp: "pl-PL" },
  { code: "es", name: "Español", flag: "🇪🇸", bcp: "es-ES" },
  { code: "fr", name: "Français", flag: "🇫🇷", bcp: "fr-FR" },
  { code: "pt", name: "Português", flag: "🇧🇷", bcp: "pt-BR" },
];
const DICT_LANG_KEY = "a1-mw-dict-lang";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

// 04.10.2026 (Александр: «сделай, чтобы всплывал попап, а то найти это
// нереально»): нет доступа к микрофону -- окно с понятной инструкцией,
// а не мелкая красная строка.
const MIC_HELP: Record<"uk" | "ru" | "en", { title: string; ios: string[]; desktop: string[]; retry: string; close: string }> = {
  uk: {
    title: "Потрібен доступ до мікрофона",
    ios: ["Натисніть «аА» ліворуч в адресному рядку.", "«Параметри вебсайту» → «Мікрофон» → «Дозволити».", "Поверніться сюди й натисніть «Спробувати ще»."],
    desktop: ["Натисніть значок ліворуч від адреси сайту (замок або налаштування).", "«Мікрофон» → «Дозволити».", "Натисніть «Спробувати ще»."],
    retry: "Спробувати ще",
    close: "Закрити",
  },
  ru: {
    title: "Нужен доступ к микрофону",
    ios: ["Нажмите «аА» слева в адресной строке.", "«Настройки веб-сайта» → «Микрофон» → «Разрешить».", "Вернитесь сюда и нажмите «Повторить»."],
    desktop: ["Нажмите значок слева от адреса сайта (замок или настройки).", "«Микрофон» → «Разрешить».", "Нажмите «Повторить»."],
    retry: "Повторить",
    close: "Закрыть",
  },
  en: {
    title: "Microphone access needed",
    ios: ["Tap “aA” on the left of the address bar.", "“Website Settings” → “Microphone” → “Allow”.", "Come back and tap “Try again”."],
    desktop: ["Click the icon left of the site address (lock or settings).", "“Microphone” → “Allow”.", "Click “Try again”."],
    retry: "Try again",
    close: "Close",
  },
};

function WandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mw-wand" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FE4BA3" />
          <stop offset="1" stopColor="#247DFF" />
        </linearGradient>
      </defs>
      <path d="m4 20 11-11" stroke="url(#mw-wand)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m15.5 3.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Zm4.5 7 .5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2ZM8 3.5l.5 1.2 1.2.5-1.2.5L8 6.9l-.5-1.2-1.2-.5 1.2-.5L8 3.5Z" fill="url(#mw-wand)" />
    </svg>
  );
}

/** Кольцо вокруг палочки: серая дорожка и дуга, зеленеет на 100%. */
function ProgressRing({ value, children }: { value: number; children: React.ReactNode }) {
  const size = 34;
  const w = 3;
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v * 100)}%`} data-testid="magic-wand-ring">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} className="stroke-neutral-200 dark:stroke-neutral-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={w}
          strokeLinecap="round"
          stroke={v >= 1 ? "#1fa54a" : "#8A59FF"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

function Chip({
  label,
  suffix,
  color,
  filled,
  focused,
  shimmering,
  showRemove,
  clearLabel,
  onTap,
  onRemove,
  testId,
}: {
  label: string;
  suffix?: string;
  color: string;
  filled: boolean;
  focused: boolean;
  shimmering: boolean;
  showRemove: boolean;
  clearLabel: string;
  onTap?: () => void;
  onRemove: () => void;
  testId: string;
}) {
  const base = filled
    ? "bg-[#ddf3e3] text-[#007a15] dark:bg-[#11421a] dark:text-[#7be08f]"
    : "border border-dashed border-[#c6cde0] bg-[#f5f5f9] text-neutral-700 dark:border-[#3a3a3e] dark:bg-[#27272a] dark:text-neutral-200";
  return (
    <span
      data-testid={testId}
      data-state={filled ? "filled" : "missing"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${base} ${focused ? "ring-2 ring-[#8A59FF]" : ""} ${shimmering ? "animate-pulse" : ""}`}
    >
      <button type="button" disabled={!onTap} onClick={onTap} className={`inline-flex items-center gap-1.5 ${onTap ? "cursor-pointer" : "cursor-default"}`}>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: filled ? "#1fa54a" : color }} />
        <span>
          {label}
          {suffix ? <span className="ml-1 opacity-60">{suffix}</span> : null}
        </span>
      </button>
      {filled && showRemove && (
        <button type="button" aria-label={clearLabel} data-testid={`${testId}-remove`} onClick={onRemove} className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[12px] leading-none opacity-70 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10">
          ×
        </button>
      )}
    </span>
  );
}

export function MagicWandPanel({
  lang,
  onApply,
}: {
  lang: Locale;
  /** Применить найденное к форме редактора (ничего не сохраняет). */
  onApply: (patch: MagicWandPatch, location: MagicWandLocation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MagicWandPanelData>(EMPTY_MAGIC_WAND_DATA);
  const [focus, setFocus] = useState<MagicWandField | null>(null);
  const [text, setText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [working, setWorking] = useState<Set<MagicWandField>>(new Set());
  const [error, setError] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [micHelp, setMicHelp] = useState(false);
  // Почему нет живого текста (код ошибки распознавания), если пишем звук вместо диктовки.
  const [speechIssue, setSpeechIssue] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [recording, setRecording] = useState(false);
  const [voiceStage, setVoiceStage] = useState<"upload" | "read" | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  // Живая диктовка (распознавание речи браузера): слова появляются в поле
  // прямо во время рассказа. Где браузер не умеет -- пишем звук, как раньше.
  const [dictating, setDictating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);
  const recRef = useRef<SpeechRec | null>(null);
  const dictOnRef = useRef(false);
  const dictDoneRef = useRef("");
  const dictNowRef = useRef("");
  const atStartRef = useRef("");
  const [dictLang, setDictLang] = useState<string>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(DICT_LANG_KEY) : null;
      if (saved && DICT_LANGS.some((l) => l.code === saved)) return saved;
    } catch {
      /* приватный режим */
    }
    const site = lang === "ptBR" ? "pt" : String(lang);
    return DICT_LANGS.some((l) => l.code === site) ? site : "en";
  });
  const [langOpen, setLangOpen] = useState(false);
  const [trash, setTrash] = useState<{ x: number; y: number; key: number } | null>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Закрыли редактор посреди записи -- микрофон не должен остаться включённым.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      dictOnRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* уже остановлено */
      }
    },
    [],
  );

  const tx = (key: MagicWandStr, vars?: Record<string, string | number>) => magicWandText(lang, key, vars);
  const isWorking = working.size > 0;
  const filledCount = magicWandFilledCount(data);
  const total = MAGIC_WAND_CHIPS.length;
  const canApply = data.hasResult && filledCount > 0 && !isWorking;
  const showApply = text.trim() === "" && canApply;
  const canSend = !isWorking && !recording && (text.trim() !== "" || canApply);

  function send() {
    const story = text.trim();
    if (isWorking) return;
    if (!story) {
      if (canApply) {
        onApply(data.patch, data.location);
        setApplied(true);
        setOpen(false);
      }
      return;
    }
    void run({ text: story });
  }

  async function run(input: { text?: string; blob?: Blob; mime?: string; seconds?: number }) {
    setError(false);
    setMicDenied(false);
    setApplied(false);
    const f = focus;
    setWorking(f ? new Set<MagicWandField>([f, ...MAGIC_WAND_CHIPS.filter((c) => data.chips[c]?.status !== "filled")]) : new Set(MAGIC_WAND_CHIPS));
    try {
      let voiceRef: string | null = null;
      if (input.blob) {
        setVoiceStage("upload");
        voiceRef = await uploadVoice(input.blob, input.mime ?? "audio/webm", input.seconds ?? 0);
        setVoiceStage("read");
      }
      const res = await authFetch("/api/account/magic-wand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(input.text ? { text: input.text } : {}),
          ...(voiceRef ? { voice: { fileReference: voiceRef } } : {}),
          ...(f ? { focus: f } : {}),
          lang: lang === "ptBR" ? "pt" : lang,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; result?: MagicWandResult } | null;
      if (!res.ok || !body?.ok || !body.result) throw new Error("failed");
      setData((prev) => adoptMagicWandResult(prev, body.result as MagicWandResult, f));
      setText("");
      setHint(null);
      setFocus(null);
    } catch {
      setError(true);
    } finally {
      setWorking(new Set());
      setVoiceStage(null);
    }
  }

  /** Загружает запись как короткоживущий голосовой документ (час) и отдаёт fileReference. */
  async function uploadVoice(blob: Blob, mime: string, secs: number): Promise<string> {
    const isMp4 = mime.includes("mp4");
    const ext = isMp4 ? "m4a" : "webm";
    // Приложение объявляет m4a как audio/x-m4a -- сервер сверяет это с тем, что увидел в файле.
    const declared = isMp4 ? "audio/x-m4a" : mime.split(";")[0] || "audio/webm";
    const file = new File([blob], `magic-wand.${ext}`, { type: declared });
    const createRes = await authFetch("/api/upload/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mimetype: file.type || "application/octet-stream", bytes: file.size, ttlSeconds: VOICE_TTL_SECONDS, voiceDuration: Math.max(secs, 1) }),
    });
    const created = (await createRes.json().catch(() => null)) as { ok?: boolean; result?: { id: string; url: string; fields?: Record<string, string> } } | null;
    if (!createRes.ok || !created?.ok || !created.result?.url) throw new Error("create");
    const { id, url, fields } = created.result;
    const form = new FormData();
    for (const [k, v] of Object.entries(fields ?? {})) form.append(k, v);
    form.append("file", file);
    const up = await fetch(url, { method: "POST", body: form });
    if (!up.ok) throw new Error("upload");
    const confirmRes = await authFetch("/api/upload/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    const confirmed = (await confirmRes.json().catch(() => null)) as { ok?: boolean; media?: { fileReference?: string } } | null;
    const ref = confirmed?.media?.fileReference;
    if (!confirmRes.ok || !confirmed?.ok || !ref) throw new Error("confirm");
    return ref;
  }

  function chooseDictLang(code: string) {
    setDictLang(code);
    setLangOpen(false);
    try {
      localStorage.setItem(DICT_LANG_KEY, code);
    } catch {
      /* приватный режим */
    }
  }

  function startClock() {
    if (timerRef.current) clearInterval(timerRef.current);
    elapsedRef.current = 0;
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      elapsedRef.current += 100;
      setElapsedMs(elapsedRef.current);
      if (elapsedRef.current >= VOICE_MAX_SECONDS * 1000) void sendVoice();
    }, 100);
  }

  function stopClock() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Текст поля во время диктовки: что было до неё + всё услышанное. */
  function showDictated() {
    const heard = [dictDoneRef.current, dictNowRef.current].filter(Boolean).join(" ");
    const before = atStartRef.current.trim();
    setText(before && heard ? `${before} ${heard}` : before || heard);
    const el = textRef.current;
    if (el) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
  }

  /** Одна сессия распознавания. Браузер сам останавливает её через время -- тогда тихо начинаем новую. */
  function listen(): boolean {
    const Ctor = speechCtor();
    if (!Ctor) return false;
    try {
      const rec = new Ctor();
      rec.lang = DICT_LANGS.find((l) => l.code === dictLang)?.bcp ?? "en-US";
      // iPhone: в «непрерывном» режиме Safari часто молчит до конца записи --
      // слушаем короткими сессиями и сразу начинаем следующую (см. onend).
      rec.continuous = !(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
      rec.interimResults = true;
      rec.onresult = (e) => {
        let now = "";
        for (let k = 0; k < e.results.length; k++) now += e.results[k]![0].transcript;
        dictNowRef.current = now.trim();
        showDictated();
      };
      rec.onerror = (e) => {
        if (e.error && e.error !== "no-speech" && e.error !== "aborted") setSpeechIssue(e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture" || e.error === "language-not-supported") {
          // Распознавание речи запрещено (или выключено в системе) -- пробуем
          // обычную запись звука; не вышло и она -- окно с инструкцией.
          dictOnRef.current = false;
          stopClock();
          setRecording(false);
          setDictating(false);
          setText(atStartRef.current);
          void startRecorder().then((ok) => {
            if (!ok) setMicHelp(true);
          });
        }
      };
      rec.onend = () => {
        // Сессия закончилась: её слова -- в «готовые».
        if (dictNowRef.current) {
          dictDoneRef.current = [dictDoneRef.current, dictNowRef.current].filter(Boolean).join(" ");
          dictNowRef.current = "";
        }
        if (recRef.current === rec) recRef.current = null;
        if (dictOnRef.current && !pausedRef.current) listen();
      };
      recRef.current = rec;
      rec.start();
      return true;
    } catch {
      return false;
    }
  }

  function stopListening() {
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* уже остановлено */
    }
    if (dictNowRef.current) {
      dictDoneRef.current = [dictDoneRef.current, dictNowRef.current].filter(Boolean).join(" ");
      dictNowRef.current = "";
    }
  }

  async function startVoice() {
    if (isWorking || recording) return;
    setError(false);
    setMicDenied(false);
    setLangOpen(false);
    atStartRef.current = text;
    dictDoneRef.current = "";
    dictNowRef.current = "";
    pausedRef.current = false;
    setPaused(false);
    // Сначала живая диктовка (бесплатно, слова видно сразу), иначе -- запись звука.
    setSpeechIssue(speechCtor() ? null : "unsupported");
    dictOnRef.current = true;
    if (listen()) {
      setDictating(true);
      setRecording(true);
      startClock();
      return;
    }
    dictOnRef.current = false;
    setDictating(false);
    if (!(await startRecorder())) setMicHelp(true);
  }

  /** Запись звука (когда живая диктовка недоступна); false -- нет доступа к микрофону. */
  async function startRecorder(): Promise<boolean> {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(true);
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = VOICE_MIMES.find((m) => MediaRecorder.isTypeSupported(m));
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (cancelledRef.current) return;
        const type = rec.mimeType || "audio/webm";
        void run({ blob: new Blob(chunksRef.current, { type }), mime: type, seconds: Math.round(elapsedRef.current / 1000) });
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      startClock();
      return true;
    } catch {
      return false;
    }
  }

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (dictating) {
      if (next) stopListening();
      else {
        // Продолжить после того, что уже в поле (его могли поправить руками).
        atStartRef.current = text;
        dictDoneRef.current = "";
        dictNowRef.current = "";
        listen();
      }
      return;
    }
    const rec = recorderRef.current;
    if (!rec) return;
    if (next && rec.state === "recording") rec.pause();
    else if (!next && rec.state === "paused") rec.resume();
  }

  function cancelVoice() {
    // Как в чатах приложения: красная точка подпрыгивает и падает в корзинку.
    const dot = dotRef.current?.getBoundingClientRect();
    const box = boxRef.current?.getBoundingClientRect();
    if (dot && box) setTrash({ x: dot.left + dot.width / 2 - box.left, y: dot.top + dot.height / 2 - box.top, key: Date.now() });
    stopClock();
    if (dictating) {
      dictOnRef.current = false;
      stopListening();
      setText(atStartRef.current);
    } else {
      cancelledRef.current = true;
      const rec = recorderRef.current;
      recorderRef.current = null;
      if (rec && rec.state !== "inactive") rec.stop();
      else streamRef.current?.getTracks().forEach((t) => t.stop());
    }
    setDictating(false);
    setRecording(false);
    setPaused(false);
    pausedRef.current = false;
  }

  async function sendVoice() {
    stopClock();
    if (dictating) {
      dictOnRef.current = false;
      stopListening();
      setDictating(false);
      setRecording(false);
      setPaused(false);
      pausedRef.current = false;
      // Слова уже в поле -- отправляем их как обычный текст.
      const heard = [dictDoneRef.current, dictNowRef.current].filter(Boolean).join(" ");
      const before = atStartRef.current.trim();
      const story = (before && heard ? `${before} ${heard}` : before || heard).trim();
      if (story) void run({ text: story });
      return;
    }
    cancelledRef.current = false;
    setRecording(false);
    setPaused(false);
    pausedRef.current = false;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function tapChip(field: MagicWandField) {
    if (isWorking || !data.hasResult) return;
    if (focus === field) {
      setFocus(null);
      setText("");
      setHint(null);
      return;
    }
    const chip = data.chips[field];
    setFocus(field);
    setText(chip?.status === "filled" ? (chip.preview ?? "") : "");
    setHint(chip?.hint ?? null);
    setTimeout(() => textRef.current?.focus(), 0);
  }

  function removeChip(field: MagicWandField) {
    setData((prev) => removeMagicWandField(prev, field));
    if (focus === field) {
      setFocus(null);
      setText("");
      setHint(null);
    }
    setApplied(false);
  }

  const placeholder = hint ?? (data.hasResult ? tx("addMore") : tx("placeholder"));
  const ringValue = filledCount / total;

  return (
    <div data-testid="magic-wand" className="rounded-2xl">
      <style>{`@keyframes mwShift{0%{background-position:0% 50%}100%{background-position:200% 50%}}@keyframes mwFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes mwPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}@keyframes mwDotDrop{0%{transform:translateY(0)}35%{transform:translateY(-26px)}75%{transform:translateY(2px) scale(.8)}100%{transform:translateY(4px) scale(0);opacity:0}}@keyframes mwBin{0%{transform:scale(0);opacity:0}25%{transform:scale(1);opacity:1}75%{transform:scale(1) rotate(-8deg);opacity:1}100%{transform:scale(.6);opacity:0}}`}</style>
      {!open ? (
        <button
          type="button"
          data-testid="magic-wand-entry"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl p-[1.5px] text-left"
          style={{ background: "linear-gradient(90deg,#317AFF,#8A59FF,#EF51CE,#FD31BB,#04B8FF,#317AFF)", backgroundSize: "200% 100%", animation: "mwShift 6s linear infinite" }}
        >
          <span className="flex items-center gap-3 rounded-[14.5px] bg-white px-3 py-2.5 dark:bg-neutral-900">
            {data.hasResult ? (
              <ProgressRing value={ringValue}>
                <WandIcon className="h-[18px] w-[18px]" />
              </ProgressRing>
            ) : (
              <WandIcon className="h-6 w-6 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{tx("title")}</span>
              {data.hasResult && (
                <span className="block truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
                  {applied ? tx("filledHint") : tx("filled", { count: filledCount, total })}
                </span>
              )}
            </span>
          </span>
        </button>
      ) : (
        <div className="rounded-2xl p-[1.5px]" style={{ background: "linear-gradient(90deg,#317AFF,#8A59FF,#EF51CE,#FD31BB,#04B8FF,#317AFF)", backgroundSize: "200% 100%", animation: "mwShift 6s linear infinite" }}>
          <div className="flex flex-col gap-3 rounded-[14.5px] bg-white p-3 dark:bg-neutral-900" data-testid="magic-wand-panel">
            <div className="flex items-center gap-3">
              <ProgressRing value={data.hasResult ? ringValue : 0}>
                <WandIcon className="h-[18px] w-[18px]" />
              </ProgressRing>
              <span className="flex-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{tx("title")}</span>
              {data.hasResult && (
                <span data-testid="magic-wand-filled" className="rounded-full bg-[#ddf3e3] px-2.5 py-1 text-[12px] font-medium text-[#007a15] dark:bg-[#11421a] dark:text-[#7be08f]">
                  {tx("filled", { count: filledCount, total })}
                </span>
              )}
              <button type="button" aria-label={tx("cancel")} onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MAGIC_WAND_CHIPS.map((f) => {
                const key = FIELD_LABEL[f];
                return (
                  <Chip
                    key={f}
                    testId={`magic-wand-chip-${f}`}
                    label={key ? tx(key) : f}
                    suffix={f === "languages" || f === "skills" ? tx("levels") : undefined}
                    color={MAGIC_WAND_CHIP_COLOR[f] ?? "#8A59FF"}
                    filled={data.chips[f]?.status === "filled"}
                    focused={focus === f}
                    shimmering={working.has(f)}
                    showRemove={data.hasResult && !isWorking}
                    clearLabel={tx("clear")}
                    onTap={data.hasResult ? () => tapChip(f) : undefined}
                    onRemove={() => removeChip(f)}
                  />
                );
              })}
            </div>

            {/* Как в приложении: серое поле рассказа, кнопки -- внутри него, внизу. */}
            <div ref={boxRef} className="relative flex h-[220px] flex-col rounded-[18px] bg-[#f2f2f7] pb-2 pl-3 pr-2 pt-2.5 dark:bg-[#313136]">
              <textarea
                ref={textRef}
                data-testid="magic-wand-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                maxLength={20000}
                readOnly={isWorking || (recording && !(dictating && paused))}
                className="min-h-0 w-full flex-1 resize-none bg-transparent text-[17px] leading-[1.3] text-neutral-900 outline-none placeholder:text-[#989aa6] dark:text-neutral-50"
              />
              <div className="mt-1.5 flex h-9 items-center gap-2">
                {recording ? (
                  <div data-testid="magic-wand-recording" className="flex w-full min-w-0 items-center gap-1.5 animate-[mwFade_.24s_ease-out]">
                    <span ref={dotRef} className={`ml-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff3b30] ${paused ? "opacity-40" : "animate-pulse"}`} />
                    <span className={`w-[66px] shrink-0 text-[15px] tabular-nums ${elapsedMs >= VOICE_WARN_SECONDS * 1000 ? "text-[#ff3b30]" : "text-neutral-900 dark:text-neutral-50"}`}>{fmtClock(elapsedMs)}</span>
                    <span className="flex w-[46px] shrink-0 items-center gap-1 text-[14px] font-semibold text-[#989aa6]">
                      <GlobeIcon className="h-4 w-4" />
                      {dictLang.toUpperCase()}
                    </span>
                    <button type="button" data-testid="magic-wand-record-cancel" onClick={cancelVoice} className="min-w-0 flex-1 truncate px-1 py-1.5 text-center text-[17px] text-[#335ef7] dark:text-[#0c8ce9]">
                      {tx("cancel")}
                    </button>
                    <button
                      type="button"
                      data-testid="magic-wand-pause"
                      aria-label={paused ? "Resume" : "Pause"}
                      onClick={togglePause}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 transition active:scale-90 dark:bg-black dark:text-neutral-50"
                    >
                      <span className="relative h-5 w-5">
                        <svg viewBox="0 0 24 24" className={`absolute inset-0 h-5 w-5 transition duration-200 ${paused ? "rotate-90 scale-50 opacity-0" : "opacity-100"}`} fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                        <svg viewBox="0 0 24 24" className={`absolute inset-0 h-5 w-5 transition duration-200 ${paused ? "opacity-100" : "-rotate-90 scale-50 opacity-0"}`} fill="currentColor"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      data-testid="magic-wand-record-send"
                      aria-label={tx("send")}
                      onClick={() => void sendVoice()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition active:scale-90"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full items-center gap-2 animate-[mwFade_.24s_ease-out]">
                    {isWorking ? (
                      <span className="flex-1 pl-1 text-[15px] text-[#989aa6]">{voiceStage ? tx("transcribing") : tx("reading")}</span>
                    ) : (
                      <>
                        <span className="flex-1" />
                        <div className="relative">
                          <button
                            type="button"
                            data-testid="magic-wand-lang"
                            onClick={() => setLangOpen((v) => !v)}
                            className="flex h-[34px] items-center gap-1 rounded-full bg-white px-[11px] text-[14px] font-semibold text-[#989aa6] dark:bg-black"
                          >
                            <GlobeIcon className="h-4 w-4" />
                            {dictLang.toUpperCase()}
                          </button>
                          {langOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                              <div className="absolute bottom-[42px] right-0 z-50 w-[240px] origin-bottom-right animate-[mwPop_.18s_ease-out] rounded-[22px] bg-white/95 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur dark:bg-[#1c1c1e]/95 dark:ring-white/10">
                                {DICT_LANGS.map((l) => (
                                  <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => chooseDictLang(l.code)}
                                    className="flex min-h-[44px] w-full items-center gap-2.5 rounded-2xl px-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                                  >
                                    <span className="text-[20px] leading-none">{l.flag}</span>
                                    <span className={`truncate text-[17px] ${l.code === dictLang ? "font-bold text-[#335ef7] dark:text-[#0c8ce9]" : "font-medium text-neutral-900 dark:text-neutral-50"}`}>{l.name}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          data-testid="magic-wand-mic"
                          aria-label={tx("voice")}
                          onClick={() => void startVoice()}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#989aa6] transition active:scale-90 dark:bg-black"
                        >
                          <MicIcon className="h-[18px] w-[18px]" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      data-testid={showApply ? "magic-wand-apply" : "magic-wand-send"}
                      aria-label={showApply ? tx("apply") : tx("send")}
                      disabled={!canSend && !isWorking}
                      onClick={send}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition active:scale-90 ${!canSend && !isWorking ? "opacity-45" : ""}`}
                    >
                      {isWorking ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : showApply ? (
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
              {trash && (
                <span key={trash.key} className="pointer-events-none absolute" style={{ left: trash.x, top: trash.y }}>
                  <span className="absolute -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-[#ff3b30] animate-[mwDotDrop_.75s_ease-in-out_forwards]" />
                  <svg viewBox="0 0 24 24" className="absolute -ml-[11px] -mt-[6px] h-[22px] w-[22px] text-[#ff3b30] animate-[mwBin_.95s_ease-in-out_forwards]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" onAnimationEnd={() => setTrash(null)}>
                    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
                  </svg>
                </span>
              )}
            </div>

            {focus && data.chips[focus]?.note && <p className="text-[12.5px] text-amber-700 dark:text-amber-400">{data.chips[focus]?.note}</p>}
            {error && (
              <p data-testid="magic-wand-error" className="text-[13px] text-red-600 dark:text-red-400">
                {tx("failed")}
              </p>
            )}
            {micHelp && typeof document !== "undefined" && createPortal(
              <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setMicHelp(false)}>
                <div role="dialog" aria-modal="true" data-testid="magic-wand-mic-help" onClick={(e) => e.stopPropagation()} className="w-full max-w-[380px] animate-[mwPop_.18s_ease-out] rounded-[24px] bg-white p-5 shadow-2xl dark:bg-[#1c1c1e]">
                  {(() => {
                    const h = MIC_HELP[lang === "uk" || lang === "ru" ? lang : "en"];
                    const ios = typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
                    return (
                      <>
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffecec] text-[#ff3b30] dark:bg-[#3a1a1c]">
                          <MicIcon className="h-6 w-6" />
                        </div>
                        <h3 className="text-center text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">{h.title}</h3>
                        <ol className="mt-3 flex flex-col gap-2 text-[15px] text-neutral-700 dark:text-neutral-200">
                          {(ios ? h.ios : h.desktop).map((line, i) => (
                            <li key={i} className="flex gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-[13px] font-semibold text-[#335ef7] dark:bg-[#1b2a4a] dark:text-[#7d93ff]">{i + 1}</span>
                              <span className="pt-0.5">{line}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-5 flex gap-2">
                          <button type="button" onClick={() => setMicHelp(false)} className="flex-1 rounded-full bg-[#f2f2f7] py-3 text-[15px] font-semibold text-neutral-800 dark:bg-[#2c2c2e] dark:text-neutral-100">
                            {h.close}
                          </button>
                          <button
                            type="button"
                            data-testid="magic-wand-mic-retry"
                            onClick={() => {
                              setMicHelp(false);
                              void startVoice();
                            }}
                            className="flex-1 rounded-full bg-[#335ef7] py-3 text-[15px] font-semibold text-white"
                          >
                            {h.retry}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>,
              document.body,
            )}
            {recording && !dictating && (
              <p data-testid="magic-wand-no-live" className="text-[12.5px] text-[#989aa6]">
                {lang === "uk"
                  ? "Браузер не дав розпізнавати мову на льоту, тому пишемо голос: текст з’явиться після відправки."
                  : lang === "ru"
                    ? "Браузер не дал распознавать речь на лету, поэтому пишем голос: текст появится после отправки."
                    : "The browser didn’t allow live speech recognition, so we record your voice: the text appears after you send it."}
                {speechIssue ? ` (${speechIssue})` : ""}
              </p>
            )}
            {micDenied && (
              <p data-testid="magic-wand-mic-denied" className="text-[13px] text-red-600 dark:text-red-400">
                {tx("micDenied")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

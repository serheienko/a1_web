"use client";

// app/spivbesida/kit.tsx -- интерактивные блоки страниц «Співбесіда»
// (24.10.2026, Александр: «сделать прикольно и интерактивно, не скучно, чтобы
// и кандидату, и интервьюеру было удобно»).
//
// Что здесь:
// - Checklist: галочки с прогресс-кольцом, конфетти на 100%, «Скопіювати
//   чек-лист» (вставляется с ☐/☑ в Notion, Telegram, Google Docs). Галочки
//   живут в localStorage этого браузера: аккаунт не нужен, сервер не трогаем.
//   Нет хранилища (приватное окно) -- просто не запоминаем, страница работает.
// - Templates: готовые тексты интервьюеру с кнопкой «Скопіювати».
// - Antifraud: свёрнутый блок с приёмами против AI-подсказок.
// - Tools: плитки сервисов со значком бренда (lib/interview-kit/logos.ts) или
//   буквой названия цветом бренда, если значка нет.
//
// Весь видимый текст идёт через <T> (все 9 языков в HTML, видно нужный), а
// для буфера обмена язык берём из useActiveLocale: туда <T> не вставишь.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { T, type Locale } from "@/components/t";
import { useActiveLocale } from "@/lib/use-active-locale";
import { LOGOS } from "@/lib/interview-kit/logos";
import { authFetch } from "@/lib/auth-fetch";
import { profileHref } from "@/lib/profile-href";
import { PROFILE_FILLED_MIN } from "@/lib/profile-fill";
import { MR_KIT_AVATAR, MR_KIT_AVATAR_BLUR } from "@/lib/interview-kit/mr-kit-avatar";
import {
  ANTIFRAUD,
  CHECKLIST,
  FROM_A1,
  HUB,
  PROFILE_CV,
  ROLE_PATH,
  TEMPLATES,
  TOOL_GROUPS,
  UI,
  type AntifraudIcon,
  type Role,
  type Stage,
  type Tool,
} from "@/lib/interview-kit/content";

const STAGES: Stage[] = ["before", "during", "after"];

// ───────── буфер обмена ─────────
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Старые браузеры и встроенные webview: через скрытое поле.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [
    copied,
    (text: string) => {
      void copyText(text).then((ok) => {
        if (!ok) return;
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      });
    },
  ];
}

// ───────── значки ─────────
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
    </svg>
  );
}
function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.4}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
function ArrowOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </svg>
  );
}

function FraudIcon({ name }: { name: AntifraudIcon }) {
  const p = { width: 26, height: 26, viewBox: "0 0 24 24", "aria-hidden": true, ...stroke };
  switch (name) {
    case "ear":
      return (
        <svg {...p}>
          <path d="M7 9a5 5 0 0 1 10 0c0 3-2.5 3.5-2.5 6.5a3 3 0 0 1-5.5 1.6" />
          <path d="M10 9.5a2 2 0 0 1 4 0c0 1.2-1 1.5-1 2.5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...p}>
          <path d="M3 10c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5" />
          <path d="M7 13.5L5.5 16M12 14.5V17M17 13.5l1.5 2.5" />
        </svg>
      );
    case "pen":
      return (
        <svg {...p}>
          <path d="M4 20l4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z" />
          <path d="M14 7l3 3" />
        </svg>
      );
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2" />
        </svg>
      );
    case "twist":
      return (
        <svg {...p}>
          <path d="M4 8h12l-3-3" />
          <path d="M20 16H8l3 3" />
        </svg>
      );
    case "screen":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
  }
}

// 24.10.2026 (Александр): значок блока «Як помітити AI-підказки» -- закрытый
// глаз, который «открывается», когда блок раскрывают: веко поднимается,
// появляется зрачок. Анимация чисто на CSS по атрибуту open у <details>.
function EyeToggleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...stroke} className="kit-eye">
      <g className="kit-eye-closed">
        <path d="M3 10c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5" />
        <path d="M7 13.5L5.5 16M12 14.5V17M17 13.5l1.5 2.5" />
      </g>
      <g className="kit-eye-open">
        <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" className="kit-eye-pupil" />
      </g>
    </svg>
  );
}

// ───────── переключатель «Кандидату / Інтерв'юеру» ─────────
export function RoleSwitch({ role }: { role: Role }) {
  const items: { r: Role; label: typeof UI.roleCandidate }[] = [
    { r: "candidate", label: UI.roleCandidate },
    { r: "interviewer", label: UI.roleInterviewer },
  ];
  return (
    <div className="inline-flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
      {items.map(({ r, label }) => (
        <Link
          key={r}
          href={ROLE_PATH[r]}
          aria-current={r === role ? "page" : undefined}
          className={
            "rounded-full px-4 py-2 text-[14px] font-medium transition " +
            (r === role
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white")
          }
        >
          <T {...label} />
        </Link>
      ))}
    </div>
  );
}

// ───────── иллюстрация в шапке ─────────
// 24.10.2026: картинки Александра, у каждой роли две: широкая (телефон,
// баннер на всю ширину) и квадратная (десктоп, колонка справа). Выбирает
// браузер через <picture> по ширине окна -- поэтому и при растягивании
// окна на десктопе картинка меняется сама, без JS. Граница та же, что у
// сетки шапки (md, 768px).
//
// Пока картинка грузится, на её месте размытая копия (крошечный jpeg прямо
// в коде, ~470 байт), потом картинка плавно проявляется (Александр: «пока
// её нет, показывай подгрузку через блюр»). loading="lazy" здесь не ставим:
// картинка в первом экране, отложенная загрузка только задержала бы её.
const ILL_BLUR: Record<Role, { wide: string; square: string }> = {
  candidate: { wide: "data:image/jpeg;base64,/9j/2wBDAA4KCw0LCQ4NDA0QDw4RFiQXFhQUFiwgIRokNC43NjMuMjI6QVNGOj1OPjIySGJJTlZYXV5dOEVmbWVabFNbXVn/2wBDAQ8QEBYTFioXFypZOzI7WVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVn/wAARCAAIABQDASIAAhEBAxEB/8QAFwABAAMAAAAAAAAAAAAAAAAAAAMEBf/EACAQAAICAgAHAAAAAAAAAAAAAAECAAMEEQUTISMxUWH/xAAWAQEBAQAAAAAAAAAAAAAAAAADAAX/xAAbEQADAAIDAAAAAAAAAAAAAAAAAQIDISIxgf/aAAwDAQACEQMRAD8A1rw2NiKqUu15Q6CdQD9k3BDm8jvKyvvwwiIcTKw6Xotdl2/Oeq5ldkU+iYiJnUuTI//Z", square: "data:image/jpeg;base64,/9j/2wBDAA4KCw0LCQ4NDA0QDw4RFiQXFhQUFiwgIRokNC43NjMuMjI6QVNGOj1OPjIySGJJTlZYXV5dOEVmbWVabFNbXVn/2wBDAQ8QEBYTFioXFypZOzI7WVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVn/wAARCAAMAAwDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAABAX/xAAgEAACAAUFAQAAAAAAAAAAAAABAgADBAUREhMhMVEU/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwT/xAAbEQACAQUAAAAAAAAAAAAAAAABAgADEUFRYf/aAAwDAQACEQMRAD8AcbmtNcZNPJIfKjPPR8i99BYA408eQbal77MZSFu8lREqsvFXJqGSWyKo6GmJHemFUKLb7FZTmf/Z" },
  interviewer: { wide: "data:image/jpeg;base64,/9j/2wBDAA4KCw0LCQ4NDA0QDw4RFiQXFhQUFiwgIRokNC43NjMuMjI6QVNGOj1OPjIySGJJTlZYXV5dOEVmbWVabFNbXVn/2wBDAQ8QEBYTFioXFypZOzI7WVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVn/wAARCAAIABQDASIAAhEBAxEB/8QAFwABAAMAAAAAAAAAAAAAAAAAAAQFBv/EACAQAAEEAQQDAAAAAAAAAAAAAAEAAgMREgQFEyEjMTL/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABoRAAMAAwEAAAAAAAAAAAAAAAABEQIEIUH/2gAMAwEAAhEDEQA/ANbC7VPgY5wxv3aoNwfrxuYLYZHQnp2FG0RFrxPqvPRITONoAw8Ir4PVIiKN4qiw/9k=", square: "data:image/jpeg;base64,/9j/2wBDAA4KCw0LCQ4NDA0QDw4RFiQXFhQUFiwgIRokNC43NjMuMjI6QVNGOj1OPjIySGJJTlZYXV5dOEVmbWVabFNbXVn/2wBDAQ8QEBYTFioXFypZOzI7WVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVn/wAARCAAMAAwDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAABQP/xAAeEAACAgICAwAAAAAAAAAAAAABAgMEABEFIRIxQf/EABUBAQEAAAAAAAAAAAAAAAAAAAME/8QAGREAAgMBAAAAAAAAAAAAAAAAAAECERNR/9oADAMBAAIRAxEAPwB/lLhrUnlVQB0AT9wylZgtVxNtELE9eWLwhLNZVmijZR3ojIvQqxtpIUUe9BRk6xzqSd9GUWf/2Q==" },
};

export function RoleIllustration({ role }: { role: Role }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Картинка могла загрузиться до того, как React повесил onLoad (из кеша).
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    <picture
      className={`kit-ill block ${loaded ? "kit-ill-loaded" : ""}`}
      style={{ ["--blur-wide" as string]: `url(${ILL_BLUR[role].wide})`, ["--blur-square" as string]: `url(${ILL_BLUR[role].square})` }}
    >
      <source media="(min-width: 768px)" srcSet={`/spivbesida/${role}-square.webp`} width={1000} height={1000} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={`/spivbesida/${role}-wide.webp`}
        width={1600}
        height={640}
        alt="Mr Kit"
        fetchPriority="high"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="block aspect-[5/2] h-auto w-full object-cover md:aspect-square"
      />
    </picture>
  );
}

// ───────── чек-лист ─────────
function storageKey(role: Role) {
  return `a1-interview-kit:${role}`;
}
function readSaved(role: Role): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(role));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeSaved(role: Role, ids: string[]) {
  try {
    window.localStorage.setItem(storageKey(role), JSON.stringify(ids));
  } catch {
    /* приватное окно -- просто не запоминаем */
  }
}

function checklistText(role: Role, done: Set<string>, loc: Locale): string {
  const items = CHECKLIST[role];
  const head = `${UI.checklist[loc]}: ${role === "candidate" ? UI.roleCandidate[loc] : UI.roleInterviewer[loc]} (A1)`;
  const parts = [head];
  for (const s of STAGES) {
    const rows = items.filter((i) => i.stage === s).map((i) => `${done.has(i.id) ? "☑" : "☐"} ${i.text[loc]}`);
    parts.push(`\n${UI.stage[s][loc]}\n${rows.join("\n")}`);
  }
  parts.push(`\njobs.a1appp.com${ROLE_PATH[role]}`);
  return parts.join("\n");
}

const CONFETTI = Array.from({ length: 22 }, (_, i) => i);

export function Checklist({ role }: { role: Role }) {
  const items = CHECKLIST[role];
  const loc = useActiveLocale();
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [burst, setBurst] = useState(0);
  const [copied, copy] = useCopied();

  useEffect(() => {
    const known = new Set(items.map((i) => i.id));
    setDone(new Set(readSaved(role).filter((id) => known.has(id))));
    setLoaded(true);
  }, [role, items]);

  const total = items.length;
  const count = done.size;
  const pct = total ? count / total : 0;
  const msg = count === 0 ? UI.progress[0]! : count === total ? UI.progress[3]! : pct < 0.5 ? UI.progress[1]! : UI.progress[2]!;

  function toggle(id: string) {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
    writeSaved(role, [...next]);
    if (next.size === total && done.size !== total) setBurst((b) => b + 1);
  }
  function reset() {
    setDone(new Set());
    writeSaved(role, []);
  }

  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <section className="kit-card rounded-[28px] bg-card p-5 sm:p-7 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-4">
        <div className={`relative h-[68px] w-[68px] shrink-0 ${count === total ? "kit-ring-done" : ""}`}>
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={R} className="kit-ring-track" strokeWidth="7" fill="none" />
            <circle
              cx="32" cy="32" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
              className="kit-ring-fill"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums text-neutral-900 dark:text-white" suppressHydrationWarning>
            {count}/{total}
          </span>
          {burst > 0 ? (
            <span key={burst} className="kit-confetti" aria-hidden="true">
              {CONFETTI.map((i) => (
                <span key={i} style={{ ["--a" as string]: `${(i / CONFETTI.length) * 360}deg`, ["--d" as string]: `${46 + (i % 4) * 12}px`, ["--c" as string]: `var(--k${i % 5})` }} />
              ))}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            <T {...UI.checklist} />
          </h2>
          <p className={`mt-0.5 text-[14px] font-medium ${count === total ? "text-emerald-600 dark:text-emerald-400" : "text-accent"}`} suppressHydrationWarning>
            <T {...msg} />
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => copy(checklistText(role, done, loc))}
            className={`kit-btn flex-1 sm:flex-none ${copied ? "kit-btn-done" : ""}`}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? <T {...UI.copied} /> : <T {...UI.copyChecklist} />}</span>
          </button>
          {count > 0 ? (
            <button type="button" onClick={reset} className="kit-btn kit-btn-ghost" aria-label={UI.reset[loc]} title={UI.reset[loc]}>
              <ResetIcon />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {STAGES.map((s, si) => {
          const rows = items.filter((i) => i.stage === s);
          const stageDone = rows.filter((i) => done.has(i.id)).length;
          return (
            <div key={s}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${stageDone === rows.length ? "bg-emerald-500 text-white" : "bg-accent/10 text-accent"}`} suppressHydrationWarning>
                  {stageDone === rows.length ? <CheckIcon size={13} /> : si + 1}
                </span>
                <span className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <T {...UI.stage[s]} />
                </span>
              </div>
              <ul className="space-y-2">
                {rows.map((it) => {
                  const on = done.has(it.id);
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(it.id)}
                        className={`kit-item ${on ? "kit-item-on" : ""} ${loaded ? "" : "kit-item-static"}`}
                      >
                        <span className="kit-box">{on ? <CheckIcon size={14} /> : null}</span>
                        <span className="kit-item-text"><T {...it.text} /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[12px] text-neutral-400 dark:text-neutral-500">
        <T {...UI.saved} />
      </p>
    </section>
  );
}

// ───────── готовые тексты ─────────
function TemplateCard({ label, text }: { label: typeof UI.copy; text: typeof UI.copy }) {
  const loc = useActiveLocale();
  const [copied, copy] = useCopied();
  return (
    <div className="flex flex-col rounded-[22px] bg-card p-5 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <T {...label} />
        </span>
        <button type="button" onClick={() => copy(text[loc])} className={`kit-btn kit-btn-sm ${copied ? "kit-btn-done" : ""}`}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? <T {...UI.copied} /> : <T {...UI.copy} />}</span>
        </button>
      </div>
      <p className="kit-quote mt-3 flex-1 rounded-2xl bg-neutral-50 p-4 text-[14px] leading-relaxed text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-200">
        <T {...text} />
      </p>
    </div>
  );
}

export function Templates() {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        <T {...TEMPLATES.title} />
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {TEMPLATES.items.map((it) => (
          <TemplateCard key={it.id} label={it.label} text={it.text} />
        ))}
      </div>
    </section>
  );
}

// ───────── приёмы против AI-подсказок ─────────
export function Antifraud() {
  return (
    <details className="kit-fraud group mt-10 rounded-[28px] bg-card dark:bg-neutral-900">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-7 [&::-webkit-details-marker]:hidden">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <EyeToggleIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            <T {...ANTIFRAUD.title} />
          </span>
          <span className="mt-0.5 block text-[14px] text-neutral-500 dark:text-neutral-400">
            <T {...ANTIFRAUD.sub} />
          </span>
        </span>
        <span className="kit-chev flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-transform group-open:rotate-180 dark:bg-neutral-800 dark:text-neutral-300">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 sm:px-7 sm:pb-7 lg:grid-cols-3">
        {ANTIFRAUD.cards.map((c, i) => (
          <div key={c.icon} className="kit-fraud-card rounded-[20px] bg-neutral-50 p-4 dark:bg-neutral-800/60" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-accent shadow-sm dark:bg-neutral-900">
              <FraudIcon name={c.icon} />
            </span>
            <div className="mt-3 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              <T {...c.title} />
            </div>
            <p className="mt-1 text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">
              <T {...c.text} />
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

// ───────── инструменты ─────────
// Значки, которые в коллекции слишком светлые для белой плитки.
const LOGO_COLOR_FIX: Record<string, string> = { tldraw: "#1D1D1D" };

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ToolTile({ tool }: { tool: Tool }) {
  const logo = tool.logo ? LOGOS[tool.logo] : undefined;
  const color = tool.logo ? (LOGO_COLOR_FIX[tool.logo] ?? logo?.hex) : tool.color;
  return (
    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="kit-tile group">
      <span className="kit-tile-logo">
        {logo ? (
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill={color}>
            <path d={logo.path} />
          </svg>
        ) : (
          <span className="text-[18px] font-bold" style={{ color }}>{tool.name.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{tool.name}</span>
        <span className="block truncate text-[12px] text-neutral-400 dark:text-neutral-500">{host(tool.url)}</span>
      </span>
      <span className="hidden text-neutral-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent sm:block dark:text-neutral-600">
        <ArrowOut />
      </span>
    </a>
  );
}

export function Tools({ role }: { role: Role }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        <T {...UI.tools} />
      </h2>
      <div className="mt-3 flex gap-3 rounded-2xl bg-accent/[0.07] p-4 text-[13px] leading-snug text-neutral-700 dark:bg-accent/10 dark:text-neutral-200">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="mt-px shrink-0 text-accent" {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
        <span><T {...UI.toolsRule} /></span>
      </div>
      <div className="mt-6 space-y-8">
        {TOOL_GROUPS[role].map((g) => (
          <div key={g.id}>
            <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
              <T {...g.title} />
            </h3>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              <T {...g.desc} />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {g.tools.map((tool) => (
                <ToolTile key={tool.name} tool={tool} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────── «От A1» ─────────
export function FromA1() {
  const loc = useActiveLocale();
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        <T {...UI.fromA1} />
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FROM_A1.map((c) => {
          const href = loc === "uk" ? c.href.uk : loc === "ru" ? c.href.ru : c.href.other;
          return (
            <Link key={c.id} href={href} className="kit-a1 group flex items-center gap-4 rounded-[22px] p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                {c.id === "salaries" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
                    <path d="M3 21h18" />
                    <rect x="5" y="12" width="3.4" height="7" rx="1" />
                    <rect x="10.3" y="6" width="3.4" height="13" rx="1" />
                    <rect x="15.6" y="9" width="3.4" height="10" rx="1" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z" />
                    <path d="M10 8.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1v.4M12 13.6h.01" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-white"><T {...c.title} /></span>
                <span className="mt-0.5 block text-[13px] text-white/75"><T {...c.desc} /></span>
              </span>
              <span className="text-white/70 transition group-hover:translate-x-1">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ───────── «Профіль A1 замість резюме» ─────────
// Гость видит «Створити профіль». Вошедший, у кого заполнено меньше
// PROFILE_FILLED_MIN разделов, видит «Заповнити профіль» и полоску прогресса
// (кнопка открывает его профиль сразу с редактором, ?edit=1). У кого профиль
// заполнен, видит «Мій профіль». 24.10.2026 (Александр): блок больше не
// прячем ни от кого, он висит как рекомендация «тримайте профіль заповненим»
// для обеих сторон. variant выбирает текст под место: вход в раздел (hub),
// кандидату, интервьюеру. Сервер всегда рисует гостевой вариант: так его
// видит поисковик и большинство посетителей; вошедшим кнопка меняется после
// ответа /api/account/whoami.
type Viewer = { state: "guest" } | { state: "partial"; username: string; filled: number } | { state: "done"; username: string };
type CvVariant = "hub" | "candidate" | "interviewer";
const CV_NEXT: Record<CvVariant, string> = { hub: "/spivbesida", candidate: "/spivbesida/kandydatu", interviewer: "/spivbesida/interviueru" };

export function ProfileInsteadOfCv({
  example,
  variant = "candidate",
  tone = "blue",
  className = "mt-10",
}: {
  example?: ReactNode;
  variant?: CvVariant;
  // 24.10.2026 (Александр): на входе в раздел синий баннер сливался с синей
  // карточкой «Я кандидат», там он белый (light). На страницах ролей синий.
  tone?: "blue" | "light";
  className?: string;
}) {
  const [viewer, setViewer] = useState<Viewer>({ state: "guest" });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok || !d.username) return;
        const filled = typeof d.profileFilled === "number" ? d.profileFilled : 0;
        setViewer(filled >= PROFILE_FILLED_MIN ? { state: "done", username: d.username } : { state: "partial", username: d.username, filled });
      })
      .catch(() => {
        /* не вошёл или сбой -- остаёмся гостем */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const href =
    viewer.state === "partial"
      ? `${profileHref(viewer.username)}?edit=1`
      : viewer.state === "done"
        ? profileHref(viewer.username)
        : `/sign-in?next=${encodeURIComponent(CV_NEXT[variant])}`;
  const text = variant === "hub" ? PROFILE_CV.textHub : variant === "interviewer" ? PROFILE_CV.textInterviewer : PROFILE_CV.text;
  const L = tone === "light";

  return (
    <section className={`kit-cv-wrap ${L ? "kit-cv-wrap-light" : ""} ${className} overflow-hidden rounded-[28px]`}>
      <div className={`kit-cv ${L ? "kit-cv-light" : ""} relative`}>
      <div className="relative p-6 sm:p-8">
        <span className="kit-cv-glow" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide ${L ? "text-neutral-400" : "text-white/70"}`}>
              <span className="kit-cv-cv">CV</span>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${L ? "bg-accent text-white" : "bg-white text-[#2846c9]"}`}>A1</span>
            </div>
            <h2 className={`mt-3 text-2xl font-bold tracking-tight sm:text-[28px] ${L ? "text-neutral-900 dark:text-white" : "text-white"}`}>
              <T {...PROFILE_CV.title} />
            </h2>
            <p className={`mt-2 text-[15px] leading-relaxed ${L ? "text-neutral-600 dark:text-neutral-300" : "text-white/80"}`}>
              <T {...text} />
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PROFILE_CV.tags.map((tag, i) => (
                <li key={tag.id} className="kit-cv-tag" style={{ animationDelay: `${i * 50}ms` }}>
                  <T {...tag.label} />
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
            {viewer.state === "partial" ? (
              <div className="w-48">
                <div className={`flex justify-between text-[12px] font-medium ${L ? "text-neutral-500 dark:text-neutral-400" : "text-white/75"}`}>
                  <span><T {...PROFILE_CV.filled} /></span>
                  <span className="tabular-nums">{Math.min(viewer.filled, PROFILE_FILLED_MIN)}/{PROFILE_FILLED_MIN}</span>
                </div>
                <div className={`mt-1.5 h-2 overflow-hidden rounded-full ${L ? "bg-neutral-200 dark:bg-neutral-700" : "bg-white/20"}`}>
                  <div className={`h-full rounded-full transition-all ${L ? "bg-accent" : "bg-white"}`} style={{ width: `${(Math.min(viewer.filled, PROFILE_FILLED_MIN) / PROFILE_FILLED_MIN) * 100}%` }} />
                </div>
              </div>
            ) : null}
            <Link href={href} className="kit-cv-btn group">
              <T {...(viewer.state === "partial" ? PROFILE_CV.fill : viewer.state === "done" ? PROFILE_CV.myProfile : PROFILE_CV.create)} />
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2} className="transition group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>
      </div>
        {example ? (
          <div className={`border-t ${L ? "border-neutral-200 dark:border-neutral-800" : "border-white/15"}`}>
            {/* 24.10.2026 (Александр): свёрнутый пример выглядит как карточка
                профиля -- круглый аватар кота, имя, ник, -- а целиком
                раскрывается по стрелке, плавно, слайдом. */}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="kit-cv-example kit-cv-summary group flex w-full cursor-pointer items-center gap-3 px-6 py-4 text-left sm:px-8"
            >
              <span
                className="kit-cv-ava relative h-12 w-12 shrink-0 overflow-hidden rounded-full"
                style={{ backgroundImage: `url(${MR_KIT_AVATAR_BLUR})` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MR_KIT_AVATAR} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[15px] font-semibold ${L ? "text-neutral-900 dark:text-white" : "text-white"}`}>
                  Mr Kit <span className={`font-normal ${L ? "text-neutral-400" : "text-white/60"}`}>@mrkit</span>
                </span>
                <span className={`block text-[13px] leading-snug ${L ? "text-accent" : "text-white/75"}`}>
                  <T {...PROFILE_CV.example} />
                </span>
              </span>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${open ? "rotate-180" : ""} ${L ? "bg-accent text-white" : "bg-white/15 text-white"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </button>
          </div>
        ) : null}
      </div>
      {/* Сам пример -- ВНЕ цветной шапки: раньше он лежал внутри неё, и градиент
          растягивался на всю высоту профиля, поэтому при переключении «Біо /
          Дописи» шапка меняла цвет (Александр). Раскрытие -- через
          grid-template-rows 0fr -> 1fr, высоту считать не нужно. */}
      {example ? (
        <div className={`kit-cv-panel ${open ? "kit-cv-panel-open" : ""}`} aria-hidden={!open} inert={!open}>
          <div className="min-h-0 overflow-hidden">
            <div className="kit-cv-demo px-2 py-6 sm:px-6">{example}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ───────── карточки хаба ─────────
export function HubCards() {
  const cards = [
    { role: "candidate" as Role, title: HUB.candidateTitle, desc: HUB.candidateDesc, n: CHECKLIST.candidate.length },
    { role: "interviewer" as Role, title: HUB.interviewerTitle, desc: HUB.interviewerDesc, n: CHECKLIST.interviewer.length },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c, i) => (
        <Link key={c.role} href={ROLE_PATH[c.role]} className={`kit-hub group ${i === 1 ? "kit-hub-b" : ""}`}>
          <span className="kit-hub-icon">
            {c.role === "candidate" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
                <rect x="3" y="5" width="18" height="12" rx="2.5" />
                <circle cx="12" cy="11" r="2.5" />
                <path d="M8 21h8" />
              </svg>
            )}
          </span>
          <span className="mt-auto block pt-10">
            <span className="block text-[22px] font-bold tracking-tight text-white"><T {...c.title} /></span>
            <span className="mt-1 block text-[14px] leading-snug text-white/75"><T {...c.desc} /></span>
          </span>
          <span className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">
              <CheckIcon size={13} /> {c.n}
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-900 transition group-hover:translate-x-1">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

// ───────── стили (одним куском, как на /stats) ─────────
export function KitStyles() {
  return <style>{CSS}</style>;
}

const CSS = `
.kit-card,.kit-fraud{--k0:#335ef7;--k1:#22c55e;--k2:#f59e0b;--k3:#ec4899;--k4:#06b6d4}
.kit-ring-track{stroke:#e5e7eb}
.dark .kit-ring-track{stroke:#262626}
.kit-ring-fill{stroke:var(--color-accent);transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1),stroke .3s}
.kit-ring-done .kit-ring-fill{stroke:#22c55e}
.kit-ring-done{animation:kit-pop .5s ease}
@keyframes kit-pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}
.kit-confetti{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none}
.kit-confetti span{position:absolute;width:7px;height:7px;border-radius:2px;background:var(--c);transform:rotate(var(--a)) translateY(0);opacity:0;animation:kit-burst .9s cubic-bezier(.15,.7,.3,1) forwards}
@keyframes kit-burst{0%{opacity:1;transform:rotate(var(--a)) translateY(0) scale(1)}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(.6)}}
.kit-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 16px;border-radius:999px;background:var(--color-accent);color:#fff;font-size:14px;font-weight:600;transition:transform .2s,filter .15s,background .2s,box-shadow .2s;white-space:nowrap}
.kit-btn:hover{filter:brightness(1.08)}
.kit-btn:not(.kit-btn-ghost):hover{transform:translateY(-1px);box-shadow:0 10px 22px -10px rgba(51,94,247,.75)}
.kit-btn:active,.kit-btn:not(.kit-btn-ghost):active{transform:scale(.97);box-shadow:none}
.kit-btn svg{transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
.kit-btn:not(.kit-btn-ghost):hover svg{transform:rotate(-8deg) scale(1.1)}
.kit-btn-done svg{animation:kit-pop .45s ease}
.kit-btn-ghost{background:#f3f4f6;color:#404040;width:42px;padding:0}
.dark .kit-btn-ghost{background:#262626;color:#e5e5e5}
.kit-btn-sm{height:34px;padding:0 12px;font-size:13px}
.kit-item{display:flex;width:100%;align-items:flex-start;gap:12px;text-align:left;padding:12px 14px;border-radius:16px;background:#f7f7f8;transition:background .2s,transform .12s}
.dark .kit-item{background:rgba(38,38,38,.6)}
.kit-item:hover{background:#eef1fe}
.dark .kit-item:hover{background:rgba(51,94,247,.14)}
.kit-item:active{transform:scale(.99)}
.kit-box{margin-top:1px;display:flex;height:22px;width:22px;flex-shrink:0;align-items:center;justify-content:center;border-radius:7px;border:2px solid #d4d4d8;background:#fff;color:#fff;transition:background .2s,border-color .2s,transform .2s}
.dark .kit-box{border-color:#525252;background:#171717}
.kit-item-text{font-size:14px;line-height:1.45;color:#262626;transition:color .2s}
.dark .kit-item-text{color:#e5e5e5}
.kit-item-on .kit-box{background:#22c55e;border-color:#22c55e;animation:kit-check .3s ease}
.kit-item-on .kit-item-text{color:#a3a3a3;text-decoration:line-through;text-decoration-color:rgba(163,163,163,.6)}
.dark .kit-item-on .kit-item-text{color:#737373}
.kit-item-static .kit-box{animation:none}
@keyframes kit-check{0%{transform:scale(.6)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
.kit-tile{display:flex;align-items:center;gap:10px;padding:10px;border-radius:18px;background:var(--color-card);border:1px solid #eeeeef;transition:transform .15s,box-shadow .2s,border-color .2s}
.dark .kit-tile{background:#171717;border-color:#262626}
.kit-tile:hover{transform:translateY(-2px);box-shadow:0 8px 24px -12px rgba(0,0,0,.25);border-color:transparent}
.kit-tile-logo{display:flex;height:44px;width:44px;flex-shrink:0;align-items:center;justify-content:center;border-radius:13px;background:#fff;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.kit-fraud[open] .kit-fraud-card{animation:kit-rise .4s ease both}
.kit-ill{position:relative;overflow:hidden;border-radius:28px;background:#e9edf7;isolation:isolate;transform:translateZ(0);-webkit-mask-image:-webkit-radial-gradient(white,black);mask-image:radial-gradient(white,black)}
.dark .kit-ill{background:#15182a}
.kit-ill::before{content:"";position:absolute;inset:-30px;background-image:var(--blur-wide);background-size:cover;background-position:center;filter:blur(20px);transition:opacity .6s ease}
@media (min-width:768px){.kit-ill::before{background-image:var(--blur-square)}}
.kit-ill img{position:relative;border-radius:28px;opacity:0;transition:opacity .5s ease}
.kit-ill-loaded img{opacity:1}
.kit-ill-loaded::before{opacity:0}
.kit-eye g{transform-box:fill-box;transform-origin:center}
.kit-eye-closed{transition:opacity .2s ease,transform .25s ease}
.kit-eye-open{opacity:0;transform:scaleY(.1);transition:opacity .25s ease .08s,transform .35s cubic-bezier(.3,1.5,.5,1) .08s}
.kit-eye-pupil{fill:currentColor;transform-box:fill-box;transform-origin:center;transform:scale(0);transition:transform .3s ease .25s}
.kit-fraud[open] .kit-eye-closed{opacity:0;transform:translateY(-2px) scaleY(.4)}
.kit-fraud[open] .kit-eye-open{opacity:1;transform:scaleY(1)}
.kit-fraud[open] .kit-eye-pupil{transform:scale(1)}
.kit-fraud:not([open]) summary:hover .kit-eye-closed{transform:translateY(-1px)}
@keyframes kit-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.kit-a1{background:linear-gradient(135deg,#335ef7 0%,#5b7cff 100%);transition:transform .15s,box-shadow .2s}
.kit-a1:hover{transform:translateY(-2px);box-shadow:0 12px 30px -14px rgba(51,94,247,.7)}
.kit-hub{position:relative;display:flex;min-height:300px;flex-direction:column;overflow:hidden;border-radius:28px;padding:24px;background:radial-gradient(120% 90% at 15% 0%,#4b6fff 0%,#2846c9 50%,#132a8a 100%);transition:transform .2s,box-shadow .2s}
.kit-hub-b{background:radial-gradient(120% 90% at 15% 0%,#2a2f45 0%,#141826 55%,#05070f 100%)}
.kit-hub:hover{transform:translateY(-3px);box-shadow:0 20px 40px -20px rgba(19,42,138,.8)}
.kit-hub::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.08);transition:transform .4s}
.kit-hub:hover::after{transform:scale(1.15)}
.kit-hub-icon{display:flex;height:56px;width:56px;align-items:center;justify-content:center;border-radius:18px;background:rgba(255,255,255,.14);color:#fff}
.kit-cv{background:radial-gradient(120% 120% at 0% 0%,#4b6fff 0%,#2846c9 45%,#132a8a 100%)}
.kit-cv-glow{position:absolute;right:-80px;top:-80px;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.1)}
.kit-cv-cv{position:relative;padding:2px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.45);font-size:11px;font-weight:700;letter-spacing:.04em;color:rgba(255,255,255,.75)}
.kit-cv-cv::after{content:"";position:absolute;left:-3px;right:-3px;top:50%;height:2px;background:#fff;transform:rotate(-14deg)}
.kit-cv-tag{font-size:13px;font-weight:500;color:#fff;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);animation:kit-rise .4s ease both}
.kit-cv-btn{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 22px;border-radius:999px;background:#fff;color:#1b2f8f;font-size:15px;font-weight:700;transition:transform .15s,box-shadow .2s;white-space:nowrap}
.kit-cv-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -10px rgba(0,0,0,.45)}
.kit-cv-ava{background-size:cover;background-position:center;box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.kit-cv-summary:hover .kit-cv-ava{transform:scale(1.05)}
.kit-cv-ava{transition:transform .2s}
.kit-cv-light{background:var(--color-card,#fff)}
.dark .kit-cv-light{background:#171717}
.kit-cv-wrap-light{box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px -18px rgba(19,42,138,.25);border:1px solid #eceef3}
.dark .kit-cv-wrap-light{border-color:#262626;box-shadow:none}
.kit-cv-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.3,.7,.2,1)}
.kit-cv-panel-open{grid-template-rows:1fr}
.kit-cv-panel .kit-cv-demo{opacity:0;transform:translateY(-12px);transition:opacity .4s ease,transform .5s cubic-bezier(.3,.7,.2,1)}
.kit-cv-panel-open .kit-cv-demo{opacity:1;transform:none}
.kit-demo a{pointer-events:none;cursor:default}
.kit-demo [data-ext-open]{display:none!important}
.kit-demo-static,.kit-demo-static *{pointer-events:none!important}
.kit-cv-light .kit-cv-glow{background:radial-gradient(circle,rgba(51,94,247,.12),rgba(51,94,247,0) 70%)}
.kit-cv-light .kit-cv-cv{border-color:#d4d4d8;color:#a1a1aa}
.kit-cv-light .kit-cv-cv::after{background:#ef4444}
.kit-cv-light .kit-cv-tag{color:#2846c9;background:#eef1fe;border-color:#dfe5fd}
.dark .kit-cv-light .kit-cv-tag{color:#c7d2fe;background:rgba(51,94,247,.16);border-color:rgba(51,94,247,.25)}
.kit-cv-light .kit-cv-btn{background:var(--color-accent);color:#fff}
.kit-cv-light .kit-cv-btn:hover{box-shadow:0 10px 24px -10px rgba(51,94,247,.7)}
.kit-cv-light .kit-cv-ava{box-shadow:0 0 0 2px #fff,0 0 0 4px #dfe5fd}
.dark .kit-cv-light .kit-cv-ava{box-shadow:0 0 0 2px #171717,0 0 0 4px rgba(51,94,247,.35)}
.kit-cv-demo{background:#fafafa}
.dark .kit-cv-demo{background:#0a0a0a}
@media (prefers-reduced-motion: reduce){.kit-confetti{display:none}.kit-eye g,.kit-eye-pupil{transition:none!important}.kit-cv-panel,.kit-cv-panel .kit-cv-demo{transition:none!important}.kit-ring-done,.kit-btn-done svg,.kit-item-on .kit-box,.kit-fraud[open] .kit-fraud-card{animation:none}}
`;

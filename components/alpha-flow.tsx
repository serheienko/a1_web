"use client";

// components/alpha-flow.tsx
//
// Alpha search, the working part (test environment, 2026-10-07):
// first message -> clarifying questions without a fixed limit ("Питання 2", answer
// chips, own answer, skip, "enough, search") -> portrait card -> results
// with "why it fits"; without Premium 3 results are open, the rest blurred
// behind the buy button. The brain behind /api/alpha/turn is rule-based for
// now and becomes AI later without changing this window.

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/components/t";
import type { AlphaMatch, AlphaPortrait, AlphaQuestion, AlphaSlot, AlphaTurnResponse } from "@/lib/alpha/types";

type L = "uk" | "en" | "ru";
const PORTRAIT_KEY = "a1.alpha.portrait";

const S = {
  question: { uk: "Питання", en: "Question", ru: "Вопрос" },
  understood2: { uk: "розуміє тебе на {n}%", en: "understands you {n}%", ru: "понимает тебя на {n}%" },
  of: { uk: "з", en: "of", ru: "из" },
  skip: { uk: "Пропустити", en: "Skip", ru: "Пропустить" },
  enough: { uk: "Досить, шукай", en: "That's enough, search", ru: "Хватит, ищи" },
  own: { uk: "Свій варіант…", en: "Your own answer…", ru: "Свой вариант…" },
  send: { uk: "Надіслати", en: "Send", ru: "Отправить" },
  thinking: { uk: "Alpha думає…", en: "Alpha is thinking…", ru: "Alpha думает…" },
  understood: { uk: "Все вірно?", en: "All correct?", ru: "Всё верно?" },
  search: { uk: "Шукати", en: "Search", ru: "Искать" },
  restart: { uk: "Почати спочатку", en: "Start over", ru: "Начать сначала" },
  searching: { uk: "Alpha переглядає вакансії…", en: "Alpha is going through the posts…", ru: "Alpha просматривает вакансии…" },
  found: { uk: "Найкращі збіги", en: "Best matches", ru: "Лучшие совпадения" },
  scanned: { uk: "переглянуто", en: "checked", ru: "просмотрено" },
  none: {
    uk: "Поки нічого не підходить достатньо добре. Спробуй послабити умови — або Alpha надішле, щойно з'явиться.",
    en: "Nothing fits well enough yet. Try loosening something — or Alpha will send it as soon as it appears.",
    ru: "Пока ничего не подходит достаточно хорошо. Попробуй ослабить условия — или Alpha пришлёт, как только появится.",
  },
  more: { uk: "Ще {n} збігів — у Premium", en: "{n} more matches — in Premium", ru: "Ещё {n} совпадений — в Premium" },
  unlock: { uk: "Відкрити всі", en: "Unlock all", ru: "Открыть все" },
  failed: { uk: "Щось пішло не так. Спробуй ще раз.", en: "Something went wrong. Try again.", ru: "Что-то пошло не так. Попробуй ещё раз." },
  // portrait labels
  pRole: { uk: "Шукаю", en: "Looking for", ru: "Ищу" },
  pJob: { uk: "роботу", en: "a job", ru: "работу" },
  pPeople: { uk: "людей у команду", en: "people", ru: "людей в команду" },
  pStack: { uk: "Роль / стек", en: "Role / stack", ru: "Роль / стек" },
  pLevel: { uk: "Рівень", en: "Level", ru: "Уровень" },
  pFormat: { uk: "Формат", en: "Format", ru: "Формат" },
  pMoney: { uk: "Гроші", en: "Money", ru: "Деньги" },
  pNo: { uk: "Точно ні", en: "Definitely not", ru: "Точно нет" },
  pWish: { uk: "Побажання", en: "Wishes", ru: "Пожелания" },
  any: { uk: "не важливо", en: "doesn't matter", ru: "не важно" },
};
const NO_LABEL: Record<string, Record<L, string>> = {
  gambling: { uk: "гемблінг", en: "gambling", ru: "гемблинг" },
  outstaff: { uk: "аутстаф", en: "outstaff", ru: "аутстаф" },
  crypto: { uk: "крипта", en: "crypto", ru: "крипта" },
  calls: { uk: "багато дзвінків", en: "lots of calls", ru: "много звонков" },
};
const FORMAT_LABEL: Record<string, Record<L, string>> = {
  remote: { uk: "віддалено", en: "remote", ru: "удалённо" },
  office: { uk: "офіс", en: "office", ru: "офис" },
  hybrid: { uk: "гібрид", en: "hybrid", ru: "гибрид" },
  any: { uk: "будь-який", en: "any", ru: "любой" },
};

type Msg = { from: "me" | "alpha"; text: string };
type Phase = "asking" | "portrait" | "searching" | "results" | "error";

export function AlphaFlow({
  initial,
  lang,
  onUnlock,
}: {
  initial: string;
  lang: Locale;
  onUnlock: () => void;
}) {
  const l: L = lang === "uk" || lang === "ru" ? lang : "en";
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "me", text: initial }]);
  const [portrait, setPortrait] = useState<AlphaPortrait | null>(null);
  const [question, setQuestion] = useState<AlphaQuestion | null>(null);
  const [asked, setAsked] = useState<AlphaSlot[]>([]);
  const [step, setStep] = useState(1);
  const [understood, setUnderstood] = useState(0);
  const [busy, setBusy] = useState(true);
  const [phase, setPhase] = useState<Phase>("asking");
  const [own, setOwn] = useState("");
  const [matches, setMatches] = useState<AlphaMatch[]>([]);
  const [scanned, setScanned] = useState(0);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  async function turn(message: string, answering: AlphaSlot | null, prevPortrait: AlphaPortrait | null, prevAsked: AlphaSlot[], history: Msg[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/alpha/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: l, portrait: prevPortrait, message, answering, asked: prevAsked, history }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as AlphaTurnResponse;
      const nextAsked = answering ? [...prevAsked, answering] : prevAsked;
      setPortrait(data.portrait);
      setAsked(nextAsked);
      setStep(data.step);
      setUnderstood(data.understood);
      if (data.question) {
        setQuestion(data.question);
        setMsgs((m) => [...m, { from: "alpha", text: data.question!.text }]);
      } else {
        setQuestion(null);
        setPhase("portrait");
      }
    } catch {
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void turn(initial, null, null, [], [{ from: "me", text: initial }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const answer = (value: string, label: string) => {
    if (!question || busy) return;
    const history: Msg[] = [...msgs, { from: "me", text: label }];
    setMsgs(history);
    setOwn("");
    void turn(value, question.slot, portrait, asked, history);
  };

  const search = async (p: AlphaPortrait | null) => {
    if (!p) return;
    setPhase("searching");
    try {
      localStorage.setItem(PORTRAIT_KEY, JSON.stringify(p));
    } catch {}
    try {
      const res = await fetch("/api/alpha/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portrait: p, lang: l }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setMatches(data.matches ?? []);
      setScanned(data.scanned ?? 0);
      setPhase("results");
    } catch {
      setPhase("error");
    }
  };

  const restart = () => {
    setMsgs([{ from: "me", text: initial }]);
    setPortrait(null);
    setAsked([]);
    setQuestion(null);
    setPhase("asking");
    setMatches([]);
    void turn(initial, null, null, [], [{ from: "me", text: initial }]);
  };

  // ---------- render ----------

  if (phase === "error") {
    return (
      <div className="py-6 text-center">
        <p className="text-[15px] text-[#6b6b78] dark:text-[#a9a9b8]">{S.failed[l]}</p>
        <button type="button" onClick={restart} className="mt-3 rounded-full bg-[#335ef7]/10 px-4 py-2 text-sm font-semibold text-[#335ef7] dark:text-[#9fb2ff]">
          {S.restart[l]}
        </button>
      </div>
    );
  }

  if (phase === "portrait" && portrait) return <PortraitCard p={portrait} l={l} onSearch={() => search(portrait)} onRestart={restart} />;

  if (phase === "searching") {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div className="alpha-flow h-full w-1/2 animate-[alphaScan_1.2s_ease-in-out_infinite] rounded-full" />
        </div>
        <style>{`@keyframes alphaScan{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
        <p className="text-[15px] text-[#6b6b78] dark:text-[#a9a9b8]">{S.searching[l]}</p>
      </div>
    );
  }

  if (phase === "results") {
    const open = matches.filter((m) => !m.locked);
    const locked = matches.filter((m) => m.locked);
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[19px] font-bold tracking-[-0.01em]">{S.found[l]}</h3>
          <span className="text-[12px] text-[#8e8e93]">
            {S.scanned[l]}: {scanned}
          </span>
        </div>
        {matches.length === 0 && <p className="mt-3 text-[15px] text-[#6b6b78] dark:text-[#a9a9b8]">{S.none[l]}</p>}
        <div className="mt-3 flex flex-col gap-2.5">
          {open.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
          {locked.length > 0 && (
            <div className="relative">
              <div className="pointer-events-none flex select-none flex-col gap-2.5 blur-[6px]" aria-hidden>
                {locked.slice(0, 3).map((m) => (
                  <MatchCard key={m.id} m={m} />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-[16px] bg-white/40 dark:bg-[#232330]/40">
                <div className="text-[16px] font-bold">{S.more[l].replace("{n}", String(locked.length))}</div>
                <button type="button" onClick={onUnlock} className="alpha-flow rounded-full px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(90,80,255,0.35)]">
                  {S.unlock[l]}
                </button>
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={restart} className="mt-3 text-[13px] font-medium text-[#8e8e93] hover:text-[#335ef7]">
          ↺ {S.restart[l]}
        </button>
      </div>
    );
  }

  // asking
  return (
    <div className="sm:max-w-[720px]">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#6a4dff] dark:text-[#b7a6ff]">
        <span>
          {S.question[l]} {step}
        </span>
        {/* 07.10.2026: вопросов больше не фиксированное число -- вместо «X з Y»
            показываем, насколько Alpha уже поняла запрос. */}
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
          <span className="alpha-flow block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(8, understood)}%` }} />
        </span>
        <span className="font-medium opacity-80">{S.understood2[l].replace("{n}", String(understood))}</span>
      </div>
      <div ref={chatRef} className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
        {msgs.map((m, i) =>
          m.from === "me" ? (
            <div key={i} className="max-w-[85%] self-end rounded-[16px] rounded-br-[6px] bg-[#335ef7] px-3.5 py-2 text-[15px] text-white">
              {m.text}
            </div>
          ) : (
            <div key={i} className="max-w-[85%] self-start rounded-[16px] rounded-bl-[6px] bg-black/[0.05] px-3.5 py-2 text-[15px] dark:bg-white/[0.08]">
              {m.text}
            </div>
          ),
        )}
        {busy && <div className="self-start rounded-[16px] bg-black/[0.05] px-3.5 py-2 text-[14px] text-[#8e8e93] dark:bg-white/[0.08]">{S.thinking[l]}</div>}
      </div>

      {question && !busy && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {question.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => answer(o.value, o.label)}
                className="rounded-full border border-[#335ef7]/30 px-3.5 py-1.5 text-[14px] font-medium text-[#335ef7] transition hover:bg-[#335ef7] hover:text-white dark:border-[#7f8cff]/40 dark:text-[#b4c0ff] dark:hover:bg-[#5a4dff] dark:hover:text-white"
              >
                {o.label}
              </button>
            ))}
          </div>
          {question.allowFree && (
            <form
              className="mt-2.5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (own.trim()) answer(own.trim(), own.trim());
              }}
            >
              <input
                value={own}
                onChange={(e) => setOwn(e.target.value)}
                placeholder={S.own[l]}
                className="min-w-0 flex-1 rounded-full border border-black/10 bg-transparent px-4 py-2 outline-none focus:border-[#335ef7] dark:border-white/15"
              />
              <button type="submit" className="rounded-full bg-[#335ef7] px-4 text-[14px] font-semibold text-white disabled:opacity-40" disabled={!own.trim()}>
                {S.send[l]}
              </button>
            </form>
          )}
          <div className="mt-2.5 flex gap-4 text-[13px] font-medium">
            <button type="button" onClick={() => answer("__skip", S.skip[l])} className="text-[#8e8e93] hover:text-[#3a3a3c] dark:hover:text-white">
              {S.skip[l]}
            </button>
            <button type="button" onClick={() => setPhase("portrait")} className="text-[#335ef7] hover:underline dark:text-[#9fb2ff]">
              {S.enough[l]} →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function PortraitCard({ p, l, onSearch, onRestart }: { p: AlphaPortrait; l: L; onSearch: () => void; onRestart: () => void }) {
    const rows: [string, string | null][] = [
      [S.pRole[l], p.role === "hiring" ? S.pPeople[l] : p.role === "seeking" ? S.pJob[l] : null],
      [S.pStack[l], p.stack.length ? p.stack.join(", ") : null],
      [S.pLevel[l], p.level ? p.level.charAt(0).toUpperCase() + p.level.slice(1) : null],
      [S.pFormat[l], p.format ? (FORMAT_LABEL[p.format]?.[l] ?? p.format) : null],
      [S.pMoney[l], p.money != null ? `${p.role === "hiring" ? "≤" : "≥"} $${p.money.toLocaleString("en-US")}` : null],
      [S.pNo[l], p.dealbreakers.length ? p.dealbreakers.map((d) => NO_LABEL[d]?.[l] ?? d).join(", ") : null],
      [S.pWish[l], p.wishes.length ? p.wishes.join(" · ") : null],
    ];
    return (
      <div className="rounded-[20px] border border-[#335ef7]/20 bg-[#335ef7]/[0.04] p-4 sm:max-w-[640px] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-[17px] font-bold">{S.understood[l]}</div>
        <dl className="mt-2.5 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[14px]">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[#8e8e93]">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
        </dl>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={onSearch} className="alpha-flow rounded-full px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(90,80,255,0.35)]">
            {S.search[l]} →
          </button>
          <button type="button" onClick={onRestart} className="text-[13px] font-medium text-[#8e8e93] hover:text-[#335ef7]">
            {S.restart[l]}
          </button>
        </div>
      </div>
    );
  }
}

function MatchCard({ m }: { m: AlphaMatch }) {
  const body = (
    <div className="flex items-start gap-3 rounded-[16px] border border-black/[0.07] p-3 transition hover:border-[#335ef7]/40 dark:border-white/10">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{m.title}</div>
        <div className="mt-0.5 truncate text-[13px] text-[#6b6b78] dark:text-[#a9a9b8]">
          {[m.company, m.salary].filter(Boolean).join(" · ")}
        </div>
        {m.reasons.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.reasons.map((r) => (
              <span key={r} className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[12px] text-[#5b5b68] dark:bg-white/[0.07] dark:text-[#c0c0cc]">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="alpha-flow shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold text-white">{m.score}%</div>
    </div>
  );
  return m.slug ? (
    <a href={m.slug} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    body
  );
}

"use client";

// app/invite/invite-client.tsx -- экран «Отримай Alpha».
//
// 18.10.2026 (Александр: «скучная, сделай как /first250: летят подарки, стеклянные карточки, переливающиеся
// кнопки; на шкале прямо напиши: 1 друг = 1 месяц; условие про заполненный профиль убери; длинные тире убери»).
// Вид тот же, что у /first250: переливающийся фон, подарки летят вверх из-под стеклянных карточек, кнопка с
// бегущим градиентом (классы f250-* в app/globals.css).
// Условие теперь одно: друг зарегистрировался по ссылке и прошёл 48 часов (защита от фейков).
// Язык: украинский для uk/ru, для остальных английский (как /first250).

import { useCallback, useEffect, useState } from "react";
import { InlineAuthForm } from "@/components/inline-auth-form";
import { useActiveLocale } from "@/lib/use-active-locale";

type Step = { friends: number; months: number };
type Row = { name: string; counted: boolean; joinedAt: string };
type Data = {
  ok: true;
  code: string;
  link: string;
  ladder: Step[];
  friendDays: number;
  holdHours: number;
  progress: {
    counts: { counted: number; pending: number };
    monthsEarned: number;
    stepReached: number;
    next: { friends: number; months: number; left: number } | null;
  };
  invited: Row[];
};

const DEFAULT_LADDER: Step[] = [
  { friends: 1, months: 1 },
  { friends: 3, months: 3 },
  { friends: 7, months: 6 },
  { friends: 15, months: 12 },
  { friends: 30, months: 24 },
];

function ukPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const TXT = {
  uk: {
    title: "Отримай Alpha",
    sub: (d: number) => `Запрошуй друзів в A1 і отримуй Alpha безкоштовно. Друг теж отримає ${d} днів Alpha в подарунок 🎁`,
    yourLink: "Твоє посилання",
    share: "🎁 Поділитися з другом",
    copy: "Копіювати",
    copied: "Скопійовано ✓",
    ladderTitle: "Скільки друзів, стільки подарунків",
    scaleHint: "У кружечку: скільки друзів. Під ним: скільки місяців Alpha ти отримаєш.",
    friends: (n: number) => `${n} ${ukPlural(n, "друг", "друга", "друзів")}`,
    months: (n: number) => `${n} ${ukPlural(n, "місяць", "місяці", "місяців")}`,
    mo: "міс.",
    rule: (f: number, m: number) => `Запроси ${f} ${ukPlural(f, "друга", "друзів", "друзів")} і отримай ${m} ${ukPlural(m, "місяць", "місяці", "місяців")} Alpha`,
    total: "Разом",
    earned: (m: string) => `Вже зароблено: ${m} Alpha 🎉`,
    none: "Поки що 0. Запроси першого друга, і це вже місяць Alpha!",
    toNext: (left: number, f: number, m: string) => `Ще ${left} ${ukPlural(left, "друг", "друга", "друзів")} до ${f}, і будуть ${m} Alpha`,
    top: "Це максимум 🎉 Далі партнерська програма з виплатами. Напиши нам.",
    counted: (n: number) => `Зараховано ${n} ${ukPlural(n, "друг", "друга", "друзів")}`,
    invited: "Твої друзі",
    noInvited: "Поки нікого. Надішли посилання, і друзі зʼявляться тут.",
    stJoined: "Чекає 48 годин",
    stCounted: "Зараховано ✓",
    howTitle: "Як це працює",
    how: (h: number, d: number) => [
      "Друг відкриває твоє посилання і реєструється в A1.",
      `Через ${h} години він зараховується. Так ми відсіюємо фейкові реєстрації.`,
      "Місяці Alpha накопичуються на твоєму акаунті й увімкнуться самі, щойно ми запустимо Alpha.",
      `Друг теж отримує ${d} днів Alpha в подарунок.`,
    ],
    fine: "Свій акаунт запросити не можна, один друг має одного запрошувача. Фейкові реєстрації не зараховуються.",
    signInTitle: "Увійди, щоб отримати своє посилання",
    err: "Щось пішло не так. Спробуй ще раз за хвилину.",
    loading: "Завантаження…",
    notEligible: "Для цього акаунта програма недоступна.",
    shareText: "Приєднуйся до A1 і отримай Alpha на 14 днів",
  },
  en: {
    title: "Get Alpha",
    sub: (d: number) => `Invite friends to A1 and get Alpha for free. Your friend gets ${d} days of Alpha as a gift too 🎁`,
    yourLink: "Your link",
    share: "🎁 Share with a friend",
    copy: "Copy",
    copied: "Copied ✓",
    ladderTitle: "More friends, more gifts",
    scaleHint: "In the circle: how many friends. Below it: how many months of Alpha you get.",
    friends: (n: number) => `${n} ${n === 1 ? "friend" : "friends"}`,
    months: (n: number) => `${n} ${n === 1 ? "month" : "months"}`,
    mo: "mo",
    rule: (f: number, m: number) => `Invite ${f} ${f === 1 ? "friend" : "friends"} and get ${m} ${m === 1 ? "month" : "months"} of Alpha`,
    total: "Total",
    earned: (m: string) => `Earned so far: ${m} of Alpha 🎉`,
    none: "Nothing yet. Invite your first friend and that's already a month of Alpha!",
    toNext: (left: number, f: number, m: string) => `${left} more ${left === 1 ? "friend" : "friends"} to reach ${f}, and you'll have ${m} of Alpha`,
    top: "That's the top 🎉 Next is the partner programme with payouts. Write to us.",
    counted: (n: number) => `${n} ${n === 1 ? "friend" : "friends"} counted`,
    invited: "Your friends",
    noInvited: "Nobody yet. Send your link and your friends will show up here.",
    stJoined: "Waiting 48 hours",
    stCounted: "Counted ✓",
    howTitle: "How it works",
    how: (h: number, d: number) => [
      "A friend opens your link and signs up to A1.",
      `After ${h} hours they count. This is how we filter out fake sign-ups.`,
      "Alpha months pile up on your account and switch on by themselves once Alpha launches.",
      `Your friend gets ${d} days of Alpha as a gift too.`,
    ],
    fine: "You can't invite your own account, and one friend has one inviter. Fake sign-ups don't count.",
    signInTitle: "Sign in to get your link",
    err: "Something went wrong. Please try again in a minute.",
    loading: "Loading…",
    notEligible: "The programme isn't available for this account.",
    shareText: "Join A1 and get 14 days of Alpha",
  },
};

const FLOATS = ["🎁", "✨", "💙", "🎁", "🎉", "⭐", "🎁", "🚀", "💎", "🎁"];

const GLASS =
  "rounded-3xl border border-white/70 bg-white/80 shadow-lg shadow-indigo-500/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]";

export function InviteClient() {
  const locale = useActiveLocale();
  const t = locale === "uk" || locale === "ru" ? TXT.uk : TXT.en;
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "anon" | "ok" | "err" | "na">("loading");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/referral", { cache: "no-store" });
      if (r.status === 401) return setState("anon");
      if (r.status === 403) return setState("na");
      const j = (await r.json()) as Data | { ok: false };
      if (j.ok) {
        setData(j);
        setState("ok");
      } else setState("err");
    } catch {
      setState("err");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const link = data?.link ?? "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ничего */
    }
  };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "A1", text: t.shareText, url: link });
        return;
      }
    } catch {
      /* отменили, копируем */
    }
    await copy();
  };

  const steps = data?.ladder?.length ? data.ladder : DEFAULT_LADDER;
  const counted = data?.progress.counts.counted ?? 0;
  const reached = data?.progress.stepReached ?? -1;
  const earned = data?.progress.monthsEarned ?? 0;
  const next = data?.progress.next ?? null;
  const friendDays = data?.friendDays ?? 14;
  const holdHours = data?.holdHours ?? 48;

  // Ступени стоят на полосе равными промежутками (иначе «1» и «3» слипаются на телефоне);
  // заливка идёт плавно между соседними ступенями по числу друзей в зачёте.
  const posOf = (i: number) => ((i + 1) / steps.length) * 100;
  const filled = (() => {
    let prev = 0;
    for (let i = 0; i < steps.length; i++) {
      const cur = steps[i]?.friends ?? 0;
      if (counted < cur) {
        const part = (counted - prev) / Math.max(1, cur - prev);
        const from = i === 0 ? 0 : posOf(i - 1);
        return Math.round(from + part * (posOf(i) - from));
      }
      prev = cur;
    }
    return 100;
  })();

  return (
    <main className="f250 relative isolate -mb-16 overflow-hidden pb-24">
      {/* фон: переливающийся градиент и подарки, которые летят вверх из-под стеклянных карточек */}
      <div aria-hidden="true" className="f250-bg absolute inset-0 -z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {FLOATS.map((e, i) => (
          <span key={i} className="f250-float absolute select-none text-3xl sm:text-4xl" style={{ left: `${4 + i * 10}%`, animationDelay: `${i * 1.1}s`, animationDuration: `${10 + (i % 4) * 2}s` }}>
            {e}
          </span>
        ))}
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pt-8 sm:pt-12">
        <div className="f250-pop inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.07] dark:text-indigo-300">
          <span aria-hidden="true">🎁</span> Alpha
        </div>
        <h1 className="f250-title mt-3 text-4xl font-black leading-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-700 dark:text-neutral-200">{t.sub(friendDays)}</p>

        {state === "loading" && <p className="mt-8 text-sm text-neutral-500">{t.loading}</p>}
        {state === "err" && <p className="mt-8 text-sm text-red-600">{t.err}</p>}
        {state === "na" && <p className="mt-8 text-sm text-neutral-500">{t.notEligible}</p>}

        {state === "anon" && (
          <section className={`${GLASS} f250-step mt-8 p-5`}>
            <h2 className="mb-3 text-lg font-bold text-neutral-900 dark:text-white">{t.signInTitle}</h2>
            <InlineAuthForm lang={locale} compact returnTo="/invite" />
          </section>
        )}

        {state === "ok" && data && (
          <section className={`${GLASS} f250-step mt-8 p-5 sm:p-6`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t.yourLink}</div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2.5 ring-1 ring-indigo-200/60 dark:bg-white/10 dark:ring-white/10">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-900 dark:text-neutral-100">{link.replace(/^https?:\/\/(jobs\.)?/, "")}</span>
              <button type="button" onClick={copy} className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold text-indigo-600 transition hover:bg-indigo-500/10 dark:text-indigo-300">
                {copied ? t.copied : t.copy}
              </button>
            </div>
            <button type="button" onClick={share} className="f250-cta mt-3 w-full rounded-2xl px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/30 transition active:scale-[0.98]">
              {t.share}
            </button>
          </section>
        )}

        {/* Шкала: прямо на ней написано «сколько друзей = сколько месяцев» */}
        <section className={`${GLASS} f250-step mt-6 p-5 sm:p-6`} style={{ animationDelay: "120ms" }}>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{t.ladderTitle}</h2>
          </div>

          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{t.scaleHint}</p>
          <div className="mx-4 mt-6">
            <div className="relative h-3 rounded-full bg-neutral-200/80 dark:bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps[steps.length - 1]?.friends ?? 30} aria-valuenow={counted}>
              <div className="f250-bar h-full rounded-full transition-all duration-700" style={{ width: `${state === "ok" ? Math.max(filled, counted > 0 ? 4 : 0) : 0}%` }} />
              {steps.map((s, i) => {
                const done = i <= reached;
                return (
                  <span
                    key={s.friends}
                    className={"absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-black text-white ring-2 ring-white dark:ring-neutral-900 " + (done ? "f250-pop bg-emerald-500" : "f250-num")}
                    style={{ left: `${posOf(i)}%` }}
                  >
                    {s.friends}
                  </span>
                );
              })}
            </div>
            <div className="relative mt-5 h-9">
              {steps.map((s, i) => (
                <span key={s.friends} className={"absolute -translate-x-1/2 whitespace-nowrap text-center text-xs font-bold leading-tight " + (i <= reached ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 dark:text-neutral-100")} style={{ left: `${posOf(i)}%` }}>
                  {s.months} {t.mo}
                </span>
              ))}
            </div>
          </div>

          {state === "ok" && (
            <div className="mt-4 rounded-2xl bg-indigo-500/10 px-4 py-3 text-sm dark:bg-indigo-400/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{t.counted(counted)}</p>
              <p className="mt-1 font-bold text-neutral-900 dark:text-white">{earned > 0 ? t.earned(t.months(earned)) : t.none}</p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-200">{next ? t.toNext(next.left, next.friends, t.months(next.months)) : t.top}</p>
            </div>
          )}

          <ul className="mt-5 space-y-2">
            {steps.map((s, i) => {
              const done = i <= reached;
              const isNext = state === "ok" && i === reached + 1;
              return (
                <li key={s.friends} className={"flex items-center gap-3 rounded-2xl px-3 py-2.5 " + (done ? "bg-emerald-500/10" : isNext ? "bg-white/90 ring-2 ring-indigo-400/60 dark:bg-white/10" : "bg-white/50 dark:bg-white/[0.04]")}>
                  <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black text-white " + (done ? "bg-emerald-500" : "f250-num")}>{done ? "✓" : s.friends}</span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{t.rule(s.friends, s.months)}</span>
                  <span className="shrink-0 text-xs font-bold text-neutral-500 dark:text-neutral-400">{t.total} {s.months} {t.mo}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {state === "ok" && data && (
          <section className={`${GLASS} f250-step mt-6 p-5 sm:p-6`} style={{ animationDelay: "220ms" }}>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{t.invited}</h2>
            {data.invited.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{t.noInvited}</p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200/70 dark:divide-white/10">
                {data.invited.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</span>
                    <span className={"shrink-0 text-xs font-bold " + (r.counted ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500")}>{r.counted ? t.stCounted : t.stJoined}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={`${GLASS} f250-step mt-6 p-5 sm:p-6`} style={{ animationDelay: "320ms" }}>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{t.howTitle}</h2>
          <ol className="mt-3 space-y-2.5">
            {t.how(holdHours, friendDays).map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-neutral-800 dark:text-neutral-200">
                <span className="f250-num grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white">{i + 1}</span>
                <span className="pt-px">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">{t.fine}</p>
        </section>
      </div>
    </main>
  );
}

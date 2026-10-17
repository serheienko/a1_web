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
  { friends: 3, months: 1 },
  { friends: 8, months: 3 },
  { friends: 10, months: 6 },
  { friends: 18, months: 12 },
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
    share: "🎁 Поділитися",
    copy: "Копіювати",
    copied: "Скопійовано ✓",
    alphaTitle: "Що таке A1 Alpha",
    alphaSub: "Клуб для тих, хто серйозно шукає роботу чи людей. Зазвичай Alpha платна, а тут її можна отримати безкоштовно.",
    perks: [
      { icon: "🔎", title: "Alpha Пошук", text: "Розкажи словами, що шукаєш, і ШІ підбере найкращі вакансії та пояснить, чому вони підходять саме тобі." },
      { icon: "🔔", title: "Нові збіги щодня", text: "Alpha запамʼятовує твій портрет і раз на день надсилає свіжі вакансії в окремий чат." },
      { icon: "✨", title: "Magic Post", text: "Опиши вакансію чи пост голосом або текстом, і Alpha сама заповнить усі поля." },
      { icon: "🫙", title: "Значок і бігуча стрічка", text: "Значок учасника клубу біля імені й твій власний рядок-думка, який бачать усі." },
    ],
    ladderTitle: "Скільки друзів, стільки подарунків",
    scaleHint: "У кружечку: скільки друзів. Під ним: місяців Alpha. Кружечок заповнюється, коли друг зараховується.",
    friends: (n: number) => `${n} ${ukPlural(n, "друг", "друга", "друзів")}`,
    months: (n: number) => `${n} ${ukPlural(n, "місяць", "місяці", "місяців")}`,
    mo: "міс.",
    rule: (f: number, m: number) => `Запроси ${f} ${ukPlural(f, "друга", "друзів", "друзів")} і отримай ${m} ${ukPlural(m, "місяць", "місяці", "місяців")} Alpha`,
    total: "Разом",
    friendRow: (d: number) => `Запрошені друзі отримають: ${d} днів Alpha в подарунок`,
    earned: (m: string) => `Вже зароблено: ${m} Alpha 🎉`,
    none: (f: number) => `Поки що 0. Запроси ${f} друзів, і це вже місяць Alpha!`,
    toNext: (left: number, f: number, m: string) => `Ще ${left} ${ukPlural(left, "друг", "друга", "друзів")} до ${f}, і будуть ${m} Alpha`,
    top: "Це максимум 🎉 Далі партнерська програма з виплатами. Напиши нам.",
    pin: (n: number) => `${n} ${ukPlural(n, "друг", "друга", "друзів")} 🎉`,
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
    alphaTitle: "What is A1 Alpha",
    alphaSub: "A club for people who are serious about finding a job or talent. Alpha is normally paid, and here you can get it for free.",
    perks: [
      { icon: "🔎", title: "Alpha Search", text: "Tell it in your own words what you want, and AI picks the best jobs and explains why they fit you." },
      { icon: "🔔", title: "New matches daily", text: "Alpha remembers your profile and sends fresh jobs to a separate chat once a day." },
      { icon: "✨", title: "Magic Post", text: "Describe a job or a post by voice or text, and Alpha fills in all the fields for you." },
      { icon: "🫙", title: "Badge and running line", text: "A club badge next to your name and your own one-line thought that everyone can see." },
    ],
    ladderTitle: "More friends, more gifts",
    scaleHint: "In the circle: friends. Below it: months of Alpha. A circle fills up once a friend counts.",
    friends: (n: number) => `${n} ${n === 1 ? "friend" : "friends"}`,
    months: (n: number) => `${n} ${n === 1 ? "month" : "months"}`,
    mo: "mo",
    rule: (f: number, m: number) => `Invite ${f} ${f === 1 ? "friend" : "friends"} and get ${m} ${m === 1 ? "month" : "months"} of Alpha`,
    total: "Total",
    friendRow: (d: number) => `Invited friends get: ${d} days of Alpha as a gift`,
    earned: (m: string) => `Earned so far: ${m} of Alpha 🎉`,
    none: (f: number) => `Nothing yet. Invite ${f} friends and that's already a month of Alpha!`,
    toNext: (left: number, f: number, m: string) => `${left} more ${left === 1 ? "friend" : "friends"} to reach ${f}, and you'll have ${m} of Alpha`,
    top: "That's the top 🎉 Next is the partner programme with payouts. Write to us.",
    pin: (n: number) => `${n} ${n === 1 ? "friend" : "friends"} 🎉`,
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


        {/* Что такое Alpha: блоки в ряд (на телефоне листаются пальцем) */}
        <section className="mt-8">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white">{t.alphaTitle}</h2>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{t.alphaSub}</p>
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {t.perks.map((k, i) => (
              <div key={k.title} className={`${GLASS} f250-step w-[214px] shrink-0 snap-start p-4`} style={{ animationDelay: `${i * 110}ms` }}>
                <span className="f250-num grid h-11 w-11 place-items-center rounded-2xl text-2xl shadow-md shadow-indigo-500/20" aria-hidden="true">{k.icon}</span>
                <h3 className="mt-3 text-base font-extrabold text-neutral-900 dark:text-white">{k.title}</h3>
                <p className="mt-1 text-sm leading-snug text-neutral-700 dark:text-neutral-300">{k.text}</p>
              </div>
            ))}
          </div>
        </section>

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
          <div className="mx-4 mt-2">
            <div className="relative mt-14 h-3 rounded-full bg-neutral-200/80 dark:bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps[steps.length - 1]?.friends ?? 20} aria-valuenow={counted}>
              {state === "ok" && counted > 0 && (
                <span className="absolute bottom-full mb-5 -translate-x-1/2 transition-all duration-700" style={{ left: `${Math.min(94, Math.max(6, filled))}%` }}>
                  <span className="f250-cta relative block whitespace-nowrap rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-md shadow-indigo-500/30">
                    {t.pin(counted)}
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-indigo-500" />
                  </span>
                </span>
              )}
              <div className="f250-bar h-full rounded-full transition-all duration-700" style={{ width: `${state === "ok" ? Math.max(filled, counted > 0 ? 4 : 0) : 0}%` }} />
              {steps.map((s, i) => {
                const done = i <= reached;
                return (
                  <span
                    key={s.friends}
                    className={"absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-black text-white ring-2 ring-white dark:ring-neutral-900 " + (done ? "f250-pop bg-emerald-500" : "bg-white !text-neutral-500 !ring-neutral-300 dark:bg-neutral-800 dark:!text-neutral-300 dark:!ring-neutral-600")}
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
              <p className="mt-1 font-bold text-neutral-900 dark:text-white">{earned > 0 ? t.earned(t.months(earned)) : t.none(steps[0]?.friends ?? 3)}</p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-200">{next ? t.toNext(next.left, next.friends, t.months(next.months)) : t.top}</p>
            </div>
          )}

          <ul className="mt-5 space-y-2">
            <li className="flex items-center gap-3 rounded-2xl bg-fuchsia-500/10 px-3 py-2.5 ring-1 ring-fuchsia-400/30">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-base">🎁</span>
              <span className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{t.friendRow(friendDays)}</span>
            </li>
            {steps.map((s, i) => {
              const done = i <= reached;
              const isNext = state === "ok" && i === reached + 1;
              return (
                <li key={s.friends} className={"flex items-center gap-3 rounded-2xl px-3 py-2.5 " + (done ? "bg-emerald-500/10" : isNext ? "bg-white/90 ring-2 ring-indigo-400/60 dark:bg-white/10" : "bg-white/50 dark:bg-white/[0.04]")}>
                  <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black text-white " + (done ? "bg-emerald-500" : "f250-num")}>{done ? "✓" : s.friends}</span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{t.rule(s.friends, s.months)}</span>
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

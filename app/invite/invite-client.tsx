"use client";

// app/invite/invite-client.tsx -- экран «Отримай Alpha».
//
// Что видит человек: его ссылка (Поділитися / Копіювати), прогресс по лестнице (1 · 3 · 7 · 15 · 30 друзів),
// сколько ещё нужно до следующей награды и список приглашённых со статусами. Гость видит те же условия
// и форму входа -- ссылка появится после входа.
// Язык: украинский для uk/ru, для остальных -- английский (как /first250).

import { useCallback, useEffect, useState } from "react";
import { InlineAuthForm } from "@/components/inline-auth-form";
import { useActiveLocale } from "@/lib/use-active-locale";

type Step = { friends: number; months: number; needLive: boolean };
type Row = { name: string; status: "joined" | "live"; counted: boolean; joinedAt: string };
type Data = {
  ok: true;
  code: string;
  link: string;
  ladder: Step[];
  friendDays: number;
  holdHours: number;
  maxMonths: number;
  progress: {
    counts: { counted: number; live: number; pending: number };
    monthsEarned: number;
    stepReached: number;
    next: { friends: number; months: number; needLive: boolean; left: number } | null;
  };
  invited: Row[];
};

const TXT = {
  uk: {
    title: "Отримай Alpha",
    sub: (d: number) => `Запрошуй друзів в A1 — і отримуй Alpha безкоштовно. Друг теж отримує ${d} днів Alpha у подарунок.`,
    yourLink: "Твоє посилання",
    share: "Поділитися",
    copy: "Копіювати",
    copied: "Скопійовано ✓",
    progress: "Твій прогрес",
    months: (n: number) => (n === 1 ? "1 місяць" : n >= 2 && n <= 4 ? `${n} місяці` : `${n} місяців`),
    earned: (m: string) => `Зароблено: ${m} Alpha`,
    none: "Поки що нічого — запроси першого друга",
    toNext: (left: number, friends: number, m: string, live: boolean) =>
      `Ще ${left} ${live ? "активних " : ""}${left === 1 ? "друг" : "друзів"} до ${friends}-го → разом ${m}`,
    top: "Максимум досягнуто 🎉 Далі — партнерська програма з виплатами. Напиши нам.",
    friends: (n: number) => `${n} ${n === 1 ? "друг" : "друзів"}`,
    invited: "Запрошені",
    noInvited: "Ще нікого. Надішли посилання — і тут зʼявляться твої друзі.",
    stJoined: "Зараховується (до 48 годин)",
    stCounted: "Зараховано",
    stLive: "Зараховано · профіль заповнено",
    howTitle: "Як це працює",
    how: [
      "Друг переходить за твоїм посиланням і реєструється в A1.",
      "Через 48 годин він зараховується. Перші дві нагороди — за будь-яких справжніх друзів.",
      "Для нагород від 7 друзів потрібно, щоб друг заповнив профіль у застосунку.",
      "Місяці Alpha накопичуються й увімкнуться на твоєму акаунті автоматично, щойно ми запустимо Alpha.",
    ],
    fine: "Свій власний акаунт запросити не можна; один друг — один запрошувач. Нечесні реєстрації не зараховуються.",
    signInTitle: "Увійди, щоб отримати своє посилання",
    err: "Щось пішло не так. Спробуй ще раз за хвилину.",
    loading: "Завантаження…",
    notEligible: "Для цього акаунта програма недоступна.",
  },
  en: {
    title: "Get Alpha",
    sub: (d: number) => `Invite friends to A1 and get Alpha for free. Your friend gets ${d} days of Alpha as a gift too.`,
    yourLink: "Your link",
    share: "Share",
    copy: "Copy",
    copied: "Copied ✓",
    progress: "Your progress",
    months: (n: number) => (n === 1 ? "1 month" : `${n} months`),
    earned: (m: string) => `Earned: ${m} of Alpha`,
    none: "Nothing yet — invite your first friend",
    toNext: (left: number, friends: number, m: string, live: boolean) =>
      `${left} more ${live ? "active " : ""}${left === 1 ? "friend" : "friends"} to reach ${friends} → ${m} total`,
    top: "Top reached 🎉 Next up is the partner programme with payouts. Write to us.",
    friends: (n: number) => `${n} ${n === 1 ? "friend" : "friends"}`,
    invited: "Invited",
    noInvited: "Nobody yet. Send your link and your friends will show up here.",
    stJoined: "Counting (up to 48 hours)",
    stCounted: "Counted",
    stLive: "Counted · profile filled in",
    howTitle: "How it works",
    how: [
      "A friend opens your link and signs up to A1.",
      "After 48 hours they count. The first two rewards need any real friend.",
      "From 7 friends on, a friend must also fill in their profile in the app.",
      "Alpha months pile up and switch on automatically once Alpha launches.",
    ],
    fine: "You can't invite your own account; one friend has one inviter. Fake sign-ups don't count.",
    signInTitle: "Sign in to get your link",
    err: "Something went wrong. Please try again in a minute.",
    loading: "Loading…",
    notEligible: "The programme isn't available for this account.",
  },
};

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
        await navigator.share({ title: "A1", text: locale === "uk" || locale === "ru" ? "Приєднуйся до A1 — отримай Alpha на 14 днів" : "Join A1 — get 14 days of Alpha", url: link });
        return;
      }
    } catch {
      /* отменили -- копируем */
    }
    await copy();
  };

  const steps = data?.ladder ?? [];
  const counts = data?.progress.counts;
  const maxFriends = steps[steps.length - 1]?.friends ?? 30;
  // Ступени стоят на полосе равными промежутками (иначе «1» и «3» слипаются на телефоне);
  // заливка идёт плавно между соседними ступенями по числу друзей в зачёте.
  const posOf = (i: number) => ((i + 1) / Math.max(1, steps.length)) * 100;
  const filled = (() => {
    if (!counts || !steps.length) return 0;
    const n = Math.max(counts.counted, 0);
    let prev = 0;
    for (let i = 0; i < steps.length; i++) {
      const cur = steps[i]?.friends ?? 0;
      if (n < cur) {
        const part = (n - prev) / Math.max(1, cur - prev);
        const from = i === 0 ? 0 : posOf(i - 1);
        return Math.round(from + part * (posOf(i) - from));
      }
      prev = cur;
    }
    return 100;
  })();

  const statusText = (r: Row) => (!r.counted ? t.stJoined : r.status === "live" ? t.stLive : t.stCounted);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8 sm:pt-12">
      <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
        Alpha
      </div>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-neutral-900 dark:text-white sm:text-4xl">{t.title}</h1>
      <p className="mt-2 text-base text-neutral-600 dark:text-neutral-300">{t.sub(data?.friendDays ?? 14)}</p>

      {state === "loading" && <p className="mt-8 text-sm text-neutral-500">{t.loading}</p>}
      {state === "err" && <p className="mt-8 text-sm text-red-600">{t.err}</p>}
      {state === "na" && <p className="mt-8 text-sm text-neutral-500">{t.notEligible}</p>}

      {state === "anon" && (
        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">{t.signInTitle}</h2>
          <InlineAuthForm lang={locale} compact returnTo="/invite" />
        </section>
      )}

      {state === "ok" && data && (
        <>
          <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t.yourLink}</div>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2.5 dark:bg-neutral-800">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-900 dark:text-neutral-100">{link.replace(/^https?:\/\/(jobs\.)?/, "")}</span>
              <button type="button" onClick={copy} className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold text-accent transition hover:bg-accent/10">
                {copied ? t.copied : t.copy}
              </button>
            </div>
            <button type="button" onClick={share} className="mt-3 w-full rounded-full bg-accent px-5 py-3 text-base font-semibold text-white transition hover:opacity-90">
              {t.share}
            </button>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t.progress}</h2>
              <span className="text-sm tabular-nums text-neutral-500">{t.friends(counts?.counted ?? 0)}</span>
            </div>

            <div className="relative mt-5 h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-700" role="progressbar" aria-valuemin={0} aria-valuemax={maxFriends} aria-valuenow={Math.min(counts?.counted ?? 0, maxFriends)}>
              <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${filled}%` }} />
              {steps.map((s, i) => {
                const left = posOf(i);
                const done = i <= data.progress.stepReached;
                return (
                  <span
                    key={s.friends}
                    className={"absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-neutral-900 " + (done ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-600")}
                    style={{ left: `${left}%` }}
                  />
                );
              })}
            </div>
            <div className="relative mt-3 h-10 text-[11px] leading-tight text-neutral-500">
              {steps.map((s, i) => (
                <span key={s.friends} className="absolute -translate-x-1/2 whitespace-nowrap text-center" style={{ left: `${Math.min(92, posOf(i))}%` }}>
                  <b className={"block text-xs " + (i <= data.progress.stepReached ? "text-accent" : "text-neutral-700 dark:text-neutral-300")}>{s.friends}</b>
                  {s.months} {locale === "uk" || locale === "ru" ? "міс" : "mo"}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm font-medium text-neutral-900 dark:text-white">
              {data.progress.monthsEarned > 0 ? t.earned(t.months(data.progress.monthsEarned)) : t.none}
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {data.progress.next ? t.toNext(data.progress.next.left, data.progress.next.friends, t.months(data.progress.next.months), data.progress.next.needLive) : t.top}
            </p>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t.invited}</h2>
            {data.invited.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">{t.noInvited}</p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.invited.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.name}</span>
                    <span className={"shrink-0 text-xs " + (r.counted ? "text-accent" : "text-neutral-500")}>{statusText(r)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="mt-6 rounded-2xl bg-neutral-50 p-5 ring-1 ring-neutral-200 dark:bg-neutral-900/60 dark:ring-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t.howTitle}</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
          {t.how.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-neutral-500">{t.fine}</p>
      </section>
    </main>
  );
}

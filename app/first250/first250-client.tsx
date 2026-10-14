"use client";

// app/first250/first250-client.tsx -- страница акции «Перші 250».
//
// Путь человека: 1) скачать A1, 2) заполнить профиль (4 галочки считает сервер по данным бэкенда --
// фото, имя, ким працює, навички/досвід), 3) войти здесь тем же аккаунтом и нажать «Забрати місце».
// Отзыв в сторе -- отдельно и БЕЗ условий (правила App Store / Google Play запрещают награду за оценку).
//
// Язык: украинский (аудитория -- украинская Telegram-группа), для остальных языков сайта -- английский.

import { useCallback, useEffect, useRef, useState } from "react";
import { LottiePlayer } from "@/components/lottie-player";
import { StoreBadges } from "@/components/store-badges";
import { AppQr } from "@/components/app-qr";
import { InlineAuthForm } from "@/components/inline-auth-form";
import { useActiveLocale } from "@/lib/use-active-locale";
import { DOWNLOAD_LINKS } from "@/app/download/copy";

type Checks = { photo: boolean; name: boolean; title: boolean; experience: boolean };
type Me = { signedIn: false } | { signedIn: true; name: string; checks: Checks; complete: boolean; place: number | null };
type Status = { ok: true; total: number; taken: number; left: number; me: Me };

const TXT = {
  uk: {
    badge: "Beta 0.1 · акція для перших",
    hello: "Вітаємо в A1!",
    sub: ["Дякуємо, що ви з нами з самого початку 💙 Перші 250 людей отримують ", "A1 Premium на цілий рік", " — безкоштовно."],
    left: (l: number, t: number) => `Залишилось ${l} з ${t} місць`,
    s1: "Завантаж A1",
    s1d: "Застосунок для пошуку роботи та фахівців без CV — профіль замість резюме.",
    qr: "Наведи камеру телефона — відкриється потрібний стор",
    s2: "Заповни профіль",
    s2d: "У застосунку: Профіль → додай чотири речі. Перевіряємо автоматично, скриншоти не потрібні.",
    c: { photo: "Фото", name: "Імʼя", title: "Ким працюєш (роль або заголовок)", experience: "Навички, досвід або освіта" },
    s3: "Забери своє місце",
    signIn: "Увійди тим самим акаунтом, що й у застосунку:",
    recheck: "Перевірити ще раз",
    checking: "Перевіряємо…",
    missing: "Ще трохи! Додай у застосунку те, що без галочки, і натисни «Перевірити ще раз».",
    claim: "🎁 Забрати місце",
    claiming: "Записуємо…",
    hi: (n: string) => (n ? `Привіт, ${n}!` : "Привіт!"),
    doneTitle: (p: number, t: number) => `Ви №${p} з ${t}! 🎉`,
    doneSub: "Місце ваше. Premium на рік увімкнемо на цьому акаунті, щойно він запуститься (1–2 тижні) — нічого робити не треба.",
    lateTitle: "Ой, ви трохи запізнились 🥲",
    lateSub: "Хтось натиснув на мить раніше. Але ми запамʼятали вас — слідкуйте за новинами в групі.",
    reviewTitle: "Сподобався A1?",
    reviewSub: "Чесний відгук у сторі дуже допоможе нам рости. Це не умова акції — просто будемо щиро вдячні 🙏",
    share: "Поділитись з другом",
    copied: "Посилання скопійовано ✓",
    soldTitle: "Усі 250 місць уже розібрали 🥲",
    soldSub: "Дякуємо за інтерес! Завантажуйте A1 — попереду ще багато приємного.",
    err: "Щось пішло не так. Спробуйте ще раз за хвилину.",
    fine: "Одне місце на один акаунт. Premium вмикаємо, коли він зʼявиться в A1.",
  },
  en: {
    badge: "Beta 0.1 · early birds",
    hello: "Welcome to A1!",
    sub: ["Thanks for being with us from day one 💙 The first 250 people get ", "A1 Premium for a whole year", " — free."],
    left: (l: number, t: number) => `${l} of ${t} spots left`,
    s1: "Get A1",
    s1d: "Find jobs and talent without a CV — your profile is your résumé.",
    qr: "Point your phone camera — it opens the right store",
    s2: "Fill in your profile",
    s2d: "In the app: Profile → add four things. We check automatically, no screenshots needed.",
    c: { photo: "Photo", name: "Name", title: "What you do (role or headline)", experience: "Skills, experience or education" },
    s3: "Claim your spot",
    signIn: "Sign in with the same account you use in the app:",
    recheck: "Check again",
    checking: "Checking…",
    missing: "Almost there! Add what's unchecked in the app, then tap “Check again”.",
    claim: "🎁 Claim my spot",
    claiming: "Saving…",
    hi: (n: string) => (n ? `Hi, ${n}!` : "Hi!"),
    doneTitle: (p: number, t: number) => `You're #${p} of ${t}! 🎉`,
    doneSub: "The spot is yours. We'll turn on a year of Premium on this account as soon as it launches (1–2 weeks) — nothing else to do.",
    lateTitle: "Oh, just a moment too late 🥲",
    lateSub: "Someone tapped a split second earlier. We remember you though — stay tuned.",
    reviewTitle: "Enjoying A1?",
    reviewSub: "An honest review in the store helps us grow a lot. It's not a condition — we'd just be really grateful 🙏",
    share: "Share with a friend",
    copied: "Link copied ✓",
    soldTitle: "All 250 spots are taken 🥲",
    soldSub: "Thanks for your interest! Get A1 anyway — lots more good stuff ahead.",
    err: "Something went wrong. Please try again in a minute.",
    fine: "One spot per account. Premium is switched on once it's live in A1.",
  },
};

const CHECK_KEYS = ["photo", "name", "title", "experience"] as const;

// Только для локальной проверки вида: /first250?preview=anon|incomplete|ready|done|soldout
function devPreview(): Status | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("preview");
  if (!p) return null;
  const base = { ok: true as const, total: 250, taken: 37, left: 213 };
  const all: Checks = { photo: true, name: true, title: true, experience: true };
  if (p === "anon") return { ...base, me: { signedIn: false } };
  if (p === "incomplete") return { ...base, me: { signedIn: true, name: "Олена", checks: { ...all, title: false, experience: false }, complete: false, place: null } };
  if (p === "ready") return { ...base, me: { signedIn: true, name: "Олена", checks: all, complete: true, place: null } };
  if (p === "done") return { ...base, taken: 38, left: 212, me: { signedIn: true, name: "Олена", checks: all, complete: true, place: 38 } };
  if (p === "soldout") return { ...base, taken: 250, left: 0, me: { signedIn: false } };
  return null;
}

// ---------------------------------------------------------------- конфетти (без библиотек)

function useConfetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const fire = useCallback(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#335ef7", "#8b5cf6", "#22d3ee", "#f472b6", "#facc15", "#34d399"];
    const W = window.innerWidth;
    const parts = Array.from({ length: 160 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 13 - 5,
      r: 4 + Math.random() * 5,
      c: colors[i % colors.length]!,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      round: Math.random() < 0.35,
    }));
    const t0 = performance.now();
    const step = (t: number) => {
      const age = t - t0;
      ctx.clearRect(0, 0, W, window.innerHeight);
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age / 3200);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      if (age < 3300) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, W, window.innerHeight);
    };
    requestAnimationFrame(step);
  }, []);
  const canvas = <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] h-full w-full" />;
  return { fire, canvas };
}

// ---------------------------------------------------------------- счётчик с «прокруткой» чисел

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 1200));
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className="tabular-nums">{v}</span>;
}

// ---------------------------------------------------------------- страница

export function First250Client() {
  const locale = useActiveLocale();
  const t = locale === "uk" || locale === "ru" ? TXT.uk : TXT.en;
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState<"check" | "claim" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [late, setLate] = useState(false);
  const [copied, setCopied] = useState(false);
  const { fire, canvas } = useConfetti();

  const load = useCallback(async () => {
    const pv = devPreview();
    if (pv) {
      setSt(pv);
      return pv;
    }
    try {
      const r = await fetch("/api/first250", { cache: "no-store" });
      const j = (await r.json()) as Status | { ok: false; message: string };
      if (j.ok) {
        setSt(j);
        return j;
      }
      if (r.status === 401) {
        // сессия протухла -- показываем как гостю
        const g = await fetch("/api/first250", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
        if (g?.ok) setSt(g as Status);
        return null;
      }
      setErr(t.err);
    } catch {
      setErr(t.err);
    }
    return null;
  }, [t.err]);

  useEffect(() => {
    void load().then((s) => {
      if (s?.me.signedIn && s.me.place && new URLSearchParams(window.location.search).get("preview") === "done") fire();
    });
  }, [load, fire]);

  const recheck = async () => {
    setBusy("check");
    setErr(null);
    await load();
    setBusy(null);
  };

  const claim = async () => {
    setBusy("claim");
    setErr(null);
    if (devPreview()) {
      setSt((s) => (s && s.me.signedIn ? { ...s, taken: s.taken + 1, left: s.left - 1, me: { ...s.me, place: s.taken + 1 } } : s));
      fire();
      setBusy(null);
      return;
    }
    try {
      const r = await fetch("/api/first250", { method: "POST" });
      const j = (await r.json()) as { ok: boolean; message?: string; place?: number; late?: boolean };
      if (j.ok && j.place) {
        if (j.late) setLate(true);
        else fire();
        await load();
      } else if (j.message === "profile_incomplete") {
        await load();
      } else if (j.message === "sold_out") {
        await load();
      } else {
        setErr(t.err);
      }
    } catch {
      setErr(t.err);
    }
    setBusy(null);
  };

  const share = async () => {
    const url = "https://jobs.a1appp.com/first250";
    try {
      if (navigator.share) {
        await navigator.share({ title: "A1 — Перші 250", url });
        return;
      }
    } catch {
      /* отменили -- копируем */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ничего */
    }
  };

  const me = st?.me;
  const soldOut = !!st && st.left <= 0 && !(me?.signedIn && me.place);
  const claimed = me?.signedIn && me.place ? me.place : null;
  const pct = st ? Math.min(100, Math.round((st.taken / st.total) * 100)) : 0;

  return (
    <main className="f250 relative isolate -mb-16 overflow-hidden pb-16">
      {canvas}
      {/* фон: мягкий переливающийся градиент и плавающие «искорки» */}
      <div aria-hidden="true" className="f250-bg absolute inset-0 -z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {["🎉", "✨", "🎁", "💙", "⭐", "🚀", "✨", "🎈"].map((e, i) => (
          <span key={i} className="f250-float absolute select-none text-2xl sm:text-3xl" style={{ left: `${6 + i * 12}%`, animationDelay: `${i * 1.3}s`, animationDuration: `${11 + (i % 4) * 2}s` }}>
            {e}
          </span>
        ))}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
        {/* шапка */}
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold text-accent shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-sky-300">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            {t.badge}
          </span>
          {/* 14.10.2026: баннер от Александра (кот A1 + «Welcome to A1 · First 250») */}
          <div className="f250-pop f250-banner relative mx-auto mt-5 overflow-hidden rounded-[28px] shadow-2xl shadow-indigo-500/25 ring-1 ring-white/60 dark:ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/first250/banner.webp" alt="Welcome to A1 — First 250" width={1672} height={941} className="block h-auto w-full" fetchPriority="high" />
            <span aria-hidden="true" className="f250-glint pointer-events-none absolute inset-0" />
          </div>
          <h1 className="f250-title mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl">{t.hello}</h1>
          <p className="mx-auto mt-3 max-w-lg text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            {t.sub[0]}
            <b className="font-bold text-neutral-900 dark:text-white">{t.sub[1]}</b>
            {t.sub[2]}
          </p>

          {/* счётчик мест */}
          <div className="mx-auto mt-7 max-w-md rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lg shadow-indigo-500/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
            <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{st ? t.left(st.left, st.total) : "…"}</div>
            <div className="mt-1 text-5xl font-black text-neutral-900 dark:text-white">
              {st ? <CountUp to={st.left} /> : "—"}
              <span className="text-2xl font-bold text-neutral-400"> / {st?.total ?? 250}</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-white/10">
              <div className="f250-bar h-full rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
            </div>
          </div>
        </section>

        {soldOut ? (
          <section className="mt-10 rounded-3xl border border-white/70 bg-white/80 p-6 text-center shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
            <h2 className="text-2xl font-bold">{t.soldTitle}</h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">{t.soldSub}</p>
            <StoreBadges className="mt-5 justify-center" />
          </section>
        ) : claimed || late ? (
          <section className="f250-pop mt-10 rounded-3xl border border-white/70 bg-white/85 p-6 text-center shadow-xl shadow-indigo-500/15 backdrop-blur dark:border-white/10 dark:bg-white/[0.07]">
            {!late ? (
              <div className="mx-auto -mt-2 mb-1 w-fit">
                <LottiePlayer src="/animations/cat-love-u.json" size={132} />
              </div>
            ) : null}
            <h2 className="text-3xl font-extrabold">{late || !claimed ? t.lateTitle : t.doneTitle(claimed, st?.total ?? 250)}</h2>
            <p className="mx-auto mt-3 max-w-md text-neutral-700 dark:text-neutral-300">{late ? t.lateSub : t.doneSub}</p>
            <div className="mt-7 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 p-5 dark:from-white/[0.04] dark:to-white/[0.02]">
              <div className="text-lg font-bold">{t.reviewTitle}</div>
              <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">{t.reviewSub}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <a href={DOWNLOAD_LINKS.appStore + "?action=write-review"} rel="noopener" target="_blank" className="rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-85">⭐ App Store</a>
                <a href={DOWNLOAD_LINKS.googlePlay + "&showAllReviews=true"} rel="noopener" target="_blank" className="rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-85">⭐ Google Play</a>
              </div>
            </div>
            <button type="button" onClick={share} className="mt-5 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold transition hover:bg-neutral-100 dark:border-white/15 dark:hover:bg-white/10">
              {copied ? t.copied : `🔗 ${t.share}`}
            </button>
          </section>
        ) : (
          <ol className="mt-10 space-y-4">
            {/* шаг 1 */}
            <Step n={1} title={t.s1} done={!!me?.signedIn}>
              <p className="text-neutral-600 dark:text-neutral-400">{t.s1d}</p>
              <div className="mt-4 flex flex-wrap items-center gap-5">
                <StoreBadges />
                <div className="hidden items-center gap-3 sm:flex">
                  <AppQr className="h-20 w-20 rounded-lg" />
                  <span className="max-w-[9rem] text-xs text-neutral-500">{t.qr}</span>
                </div>
              </div>
            </Step>

            {/* шаг 2 */}
            <Step n={2} title={t.s2} done={!!(me?.signedIn && me.complete)}>
              <p className="text-neutral-600 dark:text-neutral-400">{t.s2d}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {CHECK_KEYS.map((k) => {
                  const ok = me?.signedIn ? me.checks[k] : null;
                  return (
                    <li key={k} className={"flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition " + (ok ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200" : "bg-neutral-100/80 text-neutral-700 dark:bg-white/5 dark:text-neutral-300")}>
                      <span className={"grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold " + (ok ? "f250-pop bg-emerald-500 text-white" : ok === false ? "border-2 border-amber-400 text-amber-500" : "border-2 border-neutral-300 text-neutral-400 dark:border-white/20")}>
                        {ok ? "✓" : ok === false ? "!" : ""}
                      </span>
                      {t.c[k]}
                    </li>
                  );
                })}
              </ul>
            </Step>

            {/* шаг 3 */}
            <Step n={3} title={t.s3} done={false}>
              {!st ? (
                <div className="h-12 animate-pulse rounded-2xl bg-neutral-200/70 dark:bg-white/5" />
              ) : !me?.signedIn ? (
                <>
                  <p className="mb-3 text-neutral-600 dark:text-neutral-400">{t.signIn}</p>
                  <div className="rounded-2xl bg-white/90 p-3 dark:bg-white/[0.04]">
                    <InlineAuthForm lang={locale} compact returnTo="/first250" />
                  </div>
                </>
              ) : !me.complete ? (
                <>
                  <p className="font-medium">{t.hi(me.name)}</p>
                  <p className="mt-1 text-neutral-600 dark:text-neutral-400">{t.missing}</p>
                  <button type="button" onClick={recheck} disabled={busy !== null} className="mt-4 rounded-full bg-neutral-900 px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black">
                    {busy === "check" ? t.checking : `↻ ${t.recheck}`}
                  </button>
                </>
              ) : (
                <>
                  <p className="font-medium">{t.hi(me.name)}</p>
                  <button type="button" onClick={claim} disabled={busy !== null} className="f250-cta mt-4 w-full rounded-2xl px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/30 transition active:scale-[0.98] disabled:opacity-70">
                    {busy === "claim" ? t.claiming : t.claim}
                  </button>
                </>
              )}
              {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
            </Step>
          </ol>
        )}

        <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">{t.fine}</p>
      </div>
    </main>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className="f250-step rounded-3xl border border-white/70 bg-white/80 p-5 shadow-md shadow-indigo-500/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] sm:p-6" style={{ animationDelay: `${n * 120}ms` }}>
      <div className="flex items-center gap-3">
        <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-black text-white " + (done ? "bg-emerald-500" : "f250-num")}>{done ? "✓" : n}</span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </li>
  );
}

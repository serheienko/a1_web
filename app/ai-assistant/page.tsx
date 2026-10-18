// app/ai-assistant/page.tsx -- «A1 в ІІ-асистенті».
// 16.10.2026: сторінка для людей, які підключають коннектор A1 (MCP) до ІІ-асистентів, і для каталогу коннекторів.
// Рішення Александра: відгуки, чати і створення вакансій асистентом не робимо.
// Зараз коннектор відкритий (5 вакансій у відповіді); повний пошук і профіль -- з Premium пізніше.
// 17.10.2026 (рішення Александра): показуємо логотипи асистентів. Спершу тут були
// монограми -- побоювання через чужі торгові марки. Показати значок у відповідь на
// питання «з чим це працює» -- звичайна практика і дозволене використання: ми не
// видаємо себе за них і не натякаємо на партнерство. Під карточками стоїть рядок
// «Назви та логотипи належать їхнім власникам».

import type { Metadata } from "next";
import { Email } from "@/components/email-text";
import { LOCALES, LOCALE_TAG, type Locale } from "@/components/t";
import { AI_COPY, type AiCopy } from "./copy";

const SITE_URL = "https://jobs.a1appp.com";
const MCP_URL = `${SITE_URL}/api/mcp`;

export const metadata: Metadata = {
  title: "A1 в ІІ-асистенті: пошук вакансій у Claude та ChatGPT | A1 Jobs",
  description: "Підключіть A1 до Claude, ChatGPT та інших ІІ-асистентів і шукайте IT-вакансії просто в чаті. Відгукуватись на вакансії асистент не може: це робите ви самі.",
  alternates: { canonical: `${SITE_URL}/ai-assistant` },
};

const CARD = "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const H = "mt-12 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50";
const P = "mt-3 text-neutral-700 dark:text-neutral-300 leading-relaxed";

// 17.10.2026. Логотипи асистентів замість літер у кольорових квадратах:
// людина впізнає значок швидше, ніж напис. Файли лежать у нас
// (public/brand/assistants), а не тягнуться з чужих сайтів -- так сторінка
// не залежить від того, чи відкриється чужий домен, і нічого не розповідає
// про наших відвідувачів стороннім. Значки чорно-білі (ChatGPT, Cursor),
// тому плитка під ними завжди світла, інакше в темній темі вони зникають.
// Назви й логотипи належать їхнім власникам -- ми лише показуємо, з чим
// працює коннектор; підпис про це стоїть під карточками.
// Логотип і «ok» -- не текст, у всіх мовах однакові (порядок = порядок assistants у copy.ts).
const ASSISTANT_META: { ok: boolean; logo?: string; mono?: string }[] = [
  { logo: "/brand/assistants/claude.png", ok: true },
  { logo: "/brand/assistants/chatgpt.png", ok: true },
  { logo: "/brand/assistants/cursor.png", ok: true },
  { mono: "+", ok: false },
];

const FLOW_ICONS = ["🙋", "🤖", "🔌", "📋", "✅"];

// 18.10.2026: сторінка на всіх 9 мовах сайту. Усі мови друкуються в HTML одразу, а CSS (lang-XX на <html>) показує одну:
// той самий прийом, що в <T/> (components/t.tsx), тому нічого не блимає і сторінка лишається статичною.
const BLOCK: Record<Locale, string> = {
  uk: "hidden lang-uk:block",
  en: "hidden lang-en:block",
  ru: "hidden lang-ru:block",
  de: "hidden lang-de:block",
  es: "hidden lang-es:block",
  fr: "hidden lang-fr:block",
  pl: "hidden lang-pl:block",
  ptBR: "hidden lang-ptbr:block",
  zh: "hidden lang-zh:block",
};

function Body({ c }: { c: AiCopy }) {
  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">{c.badge}</p>
      <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">{c.h1}</h1>
      <p className="mt-4 text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">{c.lead}</p>

      <h2 className={H}>{c.worksWith}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {c.assistants.map((a, i) => {
          const meta = ASSISTANT_META[i];
          const ok = meta?.ok ?? false;
          return (
            <div key={i} className={`${CARD} text-center`}>
              {/* 17.10.2026 (Александр: «Інші залита синім, некрасиво»). Плитка одна на всіх:
                  світлий квадрат з тонкою рамкою. У трьох -- логотип, у «Інших» -- сірий плюс,
                  щоб ряд читався як один набір, а не як три значки і одна кнопка. */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-neutral-200 dark:ring-neutral-700">
                {meta?.logo ? (
                  <img src={meta.logo} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 object-contain" />
                ) : (
                  <span className="text-2xl font-semibold leading-none text-neutral-400">{meta?.mono}</span>
                )}
              </div>
              <div className="mt-3 font-semibold text-neutral-900 dark:text-neutral-50">{a.name}</div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{a.note}</div>
              <div className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>{a.status}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{c.disclaimer}</p>

      <h2 className={H}>{c.howTitle}</h2>
      <ol className="mt-4 space-y-2">
        {c.flow.map((s, i) => (
          <li key={i} className="relative">
            <div className={`${CARD} flex items-center gap-4`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-2xl dark:bg-sky-900/30">{FLOW_ICONS[i]}</span>
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-50">{i + 1}. {s.title}</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">{s.text}</div>
              </div>
            </div>
            {i < c.flow.length - 1 && <div className="py-1 text-center text-neutral-400" aria-hidden>↓</div>}
          </li>
        ))}
      </ol>

      <h2 className={H}>{c.stepsTitle}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={CARD}><div className="text-3xl">1️⃣</div><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{c.step1}</p></div>
        <div className={CARD}><div className="text-3xl">2️⃣</div><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{c.step2Name} <b>A1</b>. {c.step2Addr}<br /><code className="break-all rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">{MCP_URL}</code></p></div>
        <div className={CARD}><div className="text-3xl">3️⃣</div><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{c.step3}</p></div>
      </div>

      <h2 className={H}>{c.canTitle}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`${CARD} border-emerald-300 dark:border-emerald-800`}>
          <div className="font-semibold text-emerald-700 dark:text-emerald-400">{c.canLabel}</div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {c.can.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
        <div className={`${CARD} border-rose-300 dark:border-rose-900`}>
          <div className="font-semibold text-rose-700 dark:text-rose-400">{c.cantLabel}</div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {c.cant.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      </div>
      <p className={P}>{c.consent}</p>

      <h2 className={H}>{c.privacyTitle}</h2>
      <p className={P}>{c.privacyText} {c.privacyMore} <a className="underline" href="/privacy">{c.privacyLink}</a>. {c.questions} <Email />.</p>
    </>
  );
}

export default function AiAssistantPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {LOCALES.map((l) => (
        <section key={l} lang={LOCALE_TAG[l]} className={BLOCK[l]}>
          <Body c={AI_COPY[l]} />
        </section>
      ))}

      {/* Англійський підсумок для індексації залишається під українською версією (як було до локалізації). */}
      <div className="hidden lang-uk:block lang-ru:block">
        <h2 className={H} lang="en">In English</h2>
        <p className={P} lang="en">Search A1 IT jobs from Claude, ChatGPT or any assistant that supports MCP connectors. In Claude: Settings → Connectors → Add custom connector, name A1, server URL {MCP_URL}. In ChatGPT, add it as a custom connector in developer mode. No sign-in needed. The free mode returns up to 5 newest matches with links; full search and profile matching will be part of A1 Premium. The connector is read-only: it cannot apply to jobs, send messages or create vacancies on your behalf. Support: <Email />.</p>
      </div>
    </main>
  );
}

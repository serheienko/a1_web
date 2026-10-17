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
type Assistant = {
  name: string;
  note: string;
  status: string;
  ok: boolean;
  /** Значок у public/brand/assistants. Якщо його немає -- малюємо кольоровий квадрат з `mono`. */
  logo?: string;
  mono?: string;
  color?: string;
};

const ASSISTANTS: Assistant[] = [
  { logo: "/brand/assistants/claude.png", name: "Claude", note: "Settings → Connectors", status: "Працює", ok: true },
  { logo: "/brand/assistants/chatgpt.png", name: "ChatGPT", note: "Режим розробника → Connectors", status: "Підтримує MCP", ok: true },
  { logo: "/brand/assistants/cursor.png", name: "Cursor", note: "MCP-налаштування", status: "Підтримує MCP", ok: true },
  { mono: "+", name: "Інші", note: "Будь-який клієнт з MCP", status: "Скоро", color: "bg-sky-500", ok: false },
];

const FLOW = [
  { icon: "🙋", title: "Ви пишете", text: "«Знайди 3 вакансії Flutter в Україні»" },
  { icon: "🤖", title: "Асистент", text: "Claude, ChatGPT чи інший" },
  { icon: "🔌", title: "Коннектор A1", text: "Шукає тільки читання, нічого не змінює" },
  { icon: "📋", title: "Вакансії", text: "Назва, компанія, зарплата, посилання" },
  { icon: "✅", title: "Ви відгукуєтесь", text: "Самі, на сторінці вакансії в A1" },
];

export default function AiAssistantPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <p className="text-sm font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Новинка</p>
      <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">A1 прямо у вашому ІІ-чаті 🚀</h1>
      <p className="mt-4 text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">Підключіть A1 один раз і шукайте IT-вакансії, не виходячи з розмови з асистентом. Без реєстрації й без паролів.</p>

      <h2 className={H}>З чим працює</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ASSISTANTS.map((a) => (
          <div key={a.name} className={`${CARD} text-center`}>
            {a.logo ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-neutral-200 dark:ring-neutral-700">
                <img src={a.logo} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 object-contain" />
              </div>
            ) : (
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white ${a.color}`}>{a.mono}</div>
            )}
            <div className="mt-3 font-semibold text-neutral-900 dark:text-neutral-50">{a.name}</div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{a.note}</div>
            <div className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${a.ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}>{a.status}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Підключення залежить від тарифу та налаштувань вашого асистента: ChatGPT, наприклад, вмикає зовнішні коннектори в режимі розробника. Назви та логотипи належать їхнім власникам.</p>

      <h2 className={H}>Як це працює</h2>
      <ol className="mt-4 space-y-2">
        {FLOW.map((s, i) => (
          <li key={s.title} className="relative">
            <div className={`${CARD} flex items-center gap-4`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-2xl dark:bg-sky-900/30">{s.icon}</span>
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-50">{i + 1}. {s.title}</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">{s.text}</div>
              </div>
            </div>
            {i < FLOW.length - 1 && <div className="py-1 text-center text-neutral-400" aria-hidden>↓</div>}
          </li>
        ))}
      </ol>

      <h2 className={H}>Підключити за 3 кроки</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={CARD}><div className="text-3xl">1️⃣</div><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Відкрийте налаштування коннекторів вашого асистента (у Claude: Settings → Connectors → Add custom connector).</p></div>
        <div className={CARD}><div className="text-3xl">2️⃣</div><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Назва: <b>A1</b>. Адреса сервера:<br /><code className="break-all rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{MCP_URL}</code></p></div>
        <div className={CARD}><div className="text-3xl">3️⃣</div><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Збережіть, увімкніть у новому чаті й запитайте про вакансії. Вхід не потрібен.</p></div>
      </div>

      <h2 className={H}>Що можна, а що ні</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`${CARD} border-emerald-300 dark:border-emerald-800`}>
          <div className="font-semibold text-emerald-700 dark:text-emerald-400">✅ Можна</div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Шукати вакансії за словами, країною, «лише віддалено»</li>
            <li>Отримати до 5 найновіших збігів із посиланнями</li>
            <li>Повний пошук і підбір під профіль: у A1 Premium (скоро)</li>
          </ul>
        </div>
        <div className={`${CARD} border-rose-300 dark:border-rose-900`}>
          <div className="font-semibold text-rose-700 dark:text-rose-400">🚫 Навмисно не можна</div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Відгукуватись на вакансії замість вас</li>
            <li>Писати в чати й надсилати повідомлення</li>
            <li>Створювати вакансії</li>
          </ul>
        </div>
      </div>
      <p className={P}>Відгук має бути вашим рішенням: його ви робите самі на сторінці вакансії в A1.</p>

      <h2 className={H}>Конфіденційність</h2>
      <p className={P}>Коннектор повертає лише публічні вакансії і нічого не зберігає про вас. Докладніше: <a className="underline" href="/privacy">Політика конфіденційності</a>. Питання: support@a1appp.com.</p>

      <h2 className={H} lang="en">In English</h2>
      <p className={P} lang="en">Search A1 IT jobs from Claude, ChatGPT or any assistant that supports MCP connectors. In Claude: Settings → Connectors → Add custom connector, name A1, server URL {MCP_URL}. In ChatGPT, add it as a custom connector in developer mode. No sign-in needed. The free mode returns up to 5 newest matches with links; full search and profile matching will be part of A1 Premium. The connector is read-only: it cannot apply to jobs, send messages or create vacancies on your behalf. Support: support@a1appp.com.</p>
    </main>
  );
}

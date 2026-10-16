// app/ai-assistant/page.tsx -- «A1 в ІІ-асистенті».
// 16.10.2026: сторінка для людей, які підключають коннектор A1 (MCP) до Claude та інших асистентів, і для
// каталогу коннекторів. Рішення Александра: відгуки, чати і створення вакансій асистентом не робимо.
// Зараз коннектор відкритий (5 вакансій у відповіді); повний пошук і профіль -- з Premium пізніше.

import type { Metadata } from "next";

const SITE_URL = "https://jobs.a1appp.com";
const MCP_URL = `${SITE_URL}/api/mcp`;

export const metadata: Metadata = {
  title: "A1 в ІІ-асистенті: пошук вакансій у Claude | A1 Jobs",
  description: "Підключіть A1 до Claude та інших ІІ-асистентів і шукайте IT-вакансії просто в чаті. Відгукуватись на вакансії асистент не може: це робите ви самі.",
  alternates: { canonical: `${SITE_URL}/ai-assistant` },
};

const P = "mt-3 text-neutral-700 dark:text-neutral-300 leading-relaxed";
const H = "mt-8 text-xl font-semibold text-neutral-900 dark:text-neutral-50";
const LI = "mt-2 text-neutral-700 dark:text-neutral-300 leading-relaxed";

export default function AiAssistantPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">A1 в ІІ-асистенті</h1>
      <p className={P}>Шукайте IT-вакансії A1 просто в чаті з Claude чи іншим асистентом, який підтримує зовнішні коннектори (MCP). Напишіть, наприклад: «знайди 3 вакансії Flutter в Україні», і асистент покаже свіжі вакансії з посиланнями.</p>

      <h2 className={H}>Як підключити</h2>
      <ol className="mt-2 list-decimal pl-6">
        <li className={LI}>У Claude відкрийте Settings → Connectors → Add custom connector.</li>
        <li className={LI}>Назва: A1. Адреса сервера: <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-800">{MCP_URL}</code></li>
        <li className={LI}>Збережіть, увімкніть коннектор у новому чаті. Вхід не потрібен.</li>
      </ol>

      <h2 className={H}>Що вміє</h2>
      <ul className="mt-2 list-disc pl-6">
        <li className={LI}>Шукати вакансії за словами, країною і «лише віддалено».</li>
        <li className={LI}>Зараз у відповіді до 5 найновіших вакансій із посиланнями. Повний пошук і підбір під ваш профіль будуть у A1 Premium.</li>
      </ul>

      <h2 className={H}>Чого не вміє: навмисно</h2>
      <p className={P}>Асистент не подає відгуки замість вас, не пише в чати й не створює вакансії. Відгук має бути вашим рішенням: його ви робите самі на сторінці вакансії в A1.</p>

      <h2 className={H}>Конфіденційність</h2>
      <p className={P}>Коннектор повертає лише публічні вакансії і нічого не зберігає про вас. Докладніше: <a className="underline" href="/privacy">Політика конфіденційності</a>. Питання: support@a1appp.com.</p>

      <h2 className={H} lang="en">In English</h2>
      <p className={P} lang="en">Search A1 IT jobs from Claude or any assistant that supports MCP connectors. In Claude: Settings → Connectors → Add custom connector, name A1, server URL {MCP_URL}. No sign-in needed. The free mode returns up to 5 newest matches with links; full search and profile matching will be part of A1 Premium. The connector is read-only: it cannot apply to jobs, send messages or create vacancies on your behalf. Support: support@a1appp.com.</p>
    </main>
  );
}

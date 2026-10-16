// app/privacy/page.tsx -- «Політика конфіденційності».
// 16.10.2026: потрібна для каталогу коннекторів ІІ-асистентів (MCP) і взагалі для сайту.
// Текст короткий і описує лише те, що справді робить код. Перед рекламою/продажами його стоїть показати юристу.

import type { Metadata } from "next";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "Політика конфіденційності | A1 Jobs",
  description: "Які дані збирають сайт A1 Jobs і застосунок A1, а які ні, зокрема при пошуку через ІІ-асистента.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

const P = "mt-3 text-neutral-700 dark:text-neutral-300 leading-relaxed";
const H = "mt-8 text-xl font-semibold text-neutral-900 dark:text-neutral-50";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">Політика конфіденційності</h1>
      <p className={P}>Оновлено 16 жовтня 2026. Сайт jobs.a1appp.com і застосунок A1 належать команді A1. Питання: support@a1appp.com.</p>

      <h2 className={H}>1. Перегляд сайту без акаунта</h2>
      <p className={P}>Вакансії та новини можна дивитися без реєстрації. Ми не зберігаємо, хто саме відкрив сторінку. Для статистики ми лічимо лише кількість подій (наприклад, переходів на сайт компанії), без імені, адреси чи інших даних про людину.</p>

      <h2 className={H}>2. Акаунт у A1</h2>
      <p className={P}>Якщо ви створюєте акаунт, ми зберігаємо те, що ви самі вказуєте: пошту для входу, дані профілю, відгуки на вакансії, повідомлення в чатах. Ці дані потрібні, щоб сервіс працював. Частину профілю бачать інші користувачі (наприклад, роботодавці): її видимість ви вказуєте в налаштуваннях.</p>

      <h2 className={H}>3. Пошук через ІІ-асистента (MCP)</h2>
      <p className={P}>Коннектор A1 для ІІ-асистентів (адреса jobs.a1appp.com/api/mcp) у відкритій версії працює без входу. Він повертає лише публічні вакансії зі ссилками й нічого не записує про вас. Для захисту від зловживань ми короткочасно рахуємо кількість запитів з однієї адреси в оперативній пам’яті сервера (до 10 хвилин), не зберігаємо це в базі й не передаємо нікому. Текст вашого запиту ми не зберігаємо. Коннектор не подає відгуки, не пише в чати й не створює вакансії.</p>
      <p className={P}>Що саме бачить ІІ-асистент і як він обробляє вашу розмову, визначає його власник (наприклад, Anthropic чи OpenAI) за власною політикою.</p>

      <h2 className={H}>4. Передача третім особам</h2>
      <p className={P}>Ми не продаємо дані. Вакансії із зовнішніх джерел ведуть на сторінки роботодавців: далі діють правила цих сайтів.</p>

      <h2 className={H}>5. Видалення даних</h2>
      <p className={P}>Ви можете видалити акаунт у застосунку або написати нам на support@a1appp.com із проханням видалити ваші дані.</p>

      <h2 className={H} lang="en">Privacy policy in English</h2>
      <p className={P} lang="en">You can browse jobs and news on A1 without an account and we do not record who opened a page; we only count anonymous events. If you create an account we store what you provide (login email, profile, applications, chat messages) so the service works; some profile parts are visible to others according to your settings. The A1 assistant connector (jobs.a1appp.com/api/mcp) is read-only: it returns public job listings and stores nothing about you or your query. To prevent abuse we briefly count requests per address in server memory (up to 10 minutes) and never save that. It cannot apply to jobs, message anyone or create vacancies. How an AI assistant handles your conversation is governed by that assistant provider. We do not sell data. To delete your data, delete your account in the app or write to support@a1appp.com.</p>
    </main>
  );
}

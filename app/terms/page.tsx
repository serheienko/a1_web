// app/terms/page.tsx -- «Умови використання».
// 08.10.2026 (Александр: «где-то написать, что у нас нельзя брать»).
// Главное для нас -- пункт про автоматический сбор: он даёт основание для
// жалоб и блокировок. Текст короткий и без юридических украшений; перед
// рекламой/продажами его стоит показать юристу.

import type { Metadata } from "next";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "Умови використання | A1 Jobs",
  description: "Правила користування сайтом A1 Jobs: що можна, а що заборонено, зокрема автоматичний збір вакансій і текстів.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

const P = "mt-3 text-neutral-700 dark:text-neutral-300 leading-relaxed";
const H = "mt-8 text-xl font-semibold text-neutral-900 dark:text-neutral-50";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">Умови використання</h1>
      <p className={P}>Оновлено 8 жовтня 2026. Сайт jobs.a1appp.com і застосунок A1 належать команді A1.</p>

      <h2 className={H}>1. Що можна</h2>
      <p className={P}>Переглядати вакансії та новини, шукати роботу, відгукуватися на вакансії, ділитися посиланнями на наші сторінки. Пошукові системи (Google, Bing та подібні) можуть індексувати сторінки сайту: це дозволено в robots.txt.</p>

      <h2 className={H}>2. Що заборонено без письмового дозволу</h2>
      <p className={P}>Автоматичний збір даних із сайту та API: скрапінг, масове копіювання вакансій, описів, профілів компаній, новин, логотипів і підбірок; повторна публікація цих матеріалів на іншому сайті чи в застосунку; використання матеріалів для навчання моделей ШІ та створення баз даних. Те саме стосується обходу обмежень (robots.txt, лімітів, авторизації) і навантаження, що заважає роботі сайту.</p>
      <p className={P}>Дозвіл можна отримати лише письмово. До його отримання вважайте збір забороненим.</p>

      <h2 className={H}>3. Хто є автором матеріалів</h2>
      <p className={P}>Вакансії належать роботодавцям, які їх оприлюднили. Короткі описи, добірки, розбори та IT-новини підготовлені редакцією A1, тож авторські права на них захищені. Цитувати можна коротко, із посиланням на конкретну сторінку.</p>

      <h2 className={H}>4. Вакансії із зовнішніх джерел</h2>
      <p className={P}>Частина вакансій походить із відкритих джерел, і біля таких вакансій вказано джерело та кнопку переходу на оригінал. Ми не гарантуємо актуальність кожної вакансії: перевіряйте її на сторінці роботодавця.</p>

      <h2 className={H}>5. Відповідальність</h2>
      <p className={P}>Сайт надається «як є». Ми не відповідаємо за рішення роботодавців і не гарантуємо працевлаштування. Ми можемо обмежити доступ порушникам цих умов, зокрема заблокувати автоматичні запити.</p>

      <h2 className={H}>6. Зв’язок</h2>
      <p className={P}>Питання, скарги та запити на дозвіл на використання матеріалів надсилайте через застосунок A1 (розділ «Контакти»).</p>

      <h2 className={H} lang="en">Terms in English</h2>
      <p className={P} lang="en">Browsing, searching, applying and linking to our pages are welcome, and search engines may index the site. Without written permission it is prohibited to scrape or bulk-copy vacancies, company profiles, summaries or news from jobs.a1appp.com or its API, to republish them elsewhere, to use them to train machine-learning models, or to bypass robots.txt, rate limits or access controls. Vacancies belong to their employers; summaries and editorial content are by the A1 editorial team. We may block automated access that breaks these terms.</p>
    </main>
  );
}

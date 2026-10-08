// lib/news/mistral-large-4.ts -- первая новость раздела «IT новини» (08.10.2026).
//
// Первоисточник: https://mistral.ai/news/mistral-large-4/ (открыт и прочитан
// 08.10.2026). Все цифры ниже -- со страницы Mistral; где это заявление самой
// компании, а не независимая проверка, так и написано. Чего на странице нет
// (контекстное окно, лицензия, цены конкурентов), мы НЕ додумываем.

import type { NewsArticle } from "./types";

const SRC = {
  name: "Mistral AI",
  url: "https://mistral.ai/news/mistral-large-4/",
  title: "Mistral Large 4",
  accessed: "2026-10-08",
};

export const MISTRAL_UK: NewsArticle = {
  slug: "mistral-large-4-trylion-parametriv",
  lang: "uk",
  alt: "mistral-large-4-trillion-parameters",
  title: "Mistral Large 4: трильйон параметрів, але працюють лише 52 мільярди",
  h1: "Mistral Large 4: трильйон параметрів, але працюють лише 52 мільярди",
  description:
    "Mistral AI випустила Large 4: 1 трлн параметрів, з яких активні 52 млрд, $1,36 за мільйон вхідних токенів і відкриті ваги «до кінця місяця». Що це означає для IT-ринку.",
  kicker: "Штучний інтелект",
  published: "2026-10-08",
  updated: "2026-10-08",
  summary: [
    "Mistral Large 4 — модель на 1 трлн параметрів, але на кожен токен «прокидаються» лише 52 млрд (архітектура mixture-of-experts).",
    "Ціна в публічному прев’ю — $1,36 за мільйон вхідних і $4,18 за мільйон вихідних токенів; відкриті ваги Mistral обіцяє до кінця місяця.",
    "Усі бенчмарки — власні заяви компанії. У людській оцінці коду Large 4 друга з п’яти, позаду Claude Opus 5.",
  ],
  tags: ["Machine Learning", "Python", "PyTorch"],
  source: SRC,
  blocks: [
    {
      t: "p",
      text: "6 жовтня 2026 року французька Mistral AI відкрила публічне прев’ю **Mistral Large 4**. Станом на 8 жовтня тред про це на Hacker News зібрав майже 2000 очок і понад 1100 коментарів — одна з найгучніших IT-новин тижня. Розбираємо, що там насправді, а що поки лише обіцянка.",
    },
    {
      t: "stats",
      items: [
        { value: 1, suffix: " трлн", label: "параметрів усього" },
        { value: 52, suffix: " млрд", label: "активних на кожен токен" },
        { value: 160, suffix: "+", label: "мов, за заявою Mistral" },
        { value: 3800, label: "GPU NVIDIA Grace Blackwell на навчання" },
      ],
    },
    { t: "h2", text: "Трильйон на папері, 52 мільярди в роботі" },
    {
      t: "p",
      text: "Large 4 — це **mixture-of-experts** (суміш експертів): модель складається з великої кількості «експертів», а для кожного токена вмикається лише невелика частина. Простими словами: це як велика лікарня, де на кожен випадок кличуть двох-трьох потрібних лікарів, а не весь персонал одразу. Mistral пише про 1 трильйон параметрів у сумі та 52 мільярди активних — це близько **5,2 %**.",
    },
    {
      t: "experts",
      title: "Скільки моделі «прокидається» на один токен",
      caption: "Кожна точка — 1 млрд параметрів. Підсвічені — активні (52 з 1000). Решта чекають, поки їх покличуть.",
      total: 1000,
      active: 52,
      totalLabel: "млрд параметрів усього",
      activeLabel: "млрд активних",
    },
    {
      t: "p",
      text: "Чому це важливо не лише дослідникам: вартість і швидкість відповіді залежать від **активних** параметрів, а не від загального розміру. Тому така модель може бути «розумнішою» за свою ціну. Це також пояснює, чому Mistral може просити за неї відносно скромні гроші.",
    },
    { t: "h2", text: "Скільки це коштує — порахуйте самі" },
    {
      t: "p",
      text: "Ціни в прев’ю: **$1,36 за мільйон вхідних токенів і $4,18 за мільйон вихідних**. Конкурентів на сторінці Mistral із цінами не порівнює, тож ми теж не вигадуємо порівняння. Зате можна прикинути вартість власного проєкту:",
    },
    {
      t: "price",
      title: "Калькулятор вартості",
      caption: "Пересуньте повзунки: скільки мільйонів токенів ви очікуєте на вхід і на вихід. Приблизно 1 млн токенів — це 700–750 тисяч англійських слів.",
      input: 1.36,
      output: 4.18,
      labels: { input: "Вхідні токени, млн", output: "Вихідні токени, млн", total: "Орієнтовна вартість", unit: "$", perMillion: "за 1 млн" },
    },
    { t: "h2", text: "Бенчмарки: що заявляє Mistral і що це означає" },
    {
      t: "p",
      text: "На сторінці релізу багато цифр: **93 %** у Cybench (з 40 завдань), **61,7 %** у DeepSWE v1.1, **59,9 %** у AutomationBench (657 робочих процесів), **28,3 %** у Terminal-Bench 4. Важливо: це результати, які компанія опублікувала сама. Незалежної перевірки на момент публікації ми не бачили.",
    },
    {
      t: "p",
      text: "Найцікавіша цифра — оцінка людьми-розмітниками (Surge AI, шкала від 1 до 5) для написання коду. Тут Large 4 — друга з п’яти порівнюваних моделей, і Mistral цього не ховає:",
    },
    {
      t: "scores",
      title: "Людська оцінка коду (Surge AI, 1–5)",
      caption: "Чим більше, тим краще. Mistral Large 4 — друга, найкраща — Claude Opus 5.",
      min: 3,
      max: 4.5,
      rows: [
        { label: "Claude Opus 5", value: 4.22 },
        { label: "Mistral Large 4", value: 3.74, hl: true },
        { label: "GLM-5.3", value: 3.6 },
        { label: "Kimi K3", value: 3.59 },
        { label: "GLM-5.2", value: 3.4 },
      ],
      source: "Дані з сторінки релізу Mistral (6 жовтня 2026). Шкала графіка починається з 3, щоб різницю було видно.",
    },
    { t: "h2", text: "Що ще відомо" },
    {
      t: "ul",
      items: [
        "**Відкриті ваги — «до кінця місяця».** Яка саме ліцензія, на сторінці не сказано. Поки це обіцянка, а не факт.",
        "**160+ мов**, зокрема всі офіційні мови ЄС. Чи є серед них українська, Mistral окремо не зазначає — перевірте самі на своїх завданнях.",
        "**Європейська інфраструктура.** Модель обслуговується з дата-центрів Mistral у Європі; для чутливих задач заявлено приватну хмару й on-premise.",
        "**Мультимодальність:** розуміє графіки, документи й може «показувати» на зображенні.",
        "**Гроші:** Mistral згадує раунд Series D на €3 млрд — за її словами, найбільший в історії європейських tech-компаній.",
      ],
    },
    { t: "h2", text: "Наша думка: що це означає для айтішника в Україні" },
    {
      t: "note",
      text: "Це редакційна думка A1, а не факт із джерела. Ми можемо помилятися.",
    },
    {
      t: "ul",
      items: [
        "**Дешевші токени — більше продуктів на LLM.** А значить, більше роботи для тих, хто вміє вбудовувати моделі в реальні системи: бекенд, дані, evals, безпека. Скільки таких вакансій у нас зараз — у блоці нижче.",
        "**Відкриті ваги — шанс для компаній, які не можуть віддавати дані в чужу хмару:** банки, держсектор, медицина. Але лише якщо Mistral дотримає слово й ліцензія буде зрозумілою.",
        "**Не змінюйте стек через прес-реліз.** Найкраща реакція — взяти модель на свої реальні задачі, коли вийдуть ваги, і порівняти. Бенчмарк виробника — це реклама, навіть коли вона чесна.",
        "**Для кар’єри:** Python, PyTorch та вміння відрізнити «красиву демку» від продакшн-рішення цінуються стабільно — незалежно від того, чия модель цього тижня на першому місці.",
      ],
    },
    {
      t: "live",
      title: "Скільки ML-вакансій зараз в A1",
      caption: "Живі цифри з нашої бази вакансій; оновлюються автоматично.",
    },
    {
      t: "links",
      title: "Знайти вакансії за темою",
      links: [
        { href: "/jobs/stack/machine-learning", label: "Machine Learning" },
        { href: "/jobs/stack/pytorch", label: "PyTorch" },
        { href: "/jobs/stack/python", label: "Python" },
        { href: "/jobs/stack/data-science", label: "Data Science" },
        { href: "/stats", label: "📊 A1 Stats" },
      ],
    },
  ],
  faq: [
    {
      q: "Що таке Mistral Large 4?",
      a: "Це велика мовна модель французької компанії Mistral AI, випущена в публічне прев’ю 6 жовтня 2026 року. Вона має 1 трильйон параметрів, із яких 52 мільярди активні на кожен токен, приймає на вхід текст і зображення.",
    },
    {
      q: "Скільки коштує Mistral Large 4?",
      a: "У прев’ю заявлено $1,36 за мільйон вхідних токенів і $4,18 за мільйон вихідних токенів, за даними Mistral AI.",
    },
    {
      q: "Чи відкриті ваги Mistral Large 4?",
      a: "Mistral обіцяє випустити відкриті ваги до кінця місяця релізу. Ліцензію на сторінці анонсу не названо, тому остаточні умови використання слід перевіряти після публікації ваг.",
    },
  ],
  related: [],
};

export const MISTRAL_EN: NewsArticle = {
  slug: "mistral-large-4-trillion-parameters",
  lang: "en",
  alt: "mistral-large-4-trylion-parametriv",
  title: "Mistral Large 4: a trillion parameters, only 52 billion at work",
  h1: "Mistral Large 4: a trillion parameters, only 52 billion at work",
  description:
    "Mistral AI released Large 4: 1 trillion parameters with 52 billion active, $1.36 per million input tokens and open weights promised by the end of the month. What it means for the IT market.",
  kicker: "Artificial intelligence",
  published: "2026-10-08",
  updated: "2026-10-08",
  summary: [
    "Mistral Large 4 has 1 trillion parameters, but only 52 billion switch on for each token (a mixture-of-experts design).",
    "Preview pricing is $1.36 per million input tokens and $4.18 per million output tokens; Mistral promises open weights by the end of the month.",
    "Every benchmark here is the company's own claim. On a human coding evaluation Large 4 ranks second of five, behind Claude Opus 5.",
  ],
  tags: ["Machine Learning", "Python", "PyTorch"],
  source: SRC,
  blocks: [
    {
      t: "p",
      text: "On October 6, 2026, French lab Mistral AI opened the public preview of **Mistral Large 4**. As of October 8, the Hacker News thread about it has almost 2,000 points and over 1,100 comments, making it one of the loudest IT stories of the week. Here is what is actually in the announcement and what is still a promise.",
    },
    {
      t: "stats",
      items: [
        { value: 1, suffix: "T", label: "parameters in total" },
        { value: 52, suffix: "B", label: "active for every token" },
        { value: 160, suffix: "+", label: "languages, per Mistral" },
        { value: 3800, label: "NVIDIA Grace Blackwell GPUs used for training" },
      ],
    },
    { t: "h2", text: "A trillion on paper, 52 billion in action" },
    {
      t: "p",
      text: "Large 4 is a **mixture-of-experts** model: it contains a large pool of “experts”, and only a small slice of them is switched on for each token. Think of a big hospital that calls two or three relevant doctors to each case instead of the whole staff. Mistral reports 1 trillion parameters in total and 52 billion active, which is about **5.2%**.",
    },
    {
      t: "experts",
      title: "How much of the model wakes up per token",
      caption: "Each dot is 1 billion parameters. Highlighted dots are active (52 of 1,000). The rest wait to be called.",
      total: 1000,
      active: 52,
      totalLabel: "billion parameters in total",
      activeLabel: "billion active",
    },
    {
      t: "p",
      text: "Why it matters beyond research: cost and response speed depend on the **active** parameters, not the total size. That is how a model can be “smarter” for its price, and why Mistral can charge relatively modest money for it.",
    },
    { t: "h2", text: "What it costs: calculate it yourself" },
    {
      t: "p",
      text: "Preview prices are **$1.36 per million input tokens and $4.18 per million output tokens**. Mistral does not compare prices with competitors on the page, so we do not invent a comparison either. You can still estimate the bill for your own project:",
    },
    {
      t: "price",
      title: "Cost calculator",
      caption: "Move the sliders: how many million tokens you expect to send and to receive. Roughly 1 million tokens is 700–750 thousand English words.",
      input: 1.36,
      output: 4.18,
      labels: { input: "Input tokens, millions", output: "Output tokens, millions", total: "Estimated cost", unit: "$", perMillion: "per 1M" },
    },
    { t: "h2", text: "Benchmarks: what Mistral claims and what it means" },
    {
      t: "p",
      text: "The release page is full of numbers: **93%** on Cybench (out of 40 challenges), **61.7%** on DeepSWE v1.1, **59.9%** on AutomationBench (657 workflows), **28.3%** on Terminal-Bench 4. The catch: these are results the company published itself, and at the time of writing we have seen no independent verification.",
    },
    {
      t: "p",
      text: "The most interesting number is the human rating of coding ability (Surge AI, scale 1–5). Large 4 is second of five compared models, and Mistral does not hide it:",
    },
    {
      t: "scores",
      title: "Human coding evaluation (Surge AI, 1–5)",
      caption: "Higher is better. Mistral Large 4 is second; Claude Opus 5 is first.",
      min: 3,
      max: 4.5,
      rows: [
        { label: "Claude Opus 5", value: 4.22 },
        { label: "Mistral Large 4", value: 3.74, hl: true },
        { label: "GLM-5.3", value: 3.6 },
        { label: "Kimi K3", value: 3.59 },
        { label: "GLM-5.2", value: 3.4 },
      ],
      source: "Data from the Mistral release page (October 6, 2026). The chart scale starts at 3 so the differences are visible.",
    },
    { t: "h2", text: "What else we know" },
    {
      t: "ul",
      items: [
        "**Open weights “by the end of the month”.** The page does not name the license. For now it is a promise, not a fact.",
        "**160+ languages**, including all official EU languages. Whether Ukrainian is among them is not stated, so test it on your own tasks.",
        "**European infrastructure.** The model is served from Mistral's datacenters in Europe; private cloud and on-premise are offered for sensitive work.",
        "**Multimodal:** it understands charts and documents and can point at things in an image.",
        "**Money:** Mistral mentions a €3 billion Series D, which it calls the largest equity round ever raised by a European tech company.",
      ],
    },
    { t: "h2", text: "Our take: what it means for people in IT" },
    {
      t: "note",
      text: "This is A1's editorial opinion, not a fact from the source. We may be wrong.",
    },
    {
      t: "ul",
      items: [
        "**Cheaper tokens mean more products built on LLMs.** That means more work for people who can wire models into real systems: backend, data, evals, security. How many such jobs we have right now is in the live block below.",
        "**Open weights are a chance for companies that cannot send data to someone else's cloud:** banks, government, healthcare. But only if Mistral keeps its word and the license is clear.",
        "**Do not switch your stack because of a press release.** The best reaction is to run the model on your real tasks once weights ship and compare. A vendor benchmark is advertising, even an honest one.",
        "**For your career:** Python, PyTorch and the ability to tell a pretty demo from a production system stay valuable no matter whose model is on top this week.",
      ],
    },
    {
      t: "live",
      title: "How many ML jobs are on A1 right now",
      caption: "Live numbers from our vacancy database, updated automatically.",
    },
    {
      t: "links",
      title: "Find jobs on this topic",
      links: [
        { href: "/jobs/stack/machine-learning", label: "Machine Learning" },
        { href: "/jobs/stack/pytorch", label: "PyTorch" },
        { href: "/jobs/stack/python", label: "Python" },
        { href: "/jobs/stack/data-science", label: "Data Science" },
        { href: "/stats", label: "📊 A1 Stats" },
      ],
    },
  ],
  faq: [
    {
      q: "What is Mistral Large 4?",
      a: "It is a large language model from French company Mistral AI, released in public preview on October 6, 2026. It has 1 trillion parameters, 52 billion of them active per token, and accepts text and images as input.",
    },
    {
      q: "How much does Mistral Large 4 cost?",
      a: "The preview is priced at $1.36 per million input tokens and $4.18 per million output tokens, according to Mistral AI.",
    },
    {
      q: "Are the Mistral Large 4 weights open?",
      a: "Mistral promises to release open weights by the end of the month of the launch. The announcement does not name the license, so final usage terms should be checked once the weights are published.",
    },
  ],
  related: [],
};

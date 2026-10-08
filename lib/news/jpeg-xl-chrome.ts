// lib/news/jpeg-xl-chrome.ts -- друга новина розділу «IT новини» (08.10.2026).
//
// Первоисточник: https://developer.chrome.com/blog/jpeg-xl-in-chrome (Chrome for
// Developers, 06.10.2026; відкрито й прочитано 08.10.2026). Усі цифри нижче --
// зі статті; «30-50 %» і «без помилок безпеки пам'яті» -- заяви авторів Chrome,
// а не наші заміри. Чого в статті немає (дата релізу, підтримка в інших
// браузерах, приклади розмітки), ми НЕ додумуємо. Єдиний зовнішній контекст --
// історична довідка про 2022 рік, вона явно позначена як така.

import type { NewsArticle } from "./types";

const SRC = {
  name: "Chrome for Developers",
  url: "https://developer.chrome.com/blog/jpeg-xl-in-chrome",
  title: "Shipping JPEG XL in Chrome",
  accessed: "2026-10-08",
};

export const JXL_UK: NewsArticle = {
  slug: "chrome-155-jpeg-xl",
  lang: "uk",
  alt: "chrome-155-jpeg-xl-support",
  title: "Chrome 155 вчить браузер JPEG XL: картинки на 30–50 % легші за JPEG",
  h1: "Chrome 155 вчить браузер JPEG XL: картинки на 30–50 % легші за JPEG",
  description:
    "Chrome 155 отримує підтримку формату JPEG XL з декодером на Rust. За заявою команди Chrome, стиснення на 30–50 % краще, ніж у JPEG. Що це означає для IT-ринку.",
  kicker: "Веб",
  published: "2026-10-08",
  updated: "2026-10-08",
  summary: [
    "Chrome 155 додає декодування JPEG XL (.jxl) — формату, який, за заявою авторів Chrome, стискає на 30–50 % краще за JPEG.",
    "Декодер — jxl-rs, написаний на Rust: команда пояснює це безпекою пам’яті, бо декодери зображень — популярна мішень для атак.",
    "Chrome радить пробувати і AVIF, і JPEG XL: другий найкорисніший для фото, без втрат і там, де важливе поступове завантаження.",
  ],
  thumb: { motif: "bars", hue: "teal", big: "30–50%", small: "краще стиснення за JPEG (заява Chrome)" },
  tags: ["JavaScript", "TypeScript", "React"],
  source: SRC,
  blocks: [
    {
      t: "p",
      text: "6 жовтня 2026 року команда Chrome оголосила в офіційному блозі, що **Chrome 155** отримає підтримку формату **JPEG XL**. Станом на 8 жовтня допис на Hacker News зібрав понад 500 очок — для веброзробників це одна з найцікавіших новин тижня. Розбираємо, що там сказано, а що ні.",
    },
    {
      t: "stats",
      items: [
        { value: 155, label: "версія Chrome з підтримкою .jxl" },
        { value: 50, prefix: "30–", suffix: "%", label: "краще стиснення, ніж у JPEG (заява Chrome)" },
        { value: 2, label: "формати, які радять пробувати: AVIF і JPEG XL" },
      ],
    },
    { t: "h2", text: "Що саме сталося" },
    {
      t: "p",
      text: "Chrome додає **декодування** файлів .jxl (тобто браузер їх показуватиме). У статті сказано, що рішення ухвалили «на основі стабільних відгуків і прохань веброзробників» — за словами авторів, JPEG XL був популярною пропозицією в процесі Interop і у 2026 році, і кілька років до того. Точної дати релізу стабільної версії в статті немає.",
    },
    {
      t: "note",
      text: "Контекст не зі статті: у 2022 році Chrome прибирав свою експериментальну підтримку JPEG XL. Тож це повернення формату, а не вперше. У самому дописі про це не йдеться.",
    },
    { t: "h2", text: "Чому декодер на Rust" },
    {
      t: "p",
      text: "Chrome інтегрує **jxl-rs** — декодер JPEG XL, повністю написаний на Rust. Автори пояснюють вибір безпекою пам’яті: декодери зображень — одна з основних поверхонь для атак, бо браузер відкриває картинки з будь-яких сайтів. Для швидкості вони зробили власний шар SIMD-інструкцій jxl_simd, натхненний бібліотекою Highway від Google. Також автори заявляють, що перевіряли код фазингом і ШІ-рев’ю та не знайшли помилок безпеки пам’яті за всю історію цієї реалізації. Це їхня заява, не незалежний аудит.",
    },
    { t: "h2", text: "Скільки це може заощадити: порахуйте самі" },
    {
      t: "sizes",
      title: "Вага картинок: JPEG і JPEG XL",
      caption: "Переміщуйте повзунок: скільки зараз важать зображення вашої сторінки.",
      start: 5,
      max: 20,
      unit: "МБ",
      lowPct: 30,
      highPct: 50,
      labels: {
        before: "JPEG зараз",
        after: "У JPEG XL (за заявою Chrome)",
        slider: "Вага зображень на сторінці",
        range: "Світла частина — якщо економія лише 30 %, яскрава — якщо 50 %.",
        disclaimer:
          "Умовний розрахунок: ми читаємо «стиснення на 30–50 % краще» як «файл на 30–50 % менший». Це заява авторів Chrome, а не наш замір; на ваших фото результат може бути іншим.",
      },
    },
    { t: "h2", text: "Що відомо про можливості формату" },
    {
      t: "ul",
      items: [
        "**Стиснення:** за заявою авторів, на 30–50 % краще, ніж у JPEG; є також режим без втрат.",
        "**Перекодування старих JPEG без втрат** — тобто існуючі картинки можна зробити легшими, нічого не втративши.",
        "**HDR** вбудований у формат.",
        "**Поступове завантаження:** автори описують «дрібнозернисте» поступове декодування — картинка проявляється частинами.",
        "**Кому найкорисніше:** на думку авторів, для фото з високою якістю чи без втрат, а також там, де важливе поступове завантаження. Радять спробувати і AVIF, і JPEG XL та порівняти на своїх даних.",
        "**Чого в статті немає:** підтримки в інших браузерах, прикладів розмітки і конкретної дати стабільного релізу. Стаття лише згадує тест-набір Interop 2026 JPEG XL Investigation, який Chrome проходить.",
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
        "**Нова зручна оптимізація для фронтенда.** Якщо сайт важкий від картинок, JPEG XL — ще один інструмент, який варто виміряти поруч з AVIF і WebP. Але вирішуйте за цифрами на своїх зображеннях, не за прес-релізом.",
        "**Підтримка залежить від браузера.** Поки в статті немає даних про інші браузери, безпечна стратегія — віддавати нові формати з запасним JPEG для тих, хто їх не показує.",
        "**Rust дедалі глибше заходить у браузери.** Саме про це говорить вибір декодера: коли код, що обробляє чужі файли, переписують на Rust заради безпеки. Для кар’єри це ще один аргумент подивитися в бік Rust.",
        "**Для кар’єри:** оптимізація продуктивності сайтів (Core Web Vitals, вага зображень) — стабільно цінна навичка фронтенд-розробника, незалежно від формату.",
      ],
    },
    {
      t: "links",
      title: "Знайти вакансії за темою",
      links: [
        { href: "/jobs/stack/javascript", label: "JavaScript" },
        { href: "/jobs/stack/typescript", label: "TypeScript" },
        { href: "/jobs/stack/react", label: "React" },
        { href: "/stats", label: "📊 A1 Stats" },
      ],
    },
  ],
  faq: [
    {
      q: "Яка версія Chrome підтримує JPEG XL?",
      a: "За офіційним блогом Chrome for Developers від 6 жовтня 2026 року, підтримка декодування JPEG XL з’явиться в Chrome 155. Точної дати релізу в статті не вказано.",
    },
    {
      q: "Чим JPEG XL кращий за JPEG?",
      a: "За заявою авторів Chrome, JPEG XL стискає на 30–50 % краще за JPEG, має режим без втрат, вбудований HDR і вміє поступово «проявляти» зображення під час завантаження. Також можна без втрат перекодувати наявні JPEG.",
    },
    {
      q: "Що таке jxl-rs?",
      a: "Це декодер JPEG XL, написаний на Rust, який Chrome інтегрує у браузер. Автори обрали Rust через безпеку пам’яті, адже декодери зображень — популярна мішень для атак.",
    },
  ],
  related: [],
};

export const JXL_EN: NewsArticle = {
  slug: "chrome-155-jpeg-xl-support",
  lang: "en",
  alt: "chrome-155-jpeg-xl",
  title: "Chrome 155 adds JPEG XL: images 30–50% lighter than JPEG",
  h1: "Chrome 155 adds JPEG XL: images 30–50% lighter than JPEG",
  description:
    "Chrome 155 ships JPEG XL decoding with a Rust decoder. The Chrome team claims 30–50% better compression than JPEG. What it means for the IT market.",
  kicker: "Web",
  published: "2026-10-08",
  updated: "2026-10-08",
  summary: [
    "Chrome 155 adds decoding for JPEG XL (.jxl), a format the Chrome team says compresses 30–50% better than JPEG.",
    "The decoder is jxl-rs, written in Rust: the team cites memory safety, since image decoders are a major attack surface.",
    "Chrome suggests trying both AVIF and JPEG XL; the latter helps most for photos, lossless needs and progressive loading.",
  ],
  thumb: { motif: "bars", hue: "teal", big: "30–50%", small: "better compression than JPEG (Chrome's claim)" },
  tags: ["JavaScript", "TypeScript", "React"],
  source: SRC,
  blocks: [
    {
      t: "p",
      text: "On October 6, 2026, the Chrome team announced on its official blog that **Chrome 155** will support **JPEG XL**. As of October 8, the Hacker News thread has over 500 points, making it one of the most interesting stories of the week for web developers. Here is what the post says and what it leaves out.",
    },
    {
      t: "stats",
      items: [
        { value: 155, label: "Chrome version with .jxl support" },
        { value: 50, prefix: "30–", suffix: "%", label: "better compression than JPEG (Chrome's claim)" },
        { value: 2, label: "formats the team suggests trying: AVIF and JPEG XL" },
      ],
    },
    { t: "h2", text: "What actually happened" },
    {
      t: "p",
      text: "Chrome is adding **decoding** of .jxl files, meaning the browser will display them. The post says the decision was “based on consistent feedback and requests from web developers”; according to the authors, JPEG XL was a popular proposal in the Interop process, both in 2026 and for several years before. The post gives no exact stable release date.",
    },
    {
      t: "note",
      text: "Context that is not from the post: in 2022 Chrome removed its experimental JPEG XL support, so this is a return of the format, not a first. The post itself does not discuss that.",
    },
    { t: "h2", text: "Why a Rust decoder" },
    {
      t: "p",
      text: "Chrome integrates **jxl-rs**, a JPEG XL decoder written entirely in Rust. The authors justify it with memory safety: image decoders are a major attack surface, because a browser opens pictures from any site. For speed they built their own SIMD layer, jxl_simd, inspired by Google’s Highway library. They also state they checked the code with fuzzing and AI review and found no memory-safety bugs in the implementation’s history. That is their claim, not an independent audit.",
    },
    { t: "h2", text: "How much could it save: calculate it yourself" },
    {
      t: "sizes",
      title: "Image weight: JPEG vs JPEG XL",
      caption: "Move the slider: how much do your page’s images weigh today?",
      start: 5,
      max: 20,
      unit: "MB",
      lowPct: 30,
      highPct: 50,
      labels: {
        before: "JPEG today",
        after: "With JPEG XL (Chrome's claim)",
        slider: "Image weight on the page",
        range: "The faded part is a 30% saving, the bright part is 50%.",
        disclaimer:
          "Illustrative math: we read “30–50% better compression” as “a file 30–50% smaller”. It is the Chrome authors’ claim, not our measurement; your photos may behave differently.",
      },
    },
    { t: "h2", text: "What is known about the format" },
    {
      t: "ul",
      items: [
        "**Compression:** according to the authors, 30–50% better than JPEG; a lossless mode exists too.",
        "**Lossless transcoding of existing JPEGs**, so current images can get lighter without losing anything.",
        "**Built-in HDR.**",
        "**Progressive loading:** the authors describe fine-grained progressive decoding, where the image appears in stages.",
        "**Who benefits most:** by the authors’ view, high-fidelity or lossless photos and cases where progressive loading matters. They suggest trying both AVIF and JPEG XL on your own data.",
        "**What the post does not say:** support in other browsers, markup examples, or an exact stable release date. It only mentions the Interop 2026 JPEG XL Investigation test suite, which Chrome passes.",
      ],
    },
    { t: "h2", text: "Our take: what it means for IT people" },
    {
      t: "note",
      text: "This is A1 editorial opinion, not a fact from the source. We may be wrong.",
    },
    {
      t: "ul",
      items: [
        "**A new frontend optimization to measure.** If your site is heavy on images, JPEG XL is another tool to test next to AVIF and WebP. Decide by numbers on your own images, not by a press post.",
        "**Support depends on the browser.** With no data on other browsers in the post, the safe approach is serving new formats with a JPEG fallback for those who cannot display them.",
        "**Rust keeps moving into browsers.** The decoder choice shows it: code that handles untrusted files is being written in Rust for safety. For a career, one more reason to look at Rust.",
        "**For your career:** web performance (Core Web Vitals, image weight) is a steadily valued frontend skill, whichever format wins.",
      ],
    },
    {
      t: "links",
      title: "Find jobs by topic",
      links: [
        { href: "/jobs/stack/javascript", label: "JavaScript" },
        { href: "/jobs/stack/typescript", label: "TypeScript" },
        { href: "/jobs/stack/react", label: "React" },
        { href: "/stats", label: "📊 A1 Stats" },
      ],
    },
  ],
  faq: [
    {
      q: "Which Chrome version supports JPEG XL?",
      a: "According to the Chrome for Developers blog of October 6, 2026, JPEG XL decoding ships in Chrome 155. The post does not give an exact release date.",
    },
    {
      q: "How is JPEG XL better than JPEG?",
      a: "The Chrome authors claim 30–50% better compression than JPEG, plus a lossless mode, built-in HDR and progressive decoding where the image appears in stages. Existing JPEGs can also be transcoded losslessly.",
    },
    {
      q: "What is jxl-rs?",
      a: "It is a JPEG XL decoder written in Rust that Chrome integrates into the browser. The authors chose Rust for memory safety, since image decoders are a common attack target.",
    },
  ],
  related: [],
};

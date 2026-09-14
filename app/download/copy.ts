// app/download/copy.ts
//
// Aleksandr, 2026-09-14: установочная страница A1, которую он шарит в
// соцсетях (jobs.a1appp.com/download). Все тексты и ссылки собраны здесь
// одним объектом — менять их можно не трогая вёрстку, и локализация уже
// разложена по тем же девяти языкам, что и весь остальной сайт
// (components/t.tsx: LOCALES).
//
// Ссылки на магазины — реальные, присланы Александром 14.09.2026. Если
// какая-то из них изменится, правится ровно одна строка ниже.
import type { Locale } from "@/components/t";

export const DOWNLOAD_LINKS = {
  googlePlay: "https://play.google.com/store/apps/details?id=com.aone.aoneapp",
  appStore: "https://apps.apple.com/ua/app/a1-job-search-jobs-hiring/id6443859764",
  // Aleksandr, 14.09.2026: раньше вела на a1appp.com — маркетинговый
  // лендинг-заглушку, толку от которой ноль. Теперь «Сайт A1» ведёт на
  // сам джоб-борд, над которым мы и работаем.
  website: "https://jobs.a1appp.com",
} as const;

export type DownloadCopy = {
  /**
   * Первая часть заголовка — белая.
   *
   * Aleksandr, 14.09.2026: «наш основной текст, который должен быть
   * большим, это как раз "Знаходь роботу та спеціалістів" — ты с первых
   * слов понимаешь, что это за оффер». Так и сделано: крупно то, что
   * объясняет продукт, слоган ушёл в подзаголовок.
   */
  headline: string;
  /** Вторая (последняя смысловая) строка заголовка — синим акцентом. */
  headlineAccent: string;
  /** Подзаголовок — слоган и вторая мысль (прямое общение). */
  subtitle: string;
  /** Верхняя строка на обеих кнопках («Завантажити»). */
  downloadVerb: string;
  /** Нижняя строка кнопки Android («для Android»). */
  android: string;
  /** Нижняя строка кнопки iOS («для iOS»). */
  ios: string;
  /** Мелкая подпись под кнопками. */
  note: string;
  /** Текст ссылки на основной сайт, вверху справа. */
  site: string;
};

export const DOWNLOAD_COPY: Record<Locale, DownloadCopy> = {
  uk: {
    headline: "Знаходь роботу",
    headlineAccent: "та спеціалістів.",
    subtitle: "Твоя наступна можливість — в один дотик. Спілкуйся напряму.",
    downloadVerb: "Завантажити",
    android: "для Android",
    ios: "для iOS",
    note: "Обери свою платформу та приєднуйся до A1",
    site: "Сайт A1",
  },
  en: {
    headline: "Find jobs",
    headlineAccent: "and specialists.",
    subtitle: "Your next opportunity — one tap away. Message people directly.",
    downloadVerb: "Download",
    android: "for Android",
    ios: "for iOS",
    note: "Choose your platform and join A1",
    site: "A1 website",
  },
  ru: {
    headline: "Находи работу",
    headlineAccent: "и специалистов.",
    subtitle: "Твоя следующая возможность — в одно касание. Общайся напрямую.",
    downloadVerb: "Скачать",
    android: "для Android",
    ios: "для iOS",
    note: "Выбери свою платформу и присоединяйся к A1",
    site: "Сайт A1",
  },
  de: {
    headline: "Finde Jobs",
    headlineAccent: "und Fachkräfte.",
    subtitle: "Deine nächste Chance — nur ein Fingertipp. Schreib direkt.",
    downloadVerb: "Herunterladen",
    android: "für Android",
    ios: "für iOS",
    note: "Wähle deine Plattform und komm zu A1",
    site: "A1-Website",
  },
  es: {
    headline: "Encuentra trabajo",
    headlineAccent: "y especialistas.",
    subtitle: "Tu próxima oportunidad — a un solo toque. Habla directamente.",
    downloadVerb: "Descargar",
    android: "para Android",
    ios: "para iOS",
    note: "Elige tu plataforma y únete a A1",
    site: "Sitio de A1",
  },
  fr: {
    headline: "Trouve un emploi",
    headlineAccent: "et des spécialistes.",
    subtitle: "Ta prochaine opportunité — en un seul geste. Échange en direct.",
    downloadVerb: "Télécharger",
    android: "pour Android",
    ios: "pour iOS",
    note: "Choisis ta plateforme et rejoins A1",
    site: "Site A1",
  },
  pl: {
    headline: "Znajdź pracę",
    headlineAccent: "i specjalistów.",
    subtitle: "Twoja kolejna szansa — w jednym dotknięciu. Pisz bezpośrednio.",
    downloadVerb: "Pobierz",
    android: "na Androida",
    ios: "na iOS",
    note: "Wybierz swoją platformę i dołącz do A1",
    site: "Strona A1",
  },
  ptBR: {
    headline: "Encontre vagas",
    headlineAccent: "e especialistas.",
    subtitle: "Sua próxima oportunidade — a um toque. Converse direto.",
    downloadVerb: "Baixar",
    android: "para Android",
    ios: "para iOS",
    note: "Escolha sua plataforma e entre no A1",
    site: "Site do A1",
  },
  zh: {
    headline: "寻找工作",
    headlineAccent: "与专业人才。",
    subtitle: "你的下一个机会，只需轻轻一点。可直接沟通。",
    downloadVerb: "下载",
    android: "Android 版",
    ios: "iOS 版",
    note: "选择你的平台，加入 A1",
    site: "A1 官网",
  },
};

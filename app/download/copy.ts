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
  /** Первая часть заголовка — белая. */
  headline: string;
  /** Вторая (последняя смысловая) строка заголовка — синим акцентом. */
  headlineAccent: string;
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
    headline: "Твоя наступна можливість —",
    headlineAccent: "в один дотик.",
    subtitle: "Знаходь роботу та спеціалістів. Спілкуйся напряму.",
    downloadVerb: "Завантажити",
    android: "для Android",
    ios: "для iOS",
    note: "Обери свою платформу та приєднуйся до A1",
    site: "Сайт A1",
  },
  en: {
    headline: "Your next opportunity —",
    headlineAccent: "one tap away.",
    subtitle: "Find jobs and specialists. Message them directly.",
    downloadVerb: "Download",
    android: "for Android",
    ios: "for iOS",
    note: "Choose your platform and join A1",
    site: "A1 website",
  },
  ru: {
    headline: "Твоя следующая возможность —",
    headlineAccent: "в одно касание.",
    subtitle: "Находи работу и специалистов. Общайся напрямую.",
    downloadVerb: "Скачать",
    android: "для Android",
    ios: "для iOS",
    note: "Выбери свою платформу и присоединяйся к A1",
    site: "Сайт A1",
  },
  de: {
    headline: "Deine nächste Chance —",
    headlineAccent: "nur ein Fingertipp.",
    subtitle: "Finde Jobs und Fachkräfte. Schreib direkt.",
    downloadVerb: "Herunterladen",
    android: "für Android",
    ios: "für iOS",
    note: "Wähle deine Plattform und komm zu A1",
    site: "A1-Website",
  },
  es: {
    headline: "Tu próxima oportunidad —",
    headlineAccent: "a un solo toque.",
    subtitle: "Encuentra trabajo y especialistas. Habla directamente.",
    downloadVerb: "Descargar",
    android: "para Android",
    ios: "para iOS",
    note: "Elige tu plataforma y únete a A1",
    site: "Sitio de A1",
  },
  fr: {
    headline: "Ta prochaine opportunité —",
    headlineAccent: "en un seul geste.",
    subtitle: "Trouve un emploi et des spécialistes. Échange en direct.",
    downloadVerb: "Télécharger",
    android: "pour Android",
    ios: "pour iOS",
    note: "Choisis ta plateforme et rejoins A1",
    site: "Site A1",
  },
  pl: {
    headline: "Twoja kolejna szansa —",
    headlineAccent: "w jednym dotknięciu.",
    subtitle: "Znajdź pracę i specjalistów. Pisz bezpośrednio.",
    downloadVerb: "Pobierz",
    android: "na Androida",
    ios: "na iOS",
    note: "Wybierz swoją platformę i dołącz do A1",
    site: "Strona A1",
  },
  ptBR: {
    headline: "Sua próxima oportunidade —",
    headlineAccent: "a um toque de distância.",
    subtitle: "Encontre vagas e especialistas. Converse direto.",
    downloadVerb: "Baixar",
    android: "para Android",
    ios: "para iOS",
    note: "Escolha sua plataforma e entre no A1",
    site: "Site do A1",
  },
  zh: {
    headline: "你的下一个机会 —",
    headlineAccent: "只需轻轻一点。",
    subtitle: "寻找工作与专业人才，直接沟通。",
    downloadVerb: "下载",
    android: "Android 版",
    ios: "iOS 版",
    note: "选择你的平台，加入 A1",
    site: "A1 官网",
  },
};

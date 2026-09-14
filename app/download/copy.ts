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
  /**
   * Подзаголовок — слоган и вторая мысль (прямое общение).
   * Aleksandr, 14.09.2026: «поменяй "твоя" на "Ваша"» — вежливая форма.
   * Глагол согласован с ней там, где язык различает формы (uk, ru, de,
   * es, fr); в en/pt/zh обращение и так нейтральное.
   */
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
  /**
   * Заголовок мини-превью сайта, которое раскрывается при наведении.
   * Aleksandr, 14.09.2026 — его формулировка и его эмодзи кота.
   */
  previewTitle: string;
  /** Одна строка о том, что человека ждёт на сайте. */
  previewText: string;
  /** Надпись на кнопке внутри превью. */
  previewCta: string;
  /** Подпись к QR-коду (показывается только на десктопе). */
  qrHint: string;
};

export const DOWNLOAD_COPY: Record<Locale, DownloadCopy> = {
  uk: {
    headline: "Знаходьте роботу",
    headlineAccent: "та спеціалістів.",
    subtitle: "Ваша наступна можливість — в один дотик. Спілкуйтеся напряму.",
    downloadVerb: "Завантажити",
    android: "для Android",
    ios: "для iOS",
    note: "Оберіть свою платформу та приєднуйтеся до A1",
    site: "Сайт A1",
    previewTitle: "Завітайте до веб-версії A1 🐈‍⬛",
    previewText: "Вакансії та фахівці прямо у браузері",
    previewCta: "Перейти на сайт",
    qrHint: "Наведіть камеру телефона",
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
    previewTitle: "Visit the A1 web version 🐈‍⬛",
    previewText: "Jobs and specialists right in your browser",
    previewCta: "Open the site",
    qrHint: "Point your phone camera here",
  },
  ru: {
    headline: "Находите работу",
    headlineAccent: "и специалистов.",
    subtitle: "Ваша следующая возможность — в одно касание. Общайтесь напрямую.",
    downloadVerb: "Скачать",
    android: "для Android",
    ios: "для iOS",
    note: "Выберите свою платформу и присоединяйтесь к A1",
    site: "Сайт A1",
    previewTitle: "Загляните в веб-версию A1 🐈‍⬛",
    previewText: "Вакансии и специалисты прямо в браузере",
    previewCta: "Перейти на сайт",
    qrHint: "Наведите камеру телефона",
  },
  de: {
    headline: "Finden Sie Jobs",
    headlineAccent: "und Fachkräfte.",
    subtitle: "Ihre nächste Chance — nur ein Fingertipp. Schreiben Sie direkt.",
    downloadVerb: "Herunterladen",
    android: "für Android",
    ios: "für iOS",
    note: "Wählen Sie Ihre Plattform und kommen Sie zu A1",
    site: "A1-Website",
    previewTitle: "Schau in die A1 Web-Version 🐈‍⬛",
    previewText: "Jobs und Fachkräfte direkt im Browser",
    previewCta: "Zur Website",
    qrHint: "Handykamera darauf richten",
  },
  es: {
    headline: "Encuentre trabajo",
    headlineAccent: "y especialistas.",
    subtitle: "Su próxima oportunidad — a un solo toque. Hable directamente.",
    downloadVerb: "Descargar",
    android: "para Android",
    ios: "para iOS",
    note: "Elija su plataforma y únase a A1",
    site: "Sitio de A1",
    previewTitle: "Visita la versión web de A1 🐈‍⬛",
    previewText: "Vacantes y especialistas en tu navegador",
    previewCta: "Ir al sitio",
    qrHint: "Apunta la cámara del móvil",
  },
  fr: {
    headline: "Trouvez un emploi",
    headlineAccent: "et des spécialistes.",
    subtitle: "Votre prochaine opportunité — en un seul geste. Échangez en direct.",
    downloadVerb: "Télécharger",
    android: "pour Android",
    ios: "pour iOS",
    note: "Choisissez votre plateforme et rejoignez A1",
    site: "Site A1",
    previewTitle: "Découvre la version web d'A1 🐈‍⬛",
    previewText: "Offres et spécialistes directement dans le navigateur",
    previewCta: "Ouvrir le site",
    qrHint: "Vise avec l'appareil photo",
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
    previewTitle: "Zajrzyj do wersji webowej A1 🐈‍⬛",
    previewText: "Oferty i specjaliści prosto w przeglądarce",
    previewCta: "Przejdź na stronę",
    qrHint: "Zeskanuj telefonem",
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
    previewTitle: "Conheça a versão web do A1 🐈‍⬛",
    previewText: "Vagas e especialistas direto no navegador",
    previewCta: "Abrir o site",
    qrHint: "Aponte a câmera do celular",
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
    previewTitle: "来看看 A1 网页版 🐈‍⬛",
    previewText: "职位与人才，直接在浏览器里",
    previewCta: "打开网站",
    qrHint: "用手机相机扫一扫",
  },
};

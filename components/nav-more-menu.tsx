// components/nav-more-menu.tsx
//
// Александр, 08.10.2026: «три боковые кнопки возле аватара ... сделаем три
// точки, и там на них повесим: скачать приложение, A1 Stats, игру в самый низ.
// Карту оставим отдельной иконкой. При наведении пусть окошки-превью остаются,
// просто чтобы красиво оверлеилось. Три точки при ховере тоже анимированные».
//
// Что здесь. Круглая кнопка «⋯» (44px, как все круги шапки). Наведение (или
// клик) открывает меню -- тем же useHoverPanel, что и меню аватара, поэтому
// открывается/закрывается одинаково. Наведение на строку меню показывает
// превью слева от меню -- те самые окошки, что раньше висели над отдельными
// кнопками «скачать» и «игра» (их разметка перенесена сюда, старые файлы
// get-app-button.tsx и game-button.tsx больше нигде не подключены), плюс новое
// окошко «A1 Stats» с живыми цифрами.
//
// Как устроено превью, чтобы не «залипало». Оно лежит ВНУТРИ панели меню
// (position:absolute, right-full) и отделено от неё отступом pr-2, а не
// зазором -- получается один сплошной прямоугольник наведения, как у остальных
// панелей (см. шапку lib/use-hover-panel.ts, пункт 1). Хук проверяет курсор по
// геометрии панели, а превью торчит за её границу, поэтому у превью есть своя
// пара ссылок (previewRef) -- иначе при наведении на него меню закрывалось бы.
//
// Цифры для превью Stats берём из /stats/data (тот же файл, что обновляет саму
// страницу) -- один раз, при первом наведении на строку, не при загрузке сайта.
//
// На телефоне кнопки нет (как и у соседних): там мало места, а установку
// предлагает <AppOpenBanner/>. Превью скрыто на узких экранах и на сенсорных.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DOWNLOAD_COPY } from "@/app/download/copy";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { useActiveLocale } from "@/lib/use-active-locale";
import { COPY, makeT } from "@/app/invite/copy";

type Id = "app" | "news" | "events" | "stats" | "interview" | "ai" | "invite" | "game";

function L(uk: string, en: string, ru: string, rest?: Partial<Record<Locale, string>>): Record<Locale, string> {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en, ...rest };
}

const TXT = {
  app: {
    title: L("Завантажити додаток", "Get the app", "Скачать приложение", {
      de: "App laden", es: "Descargar la app", fr: "Télécharger l'app", pl: "Pobierz aplikację", ptBR: "Baixar o app", zh: "下载应用",
    }),
    sub: L("Android та iOS", "Android and iOS", "Android и iOS", {
      de: "Android und iOS", es: "Android e iOS", fr: "Android et iOS", pl: "Android i iOS", ptBR: "Android e iOS", zh: "Android 和 iOS",
    }),
    prev: L(
      "Android та iOS — вакансії й чати в кишені",
      "Android and iOS — jobs and chats in your pocket",
      "Android и iOS — вакансии и чаты в кармане",
      {
        de: "Android und iOS — Jobs und Chats in der Tasche",
        es: "Android e iOS: vacantes y chats en tu bolsillo",
        fr: "Android et iOS — offres et messages dans votre poche",
        pl: "Android i iOS — oferty i czaty w kieszeni",
        ptBR: "Android e iOS — vagas e chats no bolso",
        zh: "Android 与 iOS——口袋里的职位和聊天",
      },
    ),
  },
  news: {
    title: L("IT новини", "IT News", "IT новости", {
      de: "IT-News", es: "Noticias IT", fr: "Actus IT", pl: "Wiadomości IT", ptBR: "Notícias de TI", zh: "IT 新闻",
    }),
    sub: L("Головне з техсвіту, з розбором", "Tech news with our take", "Главное из техмира, с разбором", {
      de: "Tech-News mit unserer Einordnung", es: "Noticias tech con nuestro análisis", fr: "L'actu tech, avec notre analyse", pl: "Newsy z tech-świata z naszym komentarzem", ptBR: "Notícias de tecnologia com nossa análise", zh: "科技要闻，附我们的解读",
    }),
    prev: L(
      "Найцікавіші IT-новини дня: цифри, графіки й що це означає для IT-ринку",
      "The day's best IT stories: numbers, charts and what they mean for the IT market",
      "Самые интересные IT-новости дня: цифры, графики и что это значит для IT-рынка",
      {
        de: "Die spannendsten IT-Nachrichten des Tages: Zahlen, Grafiken und was sie für den IT-Markt bedeuten",
        es: "Las noticias IT más interesantes del día: cifras, gráficos y qué significan para el mercado IT",
        fr: "Les actus IT les plus marquantes du jour : chiffres, graphiques et ce qu'elles changent pour le marché IT",
        pl: "Najciekawsze newsy IT dnia: liczby, wykresy i co oznaczają dla rynku IT",
        ptBR: "As notícias de TI mais interessantes do dia: números, gráficos e o que significam para o mercado de TI",
        zh: "今日最值得关注的 IT 新闻：数据、图表，以及它们对 IT 市场意味着什么",
      },
    ),
    kicker: L("Свіже", "Latest", "Свежее", { de: "Neu", es: "Reciente", fr: "À la une", pl: "Najnowsze", ptBR: "Recentes", zh: "最新" }),
  },
  events: {
    title: L("Події", "Events", "События", { de: "Events", es: "Eventos", fr: "Événements", pl: "Wydarzenia", ptBR: "Eventos", zh: "活动" }),
    sub: L("Конференції та мітапи", "Conferences and meetups", "Конференции и митапы", {
      de: "Konferenzen und Meetups", es: "Conferencias y meetups", fr: "Conférences et meetups", pl: "Konferencje i meetupy", ptBR: "Conferências e meetups", zh: "大会与线下聚会",
    }),
    prev: L(
      "Календар IT-конференцій і мітапів: Україна, Європа та онлайн — з датами, темами й описом",
      "A calendar of tech conferences and meetups: Ukraine, Europe and online — with dates, topics and a short take",
      "Календарь IT-конференций и митапов: Украина, Европа и онлайн — с датами, темами и описанием",
      {
        de: "Kalender für Tech-Konferenzen und Meetups: Ukraine, Europa und online, mit Terminen, Themen und kurzer Einordnung",
        es: "Calendario de conferencias y meetups tech: Ucrania, Europa y online, con fechas, temas y una breve reseña",
        fr: "Calendrier des conférences et meetups tech : Ukraine, Europe et en ligne, avec dates, thèmes et un court avis",
        pl: "Kalendarz konferencji i meetupów IT: Ukraina, Europa i online, z terminami, tematami i krótkim opisem",
        ptBR: "Calendário de conferências e meetups de tecnologia: Ucrânia, Europa e online, com datas, temas e uma breve análise",
        zh: "科技大会与聚会日历：乌克兰、欧洲和线上，含日期、主题和简评",
      },
    ),
    kicker: L("Календар", "Calendar", "Календарь", { de: "Kalender", es: "Calendario", fr: "Calendrier", pl: "Kalendarz", ptBR: "Calendário", zh: "日历" }),
  },
  stats: {
    title: L("A1 Stats", "A1 Stats", "A1 Stats"),
    sub: L("Живі цифри ринку вакансій", "Live job-market numbers", "Живые цифры рынка вакансий", {
      de: "Live-Zahlen zum Jobmarkt", es: "Cifras del mercado laboral en vivo", fr: "Les chiffres du marché de l'emploi en direct", pl: "Liczby z rynku pracy na żywo", ptBR: "Números do mercado de vagas ao vivo", zh: "实时职位市场数据",
    }),
    prev: L(
      "Вакансії по країнах, технологіях і зарплатах — оновлюється наживо",
      "Jobs by country, technology and salary — updated live",
      "Вакансии по странам, технологиям и зарплатам — обновляется вживую",
      {
        de: "Jobs nach Land, Technologie und Gehalt, live aktualisiert",
        es: "Vacantes por país, tecnología y salario, actualizadas en vivo",
        fr: "Offres par pays, technologie et salaire, mises à jour en direct",
        pl: "Oferty według kraju, technologii i wynagrodzenia, aktualizowane na żywo",
        ptBR: "Vagas por país, tecnologia e salário, atualizadas ao vivo",
        zh: "按国家、技术和薪资统计的职位，实时更新",
      },
    ),
    jobs: L("вакансій", "jobs", "вакансий", { de: "Jobs", es: "vacantes", fr: "offres", pl: "ofert", ptBR: "vagas", zh: "职位" }),
    companies: L("компаній", "companies", "компаний", { de: "Firmen", es: "empresas", fr: "entreprises", pl: "firm", ptBR: "empresas", zh: "公司" }),
    countries: L("країн", "countries", "стран", { de: "Länder", es: "países", fr: "pays", pl: "krajów", ptBR: "países", zh: "国家" }),
    today: L("за добу", "last 24h", "за сутки", { de: "letzte 24 Std.", es: "últimas 24 h", fr: "dernières 24 h", pl: "ostatnie 24 godz.", ptBR: "últimas 24 h", zh: "近 24 小时" }),
  },
  // 17.10.2026: страница /ai-assistant (подключение A1 к Claude, ChatGPT, Cursor). Фраза превью выбрана Александром.
  ai: {
    title: L("A1 у ШІ-чаті", "A1 in your AI chat", "A1 в ИИ-чате", {
      de: "A1 im KI-Chat", es: "A1 en tu chat IA", fr: "A1 dans l'IA", pl: "A1 w czacie AI", ptBR: "A1 no chat de IA", zh: "在 AI 聊天中使用 A1",
    }),
    sub: L("Claude, ChatGPT, Cursor", "Claude, ChatGPT, Cursor", "Claude, ChatGPT, Cursor"),
    prev: L(
      "Шукайте вакансії A1 прямо в Claude, ChatGPT чи Cursor",
      "Search A1 jobs right inside Claude, ChatGPT or Cursor",
      "Ищите вакансии A1 прямо в Claude, ChatGPT или Cursor",
      {
        de: "Suche A1-Jobs direkt in Claude, ChatGPT oder Cursor",
        es: "Busca vacantes de A1 directamente en Claude, ChatGPT o Cursor",
        fr: "Cherchez des offres A1 directement dans Claude, ChatGPT ou Cursor",
        pl: "Szukaj ofert A1 prosto w Claude, ChatGPT lub Cursor",
        ptBR: "Busque vagas do A1 direto no Claude, ChatGPT ou Cursor",
        zh: "直接在 Claude、ChatGPT 或 Cursor 中搜索 A1 职位",
      },
    ),
    badge: L("Новинка", "New", "Новинка", { de: "Neu", es: "Nuevo", fr: "Nouveau", pl: "Nowość", ptBR: "Novo", zh: "新" }),
  },
  // 24.10.2026: раздел «Співбесіда» -- чек-листы и инструменты кандидату и интервьюеру (/spivbesida).
  interview: {
    title: L("Співбесіда", "Interview", "Собеседование", {
      de: "Vorstellungsgespräch", es: "Entrevista", fr: "Entretien", pl: "Rozmowa kwalifikacyjna", ptBR: "Entrevista", zh: "面试",
    }),
    sub: L("Чек-листи та інструменти", "Checklists and tools", "Чек-листы и инструменты", {
      de: "Checklisten und Tools", es: "Listas y herramientas", fr: "Checklists et outils", pl: "Listy kontrolne i narzędzia", ptBR: "Checklists e ferramentas", zh: "清单与工具",
    }),
    badge: L("Новинка", "New", "Новинка", { de: "Neu", es: "Nuevo", fr: "Nouveau", pl: "Nowość", ptBR: "Novo", zh: "新" }),
    prev: L(
      "Підготовка для кандидата, чесний процес для інтерв'юера і прийоми проти AI-підказок",
      "Prep for candidates, a fair process for interviewers and tricks against AI prompting",
      "Подготовка для кандидата, честный процесс для интервьюера и приёмы против AI-подсказок",
      {
        de: "Vorbereitung für Bewerber, ein fairer Ablauf für Interviewer und Tricks gegen KI-Souffleure",
        es: "Preparación para candidatos, un proceso justo para entrevistadores y trucos contra la ayuda de IA",
        fr: "Préparation pour les candidats, un processus équitable pour les recruteurs et des astuces contre l'aide d'une IA",
        pl: "Przygotowanie dla kandydata, uczciwy proces dla rekrutera i sposoby na podpowiedzi AI",
        ptBR: "Preparação para candidatos, um processo justo para entrevistadores e truques contra ajuda de IA",
        zh: "求职者的准备、面试官的公平流程，以及应对 AI 提示的方法",
      },
    ),
  },
  // 17.10.2026: реферальная программа «Отримай Alpha» -- страница /invite, мини-прогресс прямо в строке меню.
  invite: {
    title: L("Отримай Alpha", "Get Alpha", "Получи Alpha", {
      de: "Hol dir Alpha", es: "Consigue Alpha", fr: "Obtenez Alpha", pl: "Zdobądź Alpha", ptBR: "Ganhe Alpha", zh: "领取 Alpha",
    }),
    sub: L("Запросіть друзів", "Invite friends", "Пригласите друзей", {
      de: "Freunde einladen", es: "Invita a tus amigos", fr: "Invitez vos amis", pl: "Zaproś znajomych", ptBR: "Convide amigos", zh: "邀请好友",
    }),
    prev: L(
      "Поділіться посиланням з друзями і отримуйте A1 Alpha безкоштовно. Друг теж отримує подарунок",
      "Share your link with friends and get A1 Alpha for free. Your friend gets a gift too",
      "Поделитесь ссылкой с друзьями и получайте A1 Alpha бесплатно. Друг тоже получает подарок",
      {
        de: "Teile deinen Link mit Freunden und erhalte A1 Alpha kostenlos. Dein Freund bekommt auch ein Geschenk",
        es: "Comparte tu enlace con tus amigos y consigue A1 Alpha gratis. Tu amigo también recibe un regalo",
        fr: "Partagez votre lien avec vos amis et obtenez A1 Alpha gratuitement. Votre ami reçoit aussi un cadeau",
        pl: "Udostępnij link znajomym i zdobądź A1 Alpha za darmo. Twój znajomy też dostanie prezent",
        ptBR: "Compartilhe seu link com amigos e ganhe o A1 Alpha de graça. Seu amigo também ganha um presente",
        zh: "把链接分享给好友，免费获得 A1 Alpha。好友也会收到礼物",
      },
    ),
  },
  game: {
    title: L("A1 Run", "A1 Run", "A1 Run"),
    sub: L("Пограй у нашу гру", "Play our game", "Поиграй в нашу игру", {
      de: "Spiel unser Spiel", es: "Juega a nuestro juego", fr: "Jouez à notre jeu", pl: "Zagraj w naszą grę", ptBR: "Jogue nosso jogo", zh: "玩玩我们的游戏",
    }),
    prev: L(
      "Міні-гра про кота Mr Kit — біжи дахами й збирай зв’язки",
      "A mini-game about Mr Kit the cat — run the rooftops and collect connections",
      "Мини-игра про кота Mr Kit — беги по крышам и собирай связи",
      {
        de: "Ein Mini-Spiel über den Kater Mr Kit — über Dächer rennen, Kontakte sammeln",
        es: "Un minijuego sobre el gato Mr Kit: corre por los tejados y reúne conexiones",
        fr: "Un mini-jeu sur le chat Mr Kit — cours sur les toits et collecte des connexions",
        pl: "Mini-gra o kocie Mr Kit — biegnij po dachach i zbieraj kontakty",
        ptBR: "Um minijogo sobre o gato Mr Kit — corra pelos telhados e colete conexões",
        zh: "关于猫咪 Mr Kit 的小游戏——在屋顶奔跑，收集人脉",
      },
    ),
  },
  more: L("Ще", "More", "Ещё", { de: "Mehr", es: "Más", fr: "Plus", pl: "Więcej", ptBR: "Mais", zh: "更多" }),
};

// 18.10.2026: списки новин и подій бывают только на украинском и английском (отдельные адреса). Остальным языкам
// (de, es, fr, pl, pt, zh) ведём на английские: так читают больше людей, чем по-украински.
function hrefFor(id: Id, locale: Locale): string {
  if ((id === "news" || id === "events") && locale !== "uk" && locale !== "ru") return `${HREF[id]}/en`;
  return HREF[id];
}

// 24.10.2026 (Александр: «на кружок "⋯" маленькую синюю точку, что появилось
// что-то новое; убирать после того, как человек один раз откроет меню; без
// костов»). Ключ новинок -- id пунктов с плашкой «Новинка». Человек открыл
// меню -- запоминаем ключ в браузере (localStorage), точка гаснет. Появится
// новый пункт с плашкой -- ключ поменяется, и точка загорится снова. Сервер
// не нужен; на новом устройстве точку увидят ещё раз, для меню это ок.
const NEW_KEY = (Object.keys(TXT) as (keyof typeof TXT)[]).filter((id) => "badge" in TXT[id]).sort().join(",");
const NEW_SEEN_STORAGE = "a1-more-menu-seen";

const HREF: Record<Id, string> = { app: "/download", news: "/news", events: "/events", stats: "/stats", interview: "/spivbesida", ai: "/ai-assistant", invite: "/invite", game: "/game" };

// Сводка рефералки для строки меню: friends -- друзей в зачёте, next -- сколько нужно до следующей награды.
type InviteLite = { friends: number; months: number; next: { friends: number; months: number } | null };
const LADDER_STEPS = [3, 8, 10, 18, 30];

// Заливка мини-полосы -- как на странице /invite: ступени равными промежутками, плавно между соседними.
function inviteFill(n: number): number {
  let prev = 0;
  for (let i = 0; i < LADDER_STEPS.length; i++) {
    const cur = LADDER_STEPS[i] ?? 0;
    if (n < cur) return ((i + (n - prev) / Math.max(1, cur - prev)) / LADDER_STEPS.length) * 100;
    prev = cur;
  }
  return 100;
}

type StatsLite = { total: number; companies: number; countries: number; fresh24h: number; daily: { d: string; n: number }[] };

function fmtN(v: number): string {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ───────── значки (24px, штрих 1.8 -- как у остальных кнопок шапки) ─────────
const svgBase = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function AppIcon() {
  return (
    <svg {...svgBase}>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <g className="animate-app-install-arrow">
        <path d="M12 7.5v6" />
        <path d="M9.5 11l2.5 2.5L14.5 11" />
      </g>
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg {...svgBase}>
      <path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5z" />
      <path d="M18 9h2v8a2 2 0 0 1-2 2" />
      <path d="M7.5 9h6" className="animate-news-line" style={{ animationDelay: "0ms" }} />
      <path d="M7.5 12.5h6" className="animate-news-line" style={{ animationDelay: "120ms" }} />
      <path d="M7.5 16h3.5" className="animate-news-line" style={{ animationDelay: "240ms" }} />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" className="animate-ev-ring" style={{ animationDelay: "0ms" }} />
      <path d="M16 3v4" className="animate-ev-ring" style={{ animationDelay: "90ms" }} />
      <circle cx="8.5" cy="14.5" r="1" fill="currentColor" stroke="none" className="animate-ev-dot" style={{ animationDelay: "60ms" }} />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" className="animate-ev-dot" style={{ animationDelay: "160ms" }} />
      <circle cx="15.5" cy="14.5" r="1" fill="currentColor" stroke="none" className="animate-ev-dot" style={{ animationDelay: "260ms" }} />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg {...svgBase}>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="3.4" height="7" rx="1" className="animate-stats-bar" style={{ animationDelay: "0ms" }} />
      <rect x="10.3" y="6" width="3.4" height="13" rx="1" className="animate-stats-bar" style={{ animationDelay: "70ms" }} />
      <rect x="15.6" y="9" width="3.4" height="10" rx="1" className="animate-stats-bar" style={{ animationDelay: "140ms" }} />
    </svg>
  );
}

// 24.10.2026: «Співбесіда» -- листок с галочками, галочки дорисовываются при наведении.
function InterviewIcon() {
  return (
    <svg {...svgBase}>
      <rect x="4.5" y="3" width="15" height="18" rx="3" />
      <path d="M8 8.5l1.5 1.5 2.5-2.5" className="animate-news-line" style={{ animationDelay: "0ms" }} />
      <path d="M8 14l1.5 1.5 2.5-2.5" className="animate-news-line" style={{ animationDelay: "160ms" }} />
      <path d="M14.5 9h2M14.5 14.5h2" />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg {...svgBase}>
      <path className="animate-ai-bubble" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z" />
      <path className="animate-ai-spark" d="M12 6.8l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg {...svgBase}>
      <path d="M20 12v8H4v-8" />
      <path d="M12 12v8" />
      <g className="animate-gift-lid">
        <path d="M2.5 7.5h19V12h-19z" />
        <path d="M12 7.5H8.2a2.1 2.1 0 1 1 0-4.2C10.4 3.3 12 7.5 12 7.5z" />
        <path d="M12 7.5h3.8a2.1 2.1 0 1 0 0-4.2C13.6 3.3 12 7.5 12 7.5z" />
      </g>
    </svg>
  );
}

function GameIcon() {
  return (
    <svg {...svgBase}>
      <g className="animate-game-pad">
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
        <path d="M6 11h4" />
        <path d="M8 9v4" />
        <g className="animate-game-pad-press">
          <path d="M15 12h.01" />
          <path d="M18 10h.01" />
        </g>
      </g>
    </svg>
  );
}

// ───────── строка меню ─────────
function Row({
  id,
  icon,
  onHover,
  onPick,
}: {
  id: Id;
  icon: React.ReactNode;
  onHover: (id: Id) => void;
  onPick: () => void;
}) {
  const t = TXT[id];
  const locale = useActiveLocale();
  return (
    <Link
      href={hrefFor(id, locale)}
      onClick={onPick}
      onMouseEnter={() => onHover(id)}
      onFocus={() => onHover(id)}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 text-neutral-500 transition duration-200 group-hover:bg-accent/15 group-hover:text-accent dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-accent/20">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
          <span className="truncate"><T {...t.title} /></span>
          {"badge" in t ? (
            <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-px text-[10px] font-semibold uppercase leading-4 tracking-wide text-accent">
              <T {...t.badge} />
            </span>
          ) : null}
        </span>
        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
          <T {...t.sub} />
        </span>
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 -translate-x-1 text-neutral-300 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100 dark:text-neutral-600"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// Строка «Отримай Alpha»: вместо подписи -- мини-полоса прогресса (когда человек вошёл и уже есть друзья).
function InviteRow({ lite, onHover, onPick }: { lite: InviteLite | null; onHover: (id: Id) => void; onPick: () => void }) {
  const t = TXT.invite;
  const locale = useActiveLocale();
  const ct = makeT(COPY[locale] ?? COPY.en);
  const pct = lite ? Math.min(100, Math.round(inviteFill(lite.friends))) : 0;
  return (
    <Link
      href={HREF.invite}
      onClick={onPick}
      onMouseEnter={() => onHover("invite")}
      onFocus={() => onHover("invite")}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 text-neutral-500 transition duration-200 group-hover:bg-accent/15 group-hover:text-accent dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-accent/20">
        <InviteIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
          <span className="truncate"><T {...t.title} /></span>
        </span>
        {lite && lite.friends > 0 ? (
          <span className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.max(6, pct)}%` }} />
            </span>
            <span className="shrink-0 tabular-nums">{ct.friends(lite.friends)} · {ct.moLabel(lite.months)}</span>
          </span>
        ) : (
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
            <T {...t.sub} />
          </span>
        )}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 -translate-x-1 text-neutral-300 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100 dark:text-neutral-600">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// ───────── превью ─────────
function PreviewApp() {
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/download/hero.webp" alt="" width={1672} height={941} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-16 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">
          {LOCALES.map((locale) => (
            <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
              {DOWNLOAD_COPY[locale].headline} <span className="text-[#7aa2ff]">{DOWNLOAD_COPY[locale].headlineAccent}</span>
            </span>
          ))}
        </span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.app.prev} />
        </span>
      </span>
    </>
  );
}

// Превью «IT новини». Данные пока вшиты (последняя новость), без запроса к серверу:
// превью должно открываться мгновенно. При выходе новой новости -- поменять здесь.
const NEWS_PREVIEW_LIT = new Set([6, 19, 41, 58, 77, 95, 108, 122, 139, 163, 176, 190, 207, 224, 239, 251, 271, 288, 312, 330, 347, 375, 402, 421, 431, 466]);

type LatestNews = { slug: string; title: string; tags: string[] };
type LatestPair = { uk: LatestNews | null; en: LatestNews | null };

function PreviewNews({ latest }: { latest: LatestPair | null }) {
  // Самая свежая новость: ru-интерфейс -- украинский заголовок (русской версии новостей нет), остальные языки -- английский.
  const pickFor = (locale: Locale): LatestNews | null => (locale === "uk" || locale === "ru" ? latest?.uk ?? latest?.en : latest?.en ?? latest?.uk) ?? null;
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#1b3a95_0%,#0a1240_48%,#03051f_100%)]">
        <span className="absolute inset-x-5 top-5 block">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#7aa2ff]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7aa2ff]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7aa2ff]" />
            </span>
            IT news · <T {...TXT.news.kicker} />
          </span>
          {latest && (latest.uk || latest.en) ? (
            LOCALES.map((locale) => {
              const n = pickFor(locale);
              if (!n) return null;
              return (
                <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
                  <span className={"mt-2 block line-clamp-2 font-bold text-white " + (n.title.length > 40 ? "text-[22px] leading-[1.15]" : "text-[28px] leading-[1.05]")}>{n.title}</span>
                  {n.tags.length ? (
                    <span className="mt-2 flex flex-wrap gap-2 text-[12px]">
                      {n.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-white/90">{t}</span>
                      ))}
                    </span>
                  ) : null}
                </span>
              );
            })
          ) : (
            <>
              <span className="mt-2 block text-[30px] font-bold leading-[1.05] text-white">Mistral Large 4</span>
              <span className="mt-2 flex flex-wrap gap-2 text-[12px] tabular-nums">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/90">1 000 B → <b className="text-[#7aa2ff]">52 B</b></span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/90">$1,36 / 1M tok</span>
              </span>
            </>
          )}
        </span>
        <span className="absolute inset-x-5 bottom-9 grid gap-[3px]" style={{ gridTemplateColumns: "repeat(50, minmax(0, 1fr))" }}>
          {Array.from({ length: 500 }, (_, i) => {
            const on = NEWS_PREVIEW_LIT.has(i);
            return (
              <span
                key={i}
                className={"block aspect-square rounded-full " + (on ? "animate-pulse" : "")}
                style={{
                  background: on ? "#7aa2ff" : "rgba(255,255,255,.14)",
                  boxShadow: on ? "0 0 7px 1px rgba(122,162,255,.85)" : "none",
                  animationDelay: on ? `${(i % 7) * 140}ms` : undefined,
                }}
              />
            );
          })}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white"><T {...TXT.news.title} /></span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.news.prev} />
        </span>
      </span>
    </>
  );
}

// Превью «Події»: узор -- сетка месяца с несколькими «горящими» днями. Без выдуманных событий.
const EVENTS_PREVIEW_LIT = new Set([3, 8, 12, 17, 18, 24, 29, 33]);

function PreviewEvents() {
  const days = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"];
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#5b2aa8_0%,#2a1163_48%,#0e0524_100%)]">
        <span className="absolute inset-x-5 top-5 block">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#c19bff]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c19bff]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c19bff]" />
            </span>
            IT events · <T {...TXT.events.kicker} />
          </span>
          <span className="mt-2 block text-[30px] font-bold leading-[1.05] text-white">UA · EU · online</span>
        </span>
        <span className="absolute inset-x-5 bottom-8 grid grid-cols-7 gap-1.5 text-center text-[10px] text-white/45">
          {days.map((d) => <span key={d}>{d}</span>)}
          {Array.from({ length: 35 }, (_, i) => {
            const on = EVENTS_PREVIEW_LIT.has(i);
            return (
              <span
                key={i}
                className={"block aspect-square rounded-full " + (on ? "animate-pulse" : "")}
                style={{ background: on ? "#c19bff" : "rgba(255,255,255,.12)", boxShadow: on ? "0 0 8px 1px rgba(193,155,255,.85)" : "none", animationDelay: on ? `${(i % 5) * 160}ms` : undefined }}
              />
            );
          })}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-12 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white"><T {...TXT.events.title} /></span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.events.prev} />
        </span>
      </span>
    </>
  );
}

// 24.10.2026: превью «Співбесіди» -- мини-чек-лист с прогрессом.
function PreviewInterview() {
  const rows = [true, true, false];
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#1f5f4a_0%,#0b2a2a_48%,#03051f_100%)]">
        <span className="absolute inset-x-5 top-5 flex items-center gap-3">
          <span className="relative block h-12 w-12">
            <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden>
              <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
              <circle cx="24" cy="24" r="19" fill="none" stroke="#4ade80" strokeWidth="5" strokeLinecap="round" strokeDasharray="119.4" strokeDashoffset="40" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white">2/3</span>
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#86efac]">Checklist</span>
        </span>
        <span className="absolute inset-x-5 bottom-8 block space-y-2">
          {rows.map((on, i) => (
            <span key={i} className="flex items-center gap-2.5 rounded-xl bg-white/[0.08] px-3 py-2">
              <span className={"flex h-4 w-4 items-center justify-center rounded-[5px] " + (on ? "bg-[#4ade80]" : "ring-2 ring-white/30")}>
                {on ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                ) : null}
              </span>
              <span className={"block h-2 rounded-full " + (on ? "w-1/2 bg-white/25" : "w-2/3 bg-white/40")} />
            </span>
          ))}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-10 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white"><T {...TXT.interview.title} /></span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.interview.prev} />
        </span>
      </span>
    </>
  );
}

function PreviewAi() {
  const logos = ["claude", "chatgpt", "cursor"];
  return (
    <>
      <span className="relative flex aspect-[16/10] w-full items-center justify-center gap-4 overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#16307a_0%,#0a1240_45%,#03051f_100%)]">
        {logos.map((n) => (
          <span key={n} className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/brand/assistants/${n}.png`} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 object-contain" />
          </span>
        ))}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">A1 + AI</span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.ai.prev} />
        </span>
      </span>
    </>
  );
}

function PreviewInvite() {
  const locale = useActiveLocale();
  const ct = makeT(COPY[locale] ?? COPY.en);
  const steps = [3, 8, 10, 18, 30];
  const months = [1, 3, 6, 12, 24];
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#1b3a95_0%,#0a1240_48%,#03051f_100%)]">
        <span className="absolute inset-x-5 top-5 block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-[#7aa2ff]">Alpha · invite</span>
          <span className="mt-1 block text-[40px] font-bold leading-none text-white">24 <span className="text-[22px] font-semibold text-white/70">{ct.moLabel(24).replace(/^\d+\s?/, "")}</span></span>
        </span>
        <span className="absolute inset-x-5 bottom-10 block">
          <span className="relative block h-2 rounded-full bg-white/15">
            <span className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-[#7aa2ff]" />
            {steps.map((_, i) => (
              <span key={i} className={"absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#0a1240] " + (i < 2 ? "bg-[#7aa2ff]" : "bg-white/30")} style={{ left: `${((i + 1) / steps.length) * 100}%` }} />
            ))}
          </span>
          <span className="relative mt-3 block h-8 text-[11px] leading-tight text-white/60">
            {steps.map((n, i) => (
              <span key={n} className="absolute -translate-x-1/2 whitespace-nowrap text-center" style={{ left: `${Math.min(92, ((i + 1) / steps.length) * 100)}%` }}>
                <b className="block text-xs text-white">{n}</b>
                {ct.moLabel(months[i] ?? 1)}
              </span>
            ))}
          </span>
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-12 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white"><T {...TXT.invite.title} /></span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.invite.prev} />
        </span>
      </span>
    </>
  );
}

function PreviewGame() {
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/game/preview.webp" alt="" width={880} height={546} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-16 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">A1 RUN</span>
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.game.prev} />
        </span>
      </span>
    </>
  );
}

// 30 дней столбиками; пики заливки сжимаем корнем, чтобы остальные дни были видны.
function PreviewStats({ data }: { data: StatsLite | null }) {
  const days = data?.daily?.length ? data.daily : Array.from({ length: 30 }, (_, i) => ({ d: String(i), n: 20 + ((i * 37) % 60) }));
  const vals = days.map((x) => Math.sqrt(Math.max(0, x.n)));
  const mx = Math.max(1, ...vals);
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#16307a_0%,#0a1240_45%,#03051f_100%)]">
        <span className="absolute inset-x-5 top-5 block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-[#7aa2ff]">A1 · live</span>
          <span className="mt-1 block text-[40px] font-bold leading-none tabular-nums text-white">{data ? fmtN(data.total) : "—"}</span>
          <span className="mt-1 block text-[13px] text-white/60">
            <T {...TXT.stats.jobs} />
          </span>
        </span>
        <span className="absolute inset-x-5 bottom-8 flex h-[46%] items-end gap-[3px]">
          {vals.map((v, i) => (
            <span
              key={i}
              className="nav-stats-col block flex-1 rounded-t-[3px] bg-gradient-to-t from-[#2a78d6] to-[#7aa2ff]"
              style={{ height: `${Math.max(4, (v / mx) * 100)}%`, animationDelay: `${i * 14}ms`, opacity: data ? 1 : 0.35 }}
            />
          ))}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-14 bg-gradient-to-b from-transparent to-[#03051f]" />
      </span>
      <span className="block px-5 pb-5 pt-1">
        <span className="block text-[20px] font-semibold leading-[1.2] text-white">A1 Stats</span>
        {data ? (
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums text-white/80">
            <span><b className="font-semibold text-white">{fmtN(data.companies)}</b> <T {...TXT.stats.companies} /></span>
            <span><b className="font-semibold text-white">{fmtN(data.countries)}</b> <T {...TXT.stats.countries} /></span>
            <span><b className="font-semibold text-[#7aa2ff]">+{fmtN(data.fresh24h)}</b> <T {...TXT.stats.today} /></span>
          </span>
        ) : null}
        <span className="mt-2 block text-[13px] leading-snug text-white/65">
          <T {...TXT.stats.prev} />
        </span>
      </span>
    </>
  );
}

export function NavMoreMenu() {
  const locale = useActiveLocale();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Id | null>(null);
  const [stats, setStats] = useState<StatsLite | null>(null);
  const [latestNews, setLatestNews] = useState<LatestPair | null>(null);
  const newsFetched = useRef(false);
  const [invite, setInvite] = useState<InviteLite | null>(null);
  const inviteFetched = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  const { rendered, visible, handleMouseEnter, handleMouseLeave, isRecentHoverOpen } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
    { trigger: previewRef, panel: previewRef },
  ], "nav");

  // Меню закрылось -- превью начинается заново, а не показывает прошлую строку.
  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  // Превью «IT новини»: самая свежая новость. Запрос один раз, как только меню открылось (к наведению уже готово).
  useEffect(() => {
    if (!open || newsFetched.current) return;
    newsFetched.current = true;
    fetch("/api/news/latest")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.ok) setLatestNews({ uk: j.uk ?? null, en: j.en ?? null });
      })
      .catch(() => {
        newsFetched.current = false;
      });
  }, [open]);

  // Строка «Отримай Alpha»: прогресс человека (лёгкий запрос, один раз за открытие меню; гостю -- 401, строка остаётся с подписью).
  useEffect(() => {
    if (!open || inviteFetched.current) return;
    inviteFetched.current = true;
    fetch("/api/referral?summary=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.ok && j.progress) setInvite({ friends: j.progress.counts.counted, months: j.progress.monthsEarned, next: j.progress.next });
      })
      .catch(() => {
        inviteFetched.current = false;
      });
  }, [open]);

  // Цифры для превью Stats: один запрос при первом наведении на эту строку.
  useEffect(() => {
    if (hovered !== "stats" || fetched.current) return;
    fetched.current = true;
    fetch("/stats/data")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j.total === "number") setStats(j as StatsLite);
      })
      .catch(() => {
        fetched.current = false;
      });
  }, [hovered]);

  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    if (!NEW_KEY) return;
    try {
      setHasNew(localStorage.getItem(NEW_SEEN_STORAGE) !== NEW_KEY);
    } catch {
      /* приватный режим -- просто без точки */
    }
  }, []);
  useEffect(() => {
    if (!open || !hasNew) return;
    setHasNew(false);
    try {
      localStorage.setItem(NEW_SEEN_STORAGE, NEW_KEY);
    } catch {
      /* не сохранилось -- точка вернётся при следующем заходе, не страшно */
    }
  }, [open, hasNew]);

  const pick = () => setOpen(false);
  const shell = (bg: string) =>
    `block overflow-hidden rounded-2xl ${bg} shadow-xl ring-1 ring-black/10 dark:ring-white/10`;

  return (
    <div ref={wrapRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative block shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          // lib/use-hover-panel.ts, запись от 04.09.2026: на айпаде первый тап = mouseenter + click.
          if (isRecentHoverOpen()) return;
          setOpen((v) => !v);
        }}
        className={
          "group relative flex h-11 w-11 max-sm:h-10 max-sm:w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 transition dark:bg-neutral-900 " +
          (open
            ? "text-accent ring-accent/40 dark:ring-accent/40"
            : "text-neutral-500 ring-neutral-200 hover:text-accent hover:ring-accent/40 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:text-accent dark:hover:ring-accent/40")
        }
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {[5, 12, 19].map((cx, i) => (
            <circle key={cx} cx={cx} cy="12" r="1.9" className="animate-more-dot" style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </svg>
        <span className="sr-only">
          <T {...TXT.more} />
        </span>
        {hasNew ? (
          <span aria-hidden="true" className="absolute right-0 top-0 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-accent ring-2 ring-white dark:ring-neutral-950" />
          </span>
        ) : null}
      </button>

      {rendered && (
        <div ref={panelRef} className="absolute right-0 top-full z-50 w-[288px] pt-2">
          <div
            role="menu"
            className={
              "rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-neutral-200 transition duration-200 ease-out dark:bg-neutral-900 dark:ring-neutral-800 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            <Row id="app" icon={<AppIcon />} onHover={setHovered} onPick={pick} />
            <Row id="news" icon={<NewsIcon />} onHover={setHovered} onPick={pick} />
            <Row id="events" icon={<EventsIcon />} onHover={setHovered} onPick={pick} />
            <Row id="stats" icon={<StatsIcon />} onHover={setHovered} onPick={pick} />
            <Row id="interview" icon={<InterviewIcon />} onHover={setHovered} onPick={pick} />
            <Row id="ai" icon={<AiIcon />} onHover={setHovered} onPick={pick} />
            <InviteRow lite={invite} onHover={setHovered} onPick={pick} />
            <div className="mx-2 my-1 border-t border-neutral-100 dark:border-neutral-800" />
            <Row id="game" icon={<GameIcon />} onHover={setHovered} onPick={pick} />
          </div>

          {/* Превью -- слева от меню, прижато к нему отступом pr-2 (без «мёртвой» полосы). */}
          {hovered && (
            <div
              ref={previewRef}
              className={
                "absolute right-full top-2 hidden w-[448px] pr-2 transition duration-200 ease-out lg:block [@media(hover:none)]:hidden " +
                (visible ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0")
              }
            >
              <Link key={hovered} href={hrefFor(hovered, locale)} onClick={pick} className={`animate-nav-preview ${shell("bg-[#03051f]")}`}>
                {hovered === "app" ? <PreviewApp /> : hovered === "news" ? <PreviewNews latest={latestNews} /> : hovered === "events" ? <PreviewEvents /> : hovered === "stats" ? <PreviewStats data={stats} /> : hovered === "interview" ? <PreviewInterview /> : hovered === "ai" ? <PreviewAi /> : hovered === "invite" ? <PreviewInvite /> : <PreviewGame />}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// app/download/page.tsx
//
// Aleksandr, 2026-09-14: «нам надо сделать установочную страницу,
// которую мы будем шарить в соцсетях» — отдельный тёмный первый экран
// с котом и двумя кнопками установки, живёт на jobs.a1appp.com/download.
//
// Три вещи, которые здесь сделаны намеренно:
//
// 1. Страница не пользуется типографикой сайта — она всегда на
//    Montserrat, и стили лежат в собственном CSS-модуле
//    (download.module.css), а не в Tailwind-утилитах globals.css.
//    Тему, наоборот, разделяет с сайтом: класс light/dark на <html> и
//    ключ localStorage("theme") здесь те же самые, см. ./theme-switch.tsx.
//
// 2. Навигация сайта и три плавающие кнопки (чаты, «+», «наверх») на
//    этом маршруте скрыты — см. pathname-гварды в components/site-nav.tsx,
//    chats-fab.tsx, scroll-top-fab.tsx, create-post-fab.tsx. Это
//    рекламная страница-плакат, а не часть ленты. Взамен в её
//    собственной шапке стоит меню «…» (./menu.tsx): тема, язык и
//    «поділитися».
//
// 3. Тексты и ссылки вынесены целиком в ./copy.ts. Все девять языков
//    рендерятся сразу, нужный показывает CSS — тот же приём, что и в
//    components/t.tsx, так что страница остаётся статической и
//    индексируемой, без клиентского JS и без мигания языком.
import type { Metadata } from "next";
const Montserrat = (_o: unknown) => ({ variable: "" });
import { LOCALES } from "@/components/t";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import { Interactions } from "./interactions";
import { Menu } from "./menu";
import { SitePreview } from "./site-preview";
import { Sound } from "./sound";
import { Ambience } from "./ambience";
import styles from "./download.module.css";

// Montserrat — шрифт из макета: геометричный гротеск с круглыми «о» и
// плоскими окончаниями штрихов (у остального сайта другой, Commissioner:
// см. app/layout.tsx). Подключается локально в этом файле, поэтому на
// другие страницы не влияет и грузится только здесь.
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Завантаж A1 — робота та спеціалісти в один дотик",
  description: "Знаходьте роботу та спеціалістів. Спілкуйтеся напряму. Застосунок A1 для Android та iOS.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Завантаж A1 — робота та спеціалісти в один дотик",
    description: "Знаходьте роботу та спеціалістів. Спілкуйтеся напряму. Застосунок A1 для Android та iOS.",
    url: "https://jobs.a1appp.com/download",
    siteName: "A1",
    type: "website",
    /*
     * Своя картинка предпросмотра: именно её видят в Telegram, Facebook
     * и LinkedIn ДО того, как откроют ссылку — то есть по ней решают,
     * открывать ли вообще. Без неё подтянулась бы общая картинка сайта.
     * Файл статический (public/download/og.jpg), генерировать на лету
     * незачем — страница одна.
     */
    images: [
      {
        url: "/download/og.jpg",
        width: 1200,
        height: 630,
        alt: "A1 — знаходьте роботу та спеціалістів",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Завантаж A1 — робота та спеціалісти в один дотик",
    description: "Знаходьте роботу та спеціалістів. Спілкуйтеся напряму.",
    images: ["/download/og.jpg"],
  },
};

/*
 * Порядок кнопок под платформу посетителя. Скрипт встроен прямо в
 * разметку и выполняется при разборе страницы — ДО того, как браузер
 * дойдёт до кнопок, поэтому они сразу рисуются в нужном порядке и
 * ничего не перепрыгивает после загрузки (Aleksandr, 14.09.2026:
 * «с iPhone — кнопка iOS первая»). Сам порядок меняет CSS, и только в
 * мобильной раскладке: на десктопе iOS остаётся справа, как он просил
 * отдельно.
 */
const PLATFORM_INIT_SCRIPT = `
(function () {
  try {
    var ua = navigator.userAgent || "";
    var root = document.documentElement;
    if (/iPhone|iPad|iPod/i.test(ua)) root.classList.add("platform-ios");
    else if (/Android/i.test(ua)) root.classList.add("platform-android");
  } catch (e) {}
})();
`;

// QR ведёт на умную ссылку jobs.a1appp.com/get (app/get/route.ts): она
// смотрит, с какого устройства её открыли, и отправляет iPhone в App
// Store, а Android — в Google Play. Поэтому один код работает для обеих
// платформ: зашить в него конкретный магазин было бы ошибкой — половина
// сканирующих оказалась бы не в своём сторе.
function QrCode() {
  return (
    <svg className={styles.qr} viewBox="0 0 29 29" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M0 0h7v1h-7zM9 0h2v1h-2zM12 0h4v1h-4zM18 0h1v1h-1zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h2v1h-2zM15 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h2v1h-2zM14 2h1v1h-1zM16 2h1v1h-1zM19 2h2v1h-2zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM11 3h2v1h-2zM14 3h2v1h-2zM17 3h4v1h-4zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM12 4h4v1h-4zM17 4h4v1h-4zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM13 5h2v1h-2zM16 5h2v1h-2zM20 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h3v1h-3zM12 7h2v1h-2zM19 7h1v1h-1zM0 8h1v1h-1zM6 8h1v1h-1zM8 8h3v1h-3zM12 8h1v1h-1zM14 8h2v1h-2zM17 8h1v1h-1zM21 8h2v1h-2zM25 8h3v1h-3zM0 9h1v1h-1zM3 9h3v1h-3zM7 9h3v1h-3zM12 9h1v1h-1zM14 9h1v1h-1zM18 9h2v1h-2zM24 9h1v1h-1zM26 9h2v1h-2zM5 10h2v1h-2zM10 10h1v1h-1zM12 10h1v1h-1zM17 10h1v1h-1zM22 10h2v1h-2zM1 11h2v1h-2zM5 11h1v1h-1zM8 11h1v1h-1zM14 11h3v1h-3zM19 11h2v1h-2zM22 11h1v1h-1zM24 11h2v1h-2zM3 12h2v1h-2zM6 12h2v1h-2zM10 12h1v1h-1zM12 12h3v1h-3zM20 12h1v1h-1zM22 12h1v1h-1zM28 12h1v1h-1zM0 13h1v1h-1zM2 13h1v1h-1zM7 13h1v1h-1zM9 13h1v1h-1zM12 13h3v1h-3zM18 13h2v1h-2zM22 13h3v1h-3zM27 13h2v1h-2zM0 14h1v1h-1zM5 14h3v1h-3zM10 14h1v1h-1zM13 14h4v1h-4zM21 14h1v1h-1zM25 14h2v1h-2zM2 15h4v1h-4zM7 15h1v1h-1zM10 15h1v1h-1zM12 15h3v1h-3zM16 15h1v1h-1zM20 15h3v1h-3zM24 15h1v1h-1zM26 15h1v1h-1zM28 15h1v1h-1zM1 16h3v1h-3zM5 16h2v1h-2zM9 16h1v1h-1zM12 16h1v1h-1zM14 16h2v1h-2zM17 16h1v1h-1zM20 16h2v1h-2zM25 16h2v1h-2zM0 17h2v1h-2zM4 17h1v1h-1zM7 17h1v1h-1zM9 17h1v1h-1zM12 17h1v1h-1zM16 17h1v1h-1zM19 17h6v1h-6zM26 17h3v1h-3zM0 18h4v1h-4zM5 18h3v1h-3zM11 18h1v1h-1zM13 18h2v1h-2zM16 18h2v1h-2zM19 18h4v1h-4zM25 18h1v1h-1zM28 18h1v1h-1zM0 19h1v1h-1zM4 19h2v1h-2zM7 19h1v1h-1zM9 19h2v1h-2zM12 19h1v1h-1zM14 19h3v1h-3zM18 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM0 20h1v1h-1zM2 20h1v1h-1zM4 20h1v1h-1zM6 20h3v1h-3zM10 20h1v1h-1zM12 20h1v1h-1zM16 20h1v1h-1zM18 20h1v1h-1zM20 20h5v1h-5zM26 20h3v1h-3zM8 21h1v1h-1zM10 21h1v1h-1zM12 21h2v1h-2zM16 21h5v1h-5zM24 21h2v1h-2zM0 22h7v1h-7zM10 22h8v1h-8zM19 22h2v1h-2zM22 22h1v1h-1zM24 22h3v1h-3zM0 23h1v1h-1zM6 23h1v1h-1zM12 23h2v1h-2zM17 23h4v1h-4zM24 23h1v1h-1zM27 23h2v1h-2zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM10 24h4v1h-4zM15 24h3v1h-3zM19 24h7v1h-7zM27 24h1v1h-1zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM9 25h2v1h-2zM12 25h1v1h-1zM16 25h1v1h-1zM18 25h1v1h-1zM21 25h1v1h-1zM25 25h3v1h-3zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM9 26h6v1h-6zM18 26h1v1h-1zM21 26h7v1h-7zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM11 27h1v1h-1zM15 27h1v1h-1zM19 27h1v1h-1zM22 27h1v1h-1zM25 27h2v1h-2zM28 27h1v1h-1zM0 28h7v1h-7zM8 28h1v1h-1zM12 28h2v1h-2zM16 28h1v1h-1zM18 28h2v1h-2zM26 28h1v1h-1z" />
    </svg>
  );
}

// Один локализуемый кусок текста: девять вариантов подряд, видим один.
// data-lang читает CSS-правило в download.module.css.
function Loc({
  render,
  inline = false,
}: {
  render: (copy: (typeof DOWNLOAD_COPY)[keyof typeof DOWNLOAD_COPY]) => React.ReactNode;
  inline?: boolean;
}) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span
          key={locale}
          data-lang={locale}
          className={inline ? `${styles.loc} ${styles.locInline}` : styles.loc}
        >
          {render(DOWNLOAD_COPY[locale])}
        </span>
      ))}
    </>
  );
}

// Робот целиком (голова, корпус, руки, ноги) — как на макете, а не
// одна голова, которой рисуется значок Android в большинстве наборов.
function AndroidIcon() {
  return (
    <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M17.05 12.536c-.03-3.017 2.463-4.463 2.575-4.534-1.4-2.05-3.58-2.332-4.355-2.363-1.855-.188-3.62 1.09-4.56 1.09-.94 0-2.39-1.063-3.93-1.034-2.02.03-3.885 1.175-4.925 2.985-2.1 3.64-.537 9.03 1.51 11.985 1 1.445 2.19 3.067 3.75 3.01 1.505-.06 2.073-.973 3.89-.973 1.817 0 2.33.973 3.92.94 1.62-.026 2.645-1.47 3.635-2.92 1.145-1.675 1.615-3.295 1.643-3.378-.036-.016-3.152-1.21-3.183-4.808M14.79 3.9c.83-1.006 1.39-2.404 1.237-3.798-1.195.048-2.644.796-3.502 1.8-.77.89-1.444 2.313-1.263 3.678 1.334.104 2.697-.678 3.528-1.68" />
    </svg>
  );
}

export default function DownloadPage() {
  return (
    <main className={`${montserrat.variable} ${styles.page}`}>
      <script dangerouslySetInnerHTML={{ __html: PLATFORM_INIT_SCRIPT }} />
      {/* невидимый слушатель: считает нажатия по кнопкам установки */}
      <Interactions />
      {/* два слоя иллюстрации: светлая проявляется поверх тёмной,
          поэтому смена темы выглядит как растворение, а не как перезагрузка */}
      <div className={styles.bg} aria-hidden="true" />
      <div className={`${styles.bg} ${styles.bgLight}`} aria-hidden="true" />
      <div className={styles.bgFade} aria-hidden="true" />
      {/* звёзды, падающие звёзды, дымка и искры + параллакс за курсором */}
      <Ambience />

      <div className={styles.container}>
        <header className={styles.header}>
          {/* Логотип — файл, который прислал Александр 14.09.2026
              (синий градиент с белой обводкой и свечением), а не
              brand-SVG сайта: на тёмном фоне он выглядит лучше. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/download/a1-logo.webp" alt="A1" width={400} height={300} />

          <div className={styles.headerRight}>
            {/* фирменный трек: по умолчанию молчит, включается нажатием */}
            <Sound />
            {/* ссылка на сайт + мини-превью, раскрывающееся по наведению */}
            <SitePreview />
            {/* одна кнопка «…»: тема, язык и «поділитися» внутри */}
            <Menu />
          </div>
        </header>
      </div>

      <div className={`${styles.container} ${styles.hero}`}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>
            <Loc
              render={(copy) => (
                <>
                  {copy.headline} <span className={styles.accent}>{copy.headlineAccent}</span>
                </>
              )}
            />
          </h1>

          <p className={styles.subtitle}>
            <Loc render={(copy) => copy.subtitle} />
          </p>

          <div className={styles.actions}>
            {/* QR — только на широком десктопе: с компьютера приложение
                поставить не с чего, и это единственный мостик на телефон.
                Стоит справа от кнопок и вынесен из потока, поэтому сами
                кнопки остаются ровно того же размера и на том же месте */}
            <QrCode />
            <a
              className={`${styles.btn} ${styles.android}`}
              href={DOWNLOAD_LINKS.googlePlay}
              rel="noopener"
              data-track="android"
              data-magnet=""
            >
              <AndroidIcon />
              <span className={styles.btnText}>
                <Loc
                  render={(copy) => (
                    <>
                      <span className={styles.btnTop}>{copy.downloadVerb}</span>
                      <span className={styles.btnBottom}>{copy.android}</span>
                    </>
                  )}
                />
              </span>
            </a>

            <a
              className={`${styles.btn} ${styles.ios}`}
              href={DOWNLOAD_LINKS.appStore}
              rel="noopener"
              data-track="ios"
              data-magnet=""
            >
              <AppleIcon />
              <span className={styles.btnText}>
                <Loc
                  render={(copy) => (
                    <>
                      <span className={styles.btnTop}>{copy.downloadVerb}</span>
                      <span className={styles.btnBottom}>{copy.ios}</span>
                    </>
                  )}
                />
              </span>
            </a>
          </div>

          <p className={styles.note}>
            <Loc render={(copy) => copy.note} />
          </p>
        </div>
      </div>
    </main>
  );
}

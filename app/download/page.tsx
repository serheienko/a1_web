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
//    собственной шапке стоит переключатель языков (./lang-switch.tsx).
//
// 3. Тексты и ссылки вынесены целиком в ./copy.ts. Все девять языков
//    рендерятся сразу, нужный показывает CSS — тот же приём, что и в
//    components/t.tsx, так что страница остаётся статической и
//    индексируемой, без клиентского JS и без мигания языком.
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { LOCALES } from "@/components/t";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import { LangSwitch } from "./lang-switch";
import { ThemeSwitch } from "./theme-switch";
import { Interactions } from "./interactions";
import { SitePreview } from "./site-preview";
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

// QR ведёт на эту же страницу, а не сразу в магазин: человек откроет её
// на телефоне и попадёт на кнопку своей платформы (её же и подставит
// скрипт выше). Ссылка на конкретный магазин здесь была бы ошибкой —
// половина сканирующих оказалась бы не в своём сторе.
function QrCode() {
  return (
    <svg className={styles.qrImage} viewBox="0 0 29 29" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M0 0h7v1h-7zM8 0h1v1h-1zM10 0h1v1h-1zM12 0h1v1h-1zM17 0h2v1h-2zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM9 1h3v1h-3zM16 1h1v1h-1zM19 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM9 2h1v1h-1zM13 2h1v1h-1zM15 2h6v1h-6zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM14 3h3v1h-3zM19 3h1v1h-1zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h2v1h-2zM11 4h4v1h-4zM16 4h3v1h-3zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h3v1h-3zM12 5h4v1h-4zM17 5h1v1h-1zM19 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h2v1h-2zM11 7h1v1h-1zM14 7h1v1h-1zM17 7h3v1h-3zM0 8h1v1h-1zM4 8h1v1h-1zM6 8h5v1h-5zM12 8h6v1h-6zM19 8h7v1h-7zM28 8h1v1h-1zM0 9h3v1h-3zM4 9h1v1h-1zM7 9h1v1h-1zM10 9h1v1h-1zM12 9h1v1h-1zM18 9h1v1h-1zM22 9h1v1h-1zM24 9h5v1h-5zM3 10h1v1h-1zM5 10h3v1h-3zM9 10h2v1h-2zM12 10h4v1h-4zM17 10h2v1h-2zM24 10h1v1h-1zM28 10h1v1h-1zM1 11h1v1h-1zM3 11h2v1h-2zM9 11h1v1h-1zM11 11h1v1h-1zM13 11h1v1h-1zM15 11h3v1h-3zM19 11h3v1h-3zM23 11h1v1h-1zM25 11h1v1h-1zM27 11h2v1h-2zM0 12h1v1h-1zM3 12h5v1h-5zM13 12h1v1h-1zM17 12h1v1h-1zM20 12h2v1h-2zM23 12h1v1h-1zM27 12h1v1h-1zM1 13h1v1h-1zM4 13h1v1h-1zM9 13h1v1h-1zM11 13h4v1h-4zM16 13h3v1h-3zM20 13h1v1h-1zM22 13h7v1h-7zM2 14h1v1h-1zM4 14h4v1h-4zM9 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM21 14h6v1h-6zM28 14h1v1h-1zM0 15h1v1h-1zM2 15h1v1h-1zM4 15h1v1h-1zM14 15h1v1h-1zM17 15h2v1h-2zM22 15h2v1h-2zM27 15h2v1h-2zM0 16h2v1h-2zM3 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM12 16h4v1h-4zM17 16h1v1h-1zM19 16h1v1h-1zM27 16h1v1h-1zM0 17h1v1h-1zM2 17h1v1h-1zM5 17h1v1h-1zM7 17h1v1h-1zM10 17h1v1h-1zM12 17h1v1h-1zM21 17h5v1h-5zM27 17h2v1h-2zM2 18h8v1h-8zM11 18h1v1h-1zM13 18h4v1h-4zM18 18h1v1h-1zM21 18h2v1h-2zM24 18h1v1h-1zM26 18h1v1h-1zM28 18h1v1h-1zM3 19h1v1h-1zM8 19h3v1h-3zM13 19h1v1h-1zM15 19h1v1h-1zM17 19h2v1h-2zM22 19h1v1h-1zM24 19h1v1h-1zM27 19h2v1h-2zM0 20h2v1h-2zM3 20h4v1h-4zM9 20h1v1h-1zM11 20h3v1h-3zM17 20h1v1h-1zM19 20h7v1h-7zM28 20h1v1h-1zM8 21h1v1h-1zM11 21h1v1h-1zM13 21h6v1h-6zM20 21h1v1h-1zM24 21h1v1h-1zM28 21h1v1h-1zM0 22h7v1h-7zM8 22h2v1h-2zM15 22h1v1h-1zM18 22h3v1h-3zM22 22h1v1h-1zM24 22h3v1h-3zM28 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM11 23h1v1h-1zM14 23h4v1h-4zM19 23h2v1h-2zM24 23h1v1h-1zM27 23h2v1h-2zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM8 24h2v1h-2zM11 24h1v1h-1zM13 24h2v1h-2zM17 24h1v1h-1zM19 24h7v1h-7zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM9 25h2v1h-2zM12 25h1v1h-1zM15 25h7v1h-7zM28 25h1v1h-1zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM9 26h1v1h-1zM11 26h5v1h-5zM17 26h2v1h-2zM21 26h1v1h-1zM25 26h4v1h-4zM0 27h1v1h-1zM6 27h1v1h-1zM10 27h2v1h-2zM13 27h2v1h-2zM17 27h1v1h-1zM19 27h7v1h-7zM27 27h2v1h-2zM0 28h7v1h-7zM8 28h4v1h-4zM14 28h2v1h-2zM17 28h1v1h-1zM20 28h2v1h-2zM25 28h1v1h-1zM27 28h1v1h-1z" />
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
            {/* ссылка на сайт + мини-превью, раскрывающееся по наведению */}
            <SitePreview />
            <LangSwitch />
            <ThemeSwitch />
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
            <a
              className={`${styles.btn} ${styles.android}`}
              href={DOWNLOAD_LINKS.googlePlay}
              rel="noopener"
              data-track="android"
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

          <div className={styles.afterActions}>
            <p className={styles.note}>
              <Loc render={(copy) => copy.note} />
            </p>

            {/* QR — только на десктопе: там приложение поставить не с чего,
                и это единственный мостик с большого экрана на телефон */}
            <div className={styles.qr}>
              <span className={styles.qrFrame}>
                <QrCode />
              </span>
              <span className={styles.qrHint}>
                <Loc render={(copy) => copy.qrHint} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

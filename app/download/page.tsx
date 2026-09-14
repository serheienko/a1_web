// app/download/page.tsx
//
// Aleksandr, 2026-09-14: «нам надо сделать установочную страницу,
// которую мы будем шарить в соцсетях» — отдельный тёмный первый экран
// с котом и двумя кнопками установки, живёт на jobs.a1appp.com/download.
//
// Три вещи, которые здесь сделаны намеренно:
//
// 1. Страница не пользуется ни глобальной темой сайта, ни его
//    типографикой — она всегда тёмная и всегда на Montserrat. Поэтому
//    стили лежат в собственном CSS-модуле (download.module.css), а не в
//    Tailwind-утилитах, завязанных на dark:/globals.css.
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
  },
};

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
      <div className={styles.bg} aria-hidden="true" />
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

            <a className={`${styles.btn} ${styles.ios}`} href={DOWNLOAD_LINKS.appStore} rel="noopener">
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

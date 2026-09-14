// app/download/page.tsx
//
// Aleksandr, 2026-09-14: «нам надо сделать установочную страницу,
// которую мы будем шарить в соцсетях» — отдельный тёмный первый экран
// с котом и двумя кнопками установки, живёт на jobs.a1appp.com/download.
//
// Три вещи, которые здесь сделаны намеренно:
//
// 1. Страница не пользуется ни глобальной темой сайта, ни его
//    типографикой — она всегда тёмная и всегда на Inter. Поэтому стили
//    лежат в собственном CSS-модуле (download.module.css), а не в
//    Tailwind-утилитах, завязанных на dark:/globals.css.
//
// 2. Навигация сайта и три плавающие кнопки (чаты, «+», «наверх») на
//    этом маршруте скрыты — см. pathname-гварды в components/site-nav.tsx,
//    chats-fab.tsx, scroll-top-fab.tsx, create-post-fab.tsx. Это
//    рекламная страница-плакат, а не часть ленты.
//
// 3. Тексты и ссылки вынесены целиком в ./copy.ts. Все девять языков
//    рендерятся сразу, нужный показывает CSS — тот же приём, что и в
//    components/t.tsx, так что страница остаётся статической и
//    индексируемой, без клиентского JS и без мигания языком.
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LOCALES } from "@/components/t";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import styles from "./download.module.css";

// Inter — шрифт из макета (у остального сайта другой, Commissioner:
// см. app/layout.tsx). Подключается локально в этом файле, поэтому
// на другие страницы не влияет и грузится только здесь.
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Завантаж A1 — робота та таланти в один дотик",
  description: "Знаходь роботу й таланти. Спілкуйся напряму. Застосунок A1 для Android та iOS.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Завантаж A1 — робота та таланти в один дотик",
    description: "Знаходь роботу й таланти. Спілкуйся напряму. Застосунок A1 для Android та iOS.",
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

function AndroidIcon() {
  return (
    <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
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
    <main className={`${inter.variable} ${styles.page}`}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.bgFade} aria-hidden="true" />

      <div className={styles.container}>
        <header className={styles.header}>
          {/* Логотип белой версией — страница всегда тёмная, поэтому
              пара «светлый/тёмный», как в site-nav.tsx, здесь не нужна. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/brand/a1-logo-white.svg" alt="A1" width={96} height={44} />

          <a className={styles.siteLink} href={DOWNLOAD_LINKS.website}>
            <Loc inline render={(copy) => copy.site} />
            <span className={styles.siteArrow} aria-hidden="true">
              ↗
            </span>
          </a>
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

          {/* Иллюстрация в мобильной раскладке: между текстом и
              кнопками, отдельным кадром, где кот виден целиком.
              На десктопе этот блок скрыт — там та же иллюстрация
              работает фоном всей секции (.bg). */}
          <div className={styles.art} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.artImage}
              src="/download/hero-mobile.webp"
              alt=""
              width={1012}
              height={941}
              fetchPriority="high"
            />
          </div>

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

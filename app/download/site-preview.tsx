// app/download/site-preview.tsx
//
// Aleksandr, 2026-09-14: «давай каким-то красивым попапчиком сделаем
// превью, когда наводишь на кнопку "Сайт A1"... такое окно "заглянуть,
// а что там на сайте", чтобы ценность быстрее понятна была».
//
// Ссылка на сайт осталась обычной ссылкой — превью только дополняет её,
// не заменяет: клик работает и без наведения, и на телефоне, где
// никакого попапа нет вовсе (он показывается только там, где есть
// настоящий hover — см. .sitePreviewOuter в download.module.css).
//
// Механика раскрытия — тот же общий хук lib/use-hover-panel.ts, что у
// переключателя языков рядом и у меню на остальном сайте.
//
// Внутри — ЖИВАЯ главная сайта в <iframe> (Aleksandr, 14.09.2026: «у нас
// же на главной всего 20 постов, должно быть норм»), поэтому превью
// всегда показывает настоящие свежие вакансии, а не устаревающий снимок.
// Чтобы это осталось дешёвым, сделаны три вещи:
//
// 1. Рамка монтируется не сразу, а через HOVER_INTENT_MS после
//    раскрытия — случайное движение мыши через ссылку ничего не грузит.
// 2. Загрузившись один раз, рамка больше не размонтируется: панель
//    остаётся в дереве и просто «паркуется» в нулевой размер, пока
//    курсор не вернётся. Сколько бы раз посетитель ни наводил мышь,
//    запрос к серверу уходит РОВНО один за посещение страницы (без
//    этого каждое новое наведение перезагружало бы страницу заново —
//    поймано замером).
// 3. Пока рамка грузится — и если браузер откажется её показывать —
//    под ней лежит статичный снимок public/download/site-preview.webp,
//    так что пустого окна посетитель не увидит никогда.
//
// Рамка same-origin (jobs.a1appp.com грузится внутри собственной же
// страницы), поэтому никаких ограничений на встраивание тут нет, а сама
// главная отдаётся из ISR-кэша — лишней работы бэкенду это не создаёт.
// pointer-events на рамке выключены: клик по превью ведёт на сайт, а не
// «проваливается» внутрь чужого скролла.
"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import styles from "./download.module.css";

// Задержка перед загрузкой живой рамки: мышь, просто проехавшая через
// ссылку, не должна тянуть целую страницу.
const HOVER_INTENT_MS = 250;

export function SitePreview() {
  const [open, setOpen] = useState(false);
  const [frameMounted, setFrameMounted] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const frameArmedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
  ]);

  useEffect(() => {
    if (!open || frameArmedRef.current) return;
    const timer = setTimeout(() => {
      frameArmedRef.current = true;
      setFrameMounted(true);
    }, HOVER_INTENT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div
      className={styles.siteWrap}
      ref={wrapRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a className={styles.siteLink} href={DOWNLOAD_LINKS.website}>
        <span className={styles.siteLinkText}>
          {LOCALES.map((locale) => (
            <span key={locale} data-lang={locale} className={`${styles.loc} ${styles.locInline}`}>
              {DOWNLOAD_COPY[locale].site}
            </span>
          ))}
        </span>
        <span className={styles.siteArrow} aria-hidden="true">
          ↗
        </span>
      </a>

      {(rendered || frameMounted) && (
        /*
         * `frameMounted` в условии — это та самая парковка из пункта 2
         * в заголовке файла: после первой загрузки панель остаётся
         * смонтированной навсегда. Пока попап закрыт, .sitePreviewParked
         * ужимает её в нулевой размер — она не видна, не кликается и
         * (важно для hover-геометрии в use-hover-panel) не имеет
         * площади, на которую можно случайно навести мышь.
         */
        <div
          className={rendered ? styles.sitePreviewOuter : `${styles.sitePreviewOuter} ${styles.sitePreviewParked}`}
          ref={panelRef}
        >
          <a
            className={visible ? `${styles.sitePreview} ${styles.sitePreviewVisible}` : styles.sitePreview}
            href={DOWNLOAD_LINKS.website}
          >
            <span className={styles.sitePreviewShot}>
              {/* снимок-плейсхолдер: виден, пока грузится живая рамка */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/download/site-preview.webp" alt="" width={760} height={355} loading="lazy" />

              {frameMounted && (
                <span
                  className={
                    frameLoaded ? `${styles.sitePreviewFrame} ${styles.sitePreviewFrameReady}` : styles.sitePreviewFrame
                  }
                >
                  <iframe
                    src={DOWNLOAD_LINKS.website}
                    title=""
                    aria-hidden="true"
                    tabIndex={-1}
                    scrolling="no"
                    loading="lazy"
                    /*
                     * Показываем рамку только если внутри действительно
                     * наша страница. onLoad срабатывает и на странице
                     * ошибки браузера (нет сети, сайт не ответил) — она
                     * лежит на чужом origin, поэтому обращение к её
                     * contentDocument бросает исключение или отдаёт
                     * пустое тело. В этом случае рамка так и остаётся
                     * прозрачной, а посетитель видит снимок под ней.
                     */
                    onLoad={(event) => {
                      try {
                        const doc = event.currentTarget.contentDocument;
                        if (doc?.body && doc.body.childElementCount > 0) setFrameLoaded(true);
                      } catch {
                        // чужой origin — значит это не наша страница
                      }
                    }}
                  />
                </span>
              )}
            </span>

            <span className={styles.sitePreviewBody}>
              <span className={styles.sitePreviewTitle}>
                {LOCALES.map((locale) => (
                  <span key={locale} data-lang={locale} className={styles.loc}>
                    {DOWNLOAD_COPY[locale].previewTitle}
                  </span>
                ))}
              </span>

              <span className={styles.sitePreviewText}>
                {LOCALES.map((locale) => (
                  <span key={locale} data-lang={locale} className={styles.loc}>
                    {DOWNLOAD_COPY[locale].previewText}
                  </span>
                ))}
              </span>

              <span className={styles.sitePreviewCta}>
                {LOCALES.map((locale) => (
                  <span key={locale} data-lang={locale} className={`${styles.loc} ${styles.locInline}`}>
                    {DOWNLOAD_COPY[locale].previewCta}
                  </span>
                ))}
                <span aria-hidden="true">→</span>
              </span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

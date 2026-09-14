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
// Почему картинка, а не живой <iframe> с jobs.a1appp.com: iframe тянул
// бы целую страницу ленты с запросами к API на каждое наведение — за
// это платит и посетитель (трафик, задержка), и бэкенд. Здесь же один
// статичный webp на 16 КБ. Цена — картинку надо обновлять руками, когда
// главная заметно изменится: public/download/site-preview.webp.
"use client";

import { useRef, useState } from "react";
import { LOCALES } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import styles from "./download.module.css";

export function SitePreview() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
  ]);

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

      {rendered && (
        <div className={styles.sitePreviewOuter} ref={panelRef}>
          <a
            className={visible ? `${styles.sitePreview} ${styles.sitePreviewVisible}` : styles.sitePreview}
            href={DOWNLOAD_LINKS.website}
          >
            <span className={styles.sitePreviewShot}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/download/site-preview.webp" alt="" width={760} height={355} loading="lazy" />
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

// app/download/share-button.tsx
//
// Aleksandr, 2026-09-14: кнопка «Поділитися» — чтобы страница начала
// распространять себя сама. Это ведь страница, которую он шарит в
// соцсетях: если человеку зашло, ему должно быть легко переслать её
// дальше, а не копировать адрес из строки браузера руками.
//
// На телефоне открывается родное меню шеринга (Web Share API) — тот же
// лист, что и в любом приложении. На десктопе такого меню обычно нет,
// поэтому ссылка просто копируется, и кнопка на пару секунд говорит об
// этом словом. Если недоступно и то и другое (старый браузер, страница
// без защищённого соединения), кнопка не показывается вовсе — пустая
// кнопка, которая ничего не делает, хуже её отсутствия.
"use client";

import { useEffect, useState } from "react";
import { LOCALES } from "@/components/t";
import { DOWNLOAD_COPY, DOWNLOAD_LINKS } from "./copy";
import styles from "./download.module.css";

export function ShareButton() {
  const [supported, setSupported] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && (!!navigator.share || !!navigator.clipboard));
  }, []);

  if (!supported) return null;

  async function share() {
    const url = `${DOWNLOAD_LINKS.website}/download`;
    // заголовок берём тот, что видит сам посетитель — по активному языку
    const active = LOCALES.find((l) => document.documentElement.classList.contains(`lang-${l.toLowerCase()}`));
    const copy = DOWNLOAD_COPY[active ?? "uk"];
    const text = `${copy.headline} ${copy.headlineAccent}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "A1", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // человек закрыл системное меню — это не ошибка, просто выходим
    }
  }

  return (
    <button
      type="button"
      className={styles.shareButton}
      onClick={share}
      data-track="share"
      aria-label="Share"
      title="Share"
    >
      {copied ? (
        // галочка вместо иконки на те пару секунд, пока ссылка «в руках»
        <svg className={styles.shareIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m5 12.5 4.2 4.3L19 7"
          />
        </svg>
      ) : (
        <svg className={styles.shareIcon} viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="17.5" cy="5.5" r="2.6" />
            <circle cx="6.5" cy="12" r="2.6" />
            <circle cx="17.5" cy="18.5" r="2.6" />
            <path d="m8.9 10.8 6.2-3.6M8.9 13.2l6.2 3.6" />
          </g>
        </svg>
      )}
    </button>
  );
}

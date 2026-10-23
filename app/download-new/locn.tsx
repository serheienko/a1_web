// app/download-new/locn.tsx
//
// Тот же приём, что Loc в ../download/page.tsx: девять языков рендерятся
// сразу, нужный показывает CSS (классы lang-XX на <html>). Здесь — для
// текстов новых блоков (./copy.ts). Правила показа берём из CSS-модуля
// старой страницы, чтобы не плодить копии.
import { LOCALES } from "@/components/t";
import { NEW_COPY, type NewCopy } from "./copy";
import styles from "../download/download.module.css";

export function LocN({
  render,
  inline = false,
}: {
  render: (copy: NewCopy) => React.ReactNode;
  inline?: boolean;
}) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} data-lang={locale} className={inline ? `${styles.loc} ${styles.locInline}` : styles.loc}>
          {render(NEW_COPY[locale])}
        </span>
      ))}
    </>
  );
}

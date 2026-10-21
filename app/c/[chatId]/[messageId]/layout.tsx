// Страница ссылки на сообщение группового чата (2026-10-21).
// Закрыта от индексации: это личные ссылки, не контент сайта.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Повідомлення в A1",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

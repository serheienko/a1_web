// Страница вступления в группу по ссылке-приглашению (волна 2 групп,
// 2026-10-03). Закрыта от индексации: это личные ссылки, не контент.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Запрошення до групи | A1",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

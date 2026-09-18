// Серверный layout для клиентской страницы /blocked -- то же самое, что
// у /contacts: заголовок вкладки и noindex. Смысл noindex расписан в
// app/contacts/layout.tsx: попасть сюда можно только вошедшему, в выдаче
// такой странице делать нечего.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Заблоковані | A1",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

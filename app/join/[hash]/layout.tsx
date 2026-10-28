// Страница вступления в группу по ссылке-приглашению (волна 2 групп,
// 2026-10-03). Закрыта от индексации: это личные ссылки, не контент.
// 28.10.2026: в заголовке превью -- название группы.
import type { Metadata } from "next";
import { fetchInvitePreview } from "@/lib/seo/group-invite";

type Props = { params: Promise<{ hash: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { hash } = await params;
  const g = await fetchInvitePreview(decodeURIComponent(hash));
  const title = g ? `${g.title} | A1` : "Запрошення до групи | A1";
  return {
    title,
    openGraph: { title, type: "website" },
    twitter: { card: "summary_large_image", title },
    robots: { index: false, follow: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

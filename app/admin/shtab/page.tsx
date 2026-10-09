// app/admin/shtab/page.tsx
//
// 09.10.2026 (Александр: «выложим на сайт… чтобы я понимал, отработал он
// сегодня или нет»). Штаб агентов: 2D-этаж с лампочками. Закрыт так же, как
// /admin/posts: не из списка ADMIN_EMAILS -- обычный 404.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { ShtabBoard } from "@/components/shtab-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Штаб A1",
  robots: { index: false, follow: false },
};

export default async function ShtabPage() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) notFound();
  return <ShtabBoard />;
}

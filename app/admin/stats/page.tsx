// app/admin/stats/page.tsx
//
// 11.10.2026 (Александр: «надо отслеживать количество кликов точно на
// перейти по ссылке и на забрать компанию, для статистики»). Та же
// проверка доступа, что и у остальных админских страниц.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { AdminStatsPanel } from "@/components/admin-stats-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminStatsPage() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    notFound();
  }
  return <AdminStatsPanel />;
}

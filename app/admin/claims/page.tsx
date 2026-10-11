// app/admin/claims/page.tsx
//
// 11.10.2026. Заявки компаний, которых правило проверить не смогло.
// Доступ -- та же проверка, что и у остальных админских страниц.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { AdminClaimsPanel } from "@/components/admin-claims-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminClaimsPage() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    notFound();
  }
  return <AdminClaimsPanel />;
}

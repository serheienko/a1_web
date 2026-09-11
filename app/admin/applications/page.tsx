// app/admin/applications/page.tsx
//
// 2026-09-11 (Aleksandr: "С откликами я хочу довести до конца... Я сам
// рандомно откликнусь и хочу посмотреть что отклик пришел"). Same
// server-component access gate as app/admin/posts/page.tsx — read its
// header for why the check happens here rather than client-side, and
// why an unauthorized visitor gets a plain 404. All the work is in
// components/admin-applications-panel.tsx.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { AdminApplicationsPanel } from "@/components/admin-applications-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminApplicationsPage() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    notFound();
  }

  return <AdminApplicationsPanel signedInAs={session!.email} />;
}

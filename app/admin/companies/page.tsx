// app/admin/companies/page.tsx
//
// 2026-09-11 (Aleksandr: "хочу увидеть функционал передачи акка в
// админке"). Every imported company account in one searchable list, each
// row with a "hand this account over" button that mints a claim link.
// Same access gate as the other two admin pages — see app/admin/posts/
// page.tsx's header.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { AdminCompaniesPanel } from "@/components/admin-companies-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminCompaniesPage() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    notFound();
  }

  return <AdminCompaniesPanel signedInAs={session!.email} />;
}

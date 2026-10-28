// app/cv-builder/[lang]/[role]/page.tsx -- «пример резюме» для роли (28.10.2026).
// /cv-builder/uk/flutter-developer, /cv-builder/en/flutter-developer, ... 25 ролей x 9 языков.
// Собираются при первом заходе и обновляются раз в час (цифры из вакансий).
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CvRolePage, cvRoleMetadata } from "@/lib/cv-roles/page";
import { findCvRole } from "@/lib/cv-roles/roles";
import { roleLangFromSegment } from "@/lib/cv-roles/registry";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: string; role: string }> };

async function resolve(params: Props["params"]) {
  const { lang: seg, role } = await params;
  const lang = roleLangFromSegment(seg);
  const def = findCvRole(role);
  return lang && def ? { lang, slug: def.slug } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  return r ? cvRoleMetadata(r.lang, r.slug) : {};
}

export default async function Page({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  return <CvRolePage lang={r.lang} slug={r.slug} />;
}

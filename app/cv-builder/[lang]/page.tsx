// app/cv-builder/[lang]/page.tsx -- «CV Builder» на en, ru, de, es, fr, pl, pt-br, zh (28.10.2026).
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { cvLandingMetadata, CvLandingPage } from "@/lib/cv-landing/page";
import { CV_LANDING_SEGMENT, cvLandingLangFromSegment } from "@/lib/cv-landing/registry";

export const revalidate = 86400;
export const dynamicParams = false;

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  // «uk» -- только чтобы /cv-builder/uk вело на /cv-builder (украинская версия без сегмента).
  return [...Object.values(CV_LANDING_SEGMENT), "uk"].map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = cvLandingLangFromSegment((await params).lang);
  return lang ? cvLandingMetadata(lang) : {};
}

export default async function Page({ params }: Props) {
  const seg = (await params).lang;
  if (seg === "uk") permanentRedirect("/cv-builder");
  const lang = cvLandingLangFromSegment(seg);
  if (!lang) notFound();
  return <CvLandingPage lang={lang} />;
}

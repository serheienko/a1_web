// app/cv-builder/page.tsx -- «CV Builder», украинская версия (28.10.2026). Остальные языки -- ./[lang].
import { cvLandingMetadata, CvLandingPage } from "@/lib/cv-landing/page";

export const revalidate = 86400;
export const metadata = cvLandingMetadata("uk");

export default function Page() {
  return <CvLandingPage lang="uk" />;
}

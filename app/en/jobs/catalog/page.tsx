export const runtime = "nodejs";
export const revalidate = 3600;

// app/en/jobs/catalog/page.tsx -- каталог добірок на языке «en» (components/localized-catalog.tsx).
import type { Metadata } from "next";
import { CATALOG_TEXT, LocalizedCatalog } from "@/components/localized-catalog";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";

const LOC = "en" as const;
const PATH = "/jobs/catalog";

export const metadata: Metadata = {
  title: CATALOG_TEXT.title[LOC],
  description: CATALOG_TEXT.description[LOC],
  alternates: { canonical: `${SITE_URL}/${LOC}${PATH}`, languages: altLanguages(PATH) },
  openGraph: { title: CATALOG_TEXT.title[LOC], description: CATALOG_TEXT.description[LOC], url: `${SITE_URL}/${LOC}${PATH}`, type: "website" },
  twitter: { card: "summary_large_image", title: CATALOG_TEXT.title[LOC], description: CATALOG_TEXT.description[LOC] },
};

export default async function Page() {
  return <LocalizedCatalog locale={LOC} />;
}

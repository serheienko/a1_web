export const runtime = "nodejs";
// Час, как у остальных посадочных: это витрина стека, а не живая лента,
// и обход всех вакансий (lib/a1/tech-index.ts) не должен повторяться
// чаще, чем содержимое реально меняется.
export const revalidate = 3600;

// app/jobs/stack/[slug]/page.tsx
//
// 2026-09-18. Посадочная по стеку: /jobs/stack/python и ещё семьдесят три.
// Зачем они и почему стали возможны только сейчас -- в шапке lib/seo/tech-landings.ts.
//
// Адрес с отдельным сегментом "stack" не случайно: /jobs/<slug> -- это страница вакансии,
// и любое новое статическое имя прямо под /jobs пришлось бы держать в голове вечно.
//
// 29.10.2026: тело страницы переехало в components/stack-landing.tsx -- его делят украинский
// адрес и языковой /en/jobs/stack/<slug> (мастер-план «Языковые версии сайта»).
//
// generateStaticParams здесь НЕТ намеренно: каждая такая страница поднимает обход всех вакансий,
// а сборка раскладывает страницы по процессам -- общий кэш между ними не работает.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { StackLanding } from "@/components/stack-landing";
import { findTechLanding, techLandingMeta } from "@/lib/seo/tech-landings";
import { titleWithCount } from "@/lib/seo/title-count";
import { postsForTech } from "@/lib/a1/tech-index";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const landing = findTechLanding((await params).slug);
  if (!landing) return {};
  const meta = techLandingMeta(landing.label);
  // 29.10.2026: число открытых вакансий и месяц в названии (lib/seo/title-count.ts).
  const count = (await postsForTech(landing.tech).catch(() => [])).length;
  meta.title = titleWithCount(`${landing.label} вакансії`, count, meta.title);
  const path = `/jobs/stack/${landing.slug}`;
  const url = `${SITE_URL}${path}`;

  return pagedMeta({
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const landing = findTechLanding((await params).slug);
  if (!landing) notFound();
  return <StackLanding landing={landing} page={pageOf(await searchParams)} />;
}

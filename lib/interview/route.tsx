// lib/interview/route.tsx -- общие части четырёх маршрутов раздела «Питання на співбесіді».

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InterviewHub, InterviewPage, INTERVIEW_HUB_META } from "@/components/interview-page";
import type { InterviewLang } from "./types";
import { INTERVIEW_ENTRIES, findInterview, interviewAlternates, interviewPosts } from "./registry";
import { interviewStats } from "./stats";


export function interviewRoleMetadata(lang: InterviewLang, slug: string): Metadata {
  const entry = findInterview(slug);
  if (!entry) notFound();
  const g = entry.content[lang];
  const alternates = interviewAlternates(lang, entry.slug);
  return {
    title: `${g.title} | A1 Jobs`,
    description: g.description,
    alternates,
    openGraph: {
      title: g.title,
      description: g.description,
      url: alternates.canonical,
      type: "article",
      locale: lang === "uk" ? "uk_UA" : "en_US",
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  };
}

export async function renderInterviewRole(lang: InterviewLang, slug: string) {
  const entry = findInterview(slug);
  if (!entry) notFound();
  const posts = await interviewPosts(entry);
  return <InterviewPage entry={entry} lang={lang} stats={interviewStats(entry, posts)} />;
}

export function interviewHubMetadata(lang: InterviewLang): Metadata {
  const m = INTERVIEW_HUB_META[lang];
  const alternates = interviewAlternates(lang);
  return {
    title: m.title,
    description: m.description,
    alternates,
    openGraph: { title: m.title, description: m.description, url: alternates.canonical, type: "website", locale: lang === "uk" ? "uk_UA" : "en_US" },
  };
}

export async function renderInterviewHub(lang: InterviewLang) {
  const counts: Record<string, number> = {};
  await Promise.all(
    INTERVIEW_ENTRIES.map(async (e) => {
      counts[e.slug] = (await interviewPosts(e)).length;
    }),
  );
  return <InterviewHub lang={lang} counts={counts} />;
}

// lib/cv-roles/page.tsx -- страница «пример резюме» для роли (28.10.2026).
// Пример CV с навыками роли (живой лист, как на главной CV Builder), что
// ищут рекрутеры, навыки из вакансий A1 (доля), медиана зарплат, три примера
// «о себе», совет, ошибки, FAQ, свежие вакансии и соседние роли. Разметка
// для Google: Article, FAQPage, BreadcrumbList.

import type { Metadata } from "next";
import Link from "next/link";
import { CvLandingCta } from "@/components/cv-landing-cta";
import { CV_FX_CSS, CvTilt, HeroCv } from "@/components/cv-landing-fx";
import type { CvLandingLang } from "@/lib/cv-landing/types";
import { CV_LANDING, CV_LANDING_HREFLANG, CV_LANDING_OG_LOCALE, CV_LANDING_SITE, cvLandingPath } from "@/lib/cv-landing/registry";
import { findCvRole } from "@/lib/cv-roles/roles";
import type { RoleSlug } from "@/lib/cv-roles/types";
import { ROLE_TEXT, ROLE_UI, fillTpl, roleAlternates, rolePath } from "@/lib/cv-roles/registry";
import { roleStats } from "@/lib/cv-roles/data";

const YEAR = new Date().getFullYear();

export function cvRoleMetadata(lang: CvLandingLang, slug: RoleSlug): Metadata {
  const ui = ROLE_UI[lang];
  const t = ROLE_TEXT[lang][slug];
  const vars = { role: t.nameInTitle, year: YEAR };
  const title = fillTpl(ui.titleTpl, vars);
  const description = fillTpl(ui.descriptionTpl, vars);
  const alternates = roleAlternates(lang, slug);
  return {
    title: { absolute: title },
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, type: "article", locale: CV_LANDING_OG_LOCALE[lang] },
    twitter: { card: "summary_large_image", title, description },
  };
}

function money(n: number) {
  return "$" + n.toLocaleString("en-US").replace(/,/g, " ");
}

export async function CvRolePage({ lang, slug }: { lang: CvLandingLang; slug: RoleSlug }) {
  const def = findCvRole(slug)!;
  const ui = ROLE_UI[lang];
  const t = ROLE_TEXT[lang][slug];
  const land = CV_LANDING[lang];
  const stats = await roleStats(def);
  const vars = { role: t.nameInTitle, year: YEAR, n: stats.total.toLocaleString("en-US").replace(/,/g, " ") };
  const path = rolePath(lang, slug);
  const url = `${CV_LANDING_SITE}${path}`;
  const htmlLang = CV_LANDING_HREFLANG[lang];
  const useData = stats.skills.length >= 4 && stats.total >= 20;
  const sheetSkills: [string, number][] = useData
    ? stats.skills.slice(0, 4).map((s, i) => [s.name, [94, 88, 81, 72][i] ?? 70])
    : t.skills.slice(0, 4).map((s, i) => [s, [94, 88, 81, 72][i] ?? 70]);
  const h2 = "text-2xl font-bold tracking-tight text-neutral-900 sm:text-[26px] dark:text-neutral-50";
  const body = "text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400";
  const card = "rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950";
  const faq = ui.faq.map((f) => ({ q: fillTpl(f.q, vars), a: fillTpl(f.a, vars) }));
  const ctaProps = { lang, path, ctaCreate: ui.ctaCreate, ctaDownload: ui.ctaDownload, ctaFill: ui.ctaFill, hint: ui.signedInHint };

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: fillTpl(ui.h1Tpl, vars),
      inLanguage: htmlLang,
      url,
      author: { "@type": "Organization", name: "A1", url: CV_LANDING_SITE },
      publisher: { "@type": "Organization", name: "A1", url: CV_LANDING_SITE },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: htmlLang, mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: land.breadcrumbHome, item: CV_LANDING_SITE },
        { "@type": "ListItem", position: 2, name: land.breadcrumb, item: `${CV_LANDING_SITE}${cvLandingPath(lang)}` },
        { "@type": "ListItem", position: 3, name: t.name, item: url },
      ],
    },
  ];

  return (
    <main lang={htmlLang} className="mx-auto max-w-5xl px-4 pt-6 sm:pt-10 pb-fab-safe">
      <style dangerouslySetInnerHTML={{ __html: CV_FX_CSS }} />
      {ld.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}

      <nav aria-label="breadcrumb" className="text-[13px] text-neutral-500 dark:text-neutral-400">
        <Link href="/" className="hover:text-accent">
          {land.breadcrumbHome}
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={cvLandingPath(lang)} className="hover:text-accent">
          {land.breadcrumb}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{t.name}</span>
      </nav>

      <section className="mt-4 grid items-center gap-10 overflow-x-clip py-2 md:grid-cols-[1.1fr_0.9fr] md:overflow-visible">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">{ui.breadcrumbExamples}</div>
          <h1 className="mt-2 text-[32px] font-extrabold leading-[1.1] tracking-tight text-neutral-900 sm:text-[44px] dark:text-neutral-50">{fillTpl(ui.h1Tpl, vars)}</h1>
          <p className={`mt-4 ${body} sm:text-[17px]`}>{fillTpl(ui.leadTpl, vars)}</p>
          <div className="mt-6">
            <CvLandingCta {...ctaProps} />
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[360px]">
          <div className="pointer-events-none absolute -inset-4 hidden rounded-[40px] bg-[radial-gradient(60%_55%_at_50%_45%,rgba(51,94,247,0.22),transparent_72%)] blur-xl dark:bg-[radial-gradient(62%_58%_at_50%_52%,rgba(107,77,255,0.55),rgba(51,94,247,0.18)_45%,transparent_76%)] md:-inset-8 md:block" aria-hidden="true" />
          <CvTilt>
            <HeroCv lang={lang} alt={fillTpl(ui.h1Tpl, vars)} title={t.name} skills={sheetSkills} />
          </CvTilt>
        </div>
      </section>

      <section className="mt-16">
        <h2 className={h2}>{fillTpl(ui.h2Recruiters, vars)}</h2>
        <p className={`mt-3 max-w-3xl ${body}`}>{t.recruiters}</p>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className={card}>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{useData ? fillTpl(ui.h2Skills, vars) : ui.skillsFallback}</h2>
          {useData ? (
            <>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">{ui.skillsNote}</p>
              <ul className="mt-4 space-y-2.5">
                {stats.skills.slice(0, 8).map((s) => (
                  <li key={s.name}>
                    <div className="flex justify-between text-[14px] font-medium text-neutral-800 dark:text-neutral-200">
                      <span>{s.name}</span>
                      <span className="text-neutral-500">{s.pct}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#EDF0FA] dark:bg-neutral-800">
                      <div className="h-2 rounded-full bg-[linear-gradient(90deg,#335EF7,#A63DF2)]" style={{ width: `${Math.min(100, s.pct)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {t.skills.map((s) => (
                <li key={s} className="rounded-full bg-[#EEF1FE] px-3 py-1.5 text-[14px] font-medium text-[#2840B8] dark:bg-[#1a2350] dark:text-[#b9c6ff]">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {stats.salary ? (
            <div className="rounded-3xl bg-[linear-gradient(125deg,#335EF7_0%,#6A4BF5_55%,#A63DF2_100%)] p-6 text-white">
              <h2 className="text-xl font-bold tracking-tight">{fillTpl(ui.h2Salary, vars)}</h2>
              <div className="mt-3 text-[32px] font-extrabold leading-none">
                {money(stats.salary.from)} – {money(stats.salary.to)}
              </div>
              <p className="mt-2 text-[13px] text-white/80">{ui.salaryNote}</p>
            </div>
          ) : null}
          <div className={card}>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{ui.h2Tip}</h2>
            <p className={`mt-2 ${body}`}>{t.tip}</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className={h2}>{fillTpl(ui.h2Summaries, vars)}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(["junior", "middle", "senior"] as const).map((lv) => (
            <figure key={lv} className={card}>
              <figcaption className="inline-flex rounded-full bg-[#EEF1FE] px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#2840B8] dark:bg-[#1a2350] dark:text-[#b9c6ff]">{ui.levels[lv]}</figcaption>
              <blockquote className={`mt-3 ${body}`}>{t.summaries[lv]}</blockquote>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{ui.h2Github}</h2>
          <p className={`mt-2 ${body}`}>{ui.githubText}</p>
        </div>
        <div className={card}>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{ui.h2Mistakes}</h2>
          <ul className="mt-3 space-y-2">
            {ui.mistakes.map((m) => (
              <li key={m} className={`flex gap-2 ${body}`}>
                <span className="mt-[3px] text-[#e5484d]" aria-hidden="true">
                  ✕
                </span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {stats.recent.length ? (
        <section className="mt-14">
          <h2 className={h2}>{fillTpl(ui.h2Jobs, vars)}</h2>
          <ul className="mt-4 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {stats.recent.map((p) => (
              <li key={p.id}>
                <Link href={`/${p.kind === "seeking" ? "talents" : "jobs"}/${p.slug}`} className="block px-5 py-3.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <span className="block font-medium text-neutral-900 dark:text-neutral-100">{p.title}</span>
                  <span className="block text-[13px] text-neutral-500">
                    {p.author.name}
                    {p.location?.display ? ` · ${p.location.display}` : ""}
                    {p.isRemote ? " · Remote" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className={h2}>{ui.h2Faq}</h2>
        <div className="mt-5 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {faq.map((f, i) => (
            <details key={f.q} className="group px-5 py-4" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                <h3>{f.q}</h3>
                <span className="shrink-0 text-neutral-400 transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className={`mt-2 ${body}`}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className={h2}>{ui.h2Related}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {def.related.map((r) => (
            <li key={r}>
              <Link href={rolePath(lang, r)} className="inline-block rounded-full border border-neutral-200 px-4 py-2 text-[14px] font-medium text-neutral-800 transition hover:border-[#6A4BF5] hover:text-[#6A4BF5] dark:border-neutral-800 dark:text-neutral-200">
                {ROLE_TEXT[lang][r].name}
              </Link>
            </li>
          ))}
          <li>
            <Link href={cvLandingPath(lang)} className="inline-block rounded-full px-4 py-2 text-[14px] font-semibold text-accent hover:underline">
              {land.breadcrumb} →
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-16 rounded-[32px] bg-[linear-gradient(125deg,#335EF7_0%,#6A4BF5_55%,#A63DF2_100%)] p-8 text-white sm:p-12">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{land.finalTitle}</h2>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-white/90">{land.finalText}</p>
        <div className="mt-6">
          <CvLandingCta {...ctaProps} tone="dark" />
        </div>
      </section>
    </main>
  );
}

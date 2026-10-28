// lib/cv-landing/page.tsx -- страница «CV Builder» (28.10.2026).
//
// Александр: «сделать идеальную SEO-страницу, чуть ли не лендинг: люди по
// запросу "CV builder" приходят к нам, делают CV и оставляют заполненный
// профиль». Регистрация обязательна (CV собирается из профиля). Тексты --
// lib/cv-landing/content/<язык>.ts, по ТЗ из SEO-разведки. Весь текст (и
// ответы FAQ) лежит в HTML сразу, без скрытия скриптом, чтобы его видел Google.
// Разметка для Google: WebApplication (бесплатно), HowTo (3 шага), FAQPage,
// BreadcrumbList.

import type { Metadata } from "next";
import Link from "next/link";
import { CV_FX_CSS, CV_FX2_CSS } from "@/lib/cv-landing/fx-css";
import { CvLandingCta } from "@/components/cv-landing-cta";
import { CvCount, CvFeatureCard, CvSteps, CvWords, GhCellsBg } from "@/components/cv-landing-fx2";
import { cvText } from "@/lib/cv/i18n";
import { CV_ROLES } from "@/lib/cv-roles/roles";
import { ROLE_TEXT, rolePath } from "@/lib/cv-roles/registry";
import { CvCheck, CvReveal, CvTilt, HeroCv, QrScanDemo } from "@/components/cv-landing-fx";
import type { CvLandingLang } from "@/lib/cv-landing/types";
import {
  CV_LANDING,
  CV_LANDING_HREFLANG,
  CV_LANDING_LANGS,
  CV_LANDING_OG_LOCALE,
  CV_LANDING_SITE,
  cvLandingAlternates,
  cvLandingPath,
} from "@/lib/cv-landing/registry";

const LANG_NAME: Record<CvLandingLang, string> = {
  uk: "Українська",
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  pl: "Polski",
  ptBR: "Português (Brasil)",
  zh: "中文",
};

export function cvLandingMetadata(lang: CvLandingLang): Metadata {
  const c = CV_LANDING[lang];
  const alternates = cvLandingAlternates(lang);
  return {
    title: { absolute: c.title },
    description: c.description,
    alternates,
    openGraph: {
      title: c.title,
      description: c.description,
      url: alternates.canonical,
      type: "website",
      locale: CV_LANDING_OG_LOCALE[lang],
    },
    twitter: { card: "summary_large_image", title: c.title, description: c.description },
  };
}

function jsonLd(lang: CvLandingLang) {
  const c = CV_LANDING[lang];
  const url = `${CV_LANDING_SITE}${cvLandingPath(lang)}`;
  const inLanguage = CV_LANDING_HREFLANG[lang];
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: c.breadcrumb,
      url,
      inLanguage,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      description: c.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "A1", url: CV_LANDING_SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: c.stepsTitle,
      inLanguage,
      totalTime: "PT5M",
      estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
      step: c.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text, url: `${url}#step-${i + 1}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage,
      mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: c.breadcrumbHome, item: CV_LANDING_SITE },
        { "@type": "ListItem", position: 2, name: c.breadcrumb, item: url },
      ],
    },
  ];
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}


export function CvLandingPage({ lang }: { lang: CvLandingLang }) {
  const c = CV_LANDING[lang];
  const path = cvLandingPath(lang);
  const htmlLang = CV_LANDING_HREFLANG[lang];
  const ctaProps = { lang, path, ctaCreate: c.ctaCreate, ctaDownload: c.ctaDownload, ctaFill: c.ctaFill, hint: c.signedInHint };
  const h2 = "text-2xl font-bold tracking-tight text-neutral-900 sm:text-[28px] dark:text-neutral-50";
  const card = "rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950";
  const body = "text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400";

  return (
    <main lang={htmlLang} className="mx-auto max-w-5xl px-4 pt-6 sm:pt-10 pb-fab-safe">
      <style dangerouslySetInnerHTML={{ __html: CV_FX_CSS + CV_FX2_CSS }} />
      {jsonLd(lang).map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}

      <nav aria-label="breadcrumb" className="text-[13px] text-neutral-500 dark:text-neutral-400">
        <Link href="/" className="hover:text-accent">
          {c.breadcrumbHome}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{c.breadcrumb}</span>
      </nav>

      {/* Первый экран */}
      <section className="mt-4 grid items-center gap-10 overflow-x-clip py-2 md:grid-cols-[1.1fr_0.9fr] md:overflow-visible">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">{c.eyebrow}</div>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">{c.h1}</h1>
          <p className={`mt-4 ${body} sm:text-[17px]`}>{c.lead}</p>
          <div className="mt-6">
            <CvLandingCta {...ctaProps} />
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium text-neutral-700 dark:text-neutral-300">
            {c.badges.map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">
                  <Check />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-[380px]">
          {/* 28.10.2026: мягкое свечение под листом; в тёмной теме чуть заметнее (Александр: «аккуратненькая тенюха, не кричащая»). */}
          <div className="pointer-events-none absolute -inset-4 hidden rounded-[40px] md:block bg-[radial-gradient(60%_55%_at_50%_45%,rgba(51,94,247,0.22),transparent_72%)] blur-xl dark:bg-[radial-gradient(62%_58%_at_50%_52%,rgba(107,77,255,0.55),rgba(51,94,247,0.18)_45%,transparent_76%)] md:-inset-8" aria-hidden="true" />
          <CvTilt>
            <HeroCv lang={lang} alt={c.sampleAlt} />
          </CvTilt>
        </div>
      </section>

      {/* 3 шага */}
      <section className="mt-20">
        <CvWords className={h2} text={c.stepsTitle} />
        <div className="mt-6">
        <CvSteps>
        <ol className="relative grid gap-4 md:grid-cols-3">
          {c.steps.map((s, i) => (
            <li key={s.title} id={`step-${i + 1}`} className={`cvl-step relative ${card}`} style={{ ["--i" as string]: i }}>
              <div className="cvl-dot relative z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[15px] font-bold text-white">{i + 1}</div>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{s.title}</h3>
              <p className={`mt-2 ${body}`}>{s.text}</p>
            </li>
          ))}
        </ol>
        </CvSteps>
        </div>
      </section>

      {/* Что внутри */}
      <section className="mt-20">
        <CvWords className={h2} text={c.insideTitle} />
        <div className="mt-3 grid items-center gap-6 md:grid-cols-[1fr_1.1fr]">
          <p className={body}>{c.insideLead}</p>
          <QrScanDemo label={c.inside[0]?.title ?? ""} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.inside.map((f, i) => (
            <CvFeatureCard key={f.title} index={i} className={card}>
              <h3 className="mt-3 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{f.title}</h3>
              <p className={`mt-2 ${body}`}>{f.text}</p>
            </CvFeatureCard>
          ))}
        </div>
      </section>

      {/* Подтверждённая статистика */}
      <section className="relative mt-20 overflow-hidden rounded-[32px] bg-[linear-gradient(125deg,#335EF7_0%,#6A4BF5_55%,#A63DF2_100%)] p-7 text-white sm:p-10">
        <div className="relative">
        <CvWords className="text-2xl font-bold tracking-tight sm:text-[28px]" text={c.verifiedTitle} />
        {/* 28.10.2026: цифры как в примере CV Mr. Kit, отсчитываются при прокрутке. */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {(
            [
              [261, "contributions", "GitHub"],
              [12, "dribbbleWorks", ""],
              [1240, "soReputation", ""],
            ] as const
          ).map(([n, k, pre]) => (
            <div key={k} className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm sm:p-4">
              <CvCount to={n} className="block whitespace-nowrap text-[22px] font-extrabold leading-none sm:text-[36px]" />
              <span className="mt-1.5 block text-[12px] text-white/80 sm:text-[13px]">{pre ? `${pre} · ` : ""}{cvText(lang, k)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {c.verifiedText.map((p) => (
            <p key={p} className="text-[15px] leading-relaxed text-white/90">
              {p}
            </p>
          ))}
        </div>
        </div>
        {/* 28.10.2026 (Александр: «текст плохо читается»): клетки GitHub -- отдельной полосой под текстом, а не под ним. */}
        <GhCellsBg />
      </section>

      {/* Роли */}
      <section className="mt-20">
        <CvWords className={h2} text={c.rolesTitle} />
        <p className={`mt-3 max-w-3xl ${body}`}>{c.rolesLead}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {/* 28.10.2026: каждая роль ведёт на свою страницу «пример резюме» (lib/cv-roles). */}
          {CV_ROLES.map((r) => (
            <li key={r.slug}>
              <Link
                href={rolePath(lang, r.slug)}
                className="inline-block rounded-full bg-[#EEF1FE] px-3.5 py-1.5 text-[14px] font-medium text-[#2840B8] transition hover:bg-[#335EF7] hover:text-white dark:bg-[#1a2350] dark:text-[#b9c6ff] dark:hover:bg-[#335EF7] dark:hover:text-white"
              >
                {ROLE_TEXT[lang][r.slug].name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Честно бесплатно */}
      <section className="mt-20 grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <CvWords className={h2} text={c.freeTitle} />
          <p className={`mt-3 ${body}`}>{c.freeText}</p>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900">
                {c.compareHead.map((h, i) => (
                  <th key={i} scope="col" className={"px-4 py-3 font-semibold " + (i === 1 ? "text-accent" : "text-neutral-700 dark:text-neutral-300")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.compare.map(([row, us, them], i) => (
                <CvReveal key={row} delay={i * 0.12} className="border-t border-neutral-200 dark:border-neutral-800">
                  <th scope="row" className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">
                    {row}
                  </th>
                  <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="cvl-us inline-flex items-center gap-1.5">
                      <CvCheck />
                      {us}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    <span className="cvl-them">{them}</span>
                  </td>
                </CvReveal>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ATS и языки */}
      <section className="mt-20 grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{c.atsTitle}</h2>
          {c.atsText.map((p) => (
            <p key={p} className={`mt-3 ${body}`}>
              {p}
            </p>
          ))}
        </div>
        <div className={card}>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{c.langsTitle}</h2>
          {c.langsText.map((p) => (
            <p key={p} className={`mt-3 ${body}`}>
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* От резюме к работе */}
      <section className="mt-20 flex flex-col items-start justify-between gap-5 rounded-3xl bg-neutral-100 p-7 sm:flex-row sm:items-center sm:p-9 dark:bg-neutral-900">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">{c.jobsTitle}</h2>
          <p className={`mt-2 ${body}`}>{c.jobsText}</p>
        </div>
        <Link href="/" className="inline-flex h-12 shrink-0 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
          {c.jobsCta}
        </Link>
      </section>

      {/* FAQ: ответы в HTML сразу, <details> только сворачивает */}
      <section className="mt-20">
        <CvWords className={h2} text={c.faqTitle} />
        <div className="mt-6 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {c.faq.map((f, i) => (
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

      {/* Финал */}
      <section className="mt-20 rounded-[32px] bg-[linear-gradient(125deg,#335EF7_0%,#6A4BF5_55%,#A63DF2_100%)] p-8 text-white sm:p-12">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{c.finalTitle}</h2>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-white/90">{c.finalText}</p>
        <div className="mt-6">
          <CvLandingCta {...ctaProps} tone="dark" />
        </div>
      </section>

      {/* Другие языки страницы */}
      <nav className="mt-12 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-neutral-500 dark:text-neutral-400" aria-label="languages">
        {CV_LANDING_LANGS.map((l) =>
          l === lang ? (
            <span key={l} className="font-semibold text-neutral-800 dark:text-neutral-200">
              {LANG_NAME[l]}
            </span>
          ) : (
            <Link key={l} href={cvLandingPath(l)} hrefLang={CV_LANDING_HREFLANG[l]} className="hover:text-accent">
              {LANG_NAME[l]}
            </Link>
          ),
        )}
      </nav>
    </main>
  );
}

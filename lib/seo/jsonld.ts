// lib/seo/jsonld.ts
//
// JobPosting JSON-LD for /jobs/<slug> pages ONLY (PLAN.md §3.3). Never call
// this for a Talents post — a candidate is a person, not a job; emitting
// JobPosting there is a structured-data policy violation.

import type { WebPost } from "@/types/web-post";

const VALID_THROUGH_DAYS = 60;

/**
 * `published + 60 days` — PLAN.md §3.4's policy pending an answer to
 * OPEN QUESTIONS #7 ("is there any concept of a vacancy closing?").
 */
export function jobPostingValidThrough(post: WebPost): Date {
  return new Date(post.publishedAt.getTime() + VALID_THROUGH_DAYS * 24 * 60 * 60 * 1000);
}

export function isJobPostingExpired(post: WebPost): boolean {
  return jobPostingValidThrough(post).getTime() < Date.now();
}

/** post.title, stripped of decorative emoji per §3.3 ("no emoji"). Good
 *  enough for v1.0 — a fully correct emoji-strip regex (flags, ZWJ
 *  sequences) is a rabbit hole; revisit if titles still slip through. */
function cleanTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildJobPostingJsonLd(post: WebPost): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: cleanTitle(post.title),
    description: post.contentHtml,
    datePosted: post.publishedAt.toISOString(),
    validThrough: jobPostingValidThrough(post).toISOString(),
    identifier: {
      "@type": "PropertyValue",
      name: "A1",
      value: post.id,
    },
    // A1 authors are individual users, not verified companies (PLAN.md
    // §3.3 "hiringOrganization" row flags this as acceptable-but-open). No
    // `sameAs` — we don't have a confirmed public profile URL scheme to
    // point it at, and a guessed one that 404s is worse than omitting it.
    hiringOrganization: {
      "@type": "Organization",
      name: post.author.name,
    },
    // We don't have a web application flow (PLAN.md §3.3 "directApply" row).
    directApply: false,
  };

  if (post.location) {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: post.location.city,
        addressRegion: post.location.region,
        addressCountry: post.location.country,
      },
    };
  }

  if (post.isRemote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
    // Google requires >=1 Country in applicantLocationRequirements whenever
    // jobLocationType is TELECOMMUTE. NULL_LOCATION_MEANS_REMOTE (see
    // lib/a1/config.ts) means we reach this branch with zero real country
    // data — post.location is always null here. Fabricating a country (or
    // a fake "Worldwide" placeholder, which isn't a valid schema.org
    // Country anyway) would be worse than omitting the field: Google may
    // warn this recommended field is missing, which is honest. Revisit
    // once OPEN QUESTIONS "Is location === null the same as remote?" has a
    // real answer.
  }

  if (post.salary) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: post.salary.currency.toUpperCase(),
      value: {
        "@type": "QuantitativeValue",
        ...(post.salary.min != null ? { minValue: post.salary.min } : {}),
        ...(post.salary.max != null ? { maxValue: post.salary.max } : {}),
        unitText: post.salary.period,
      },
    };
  }

  // employmentType omitted: needs a tag/category -> enum mapping table
  // that doesn't exist yet (PLAN.md OPEN QUESTIONS #4).

  return jsonLd;
}

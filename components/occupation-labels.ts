// components/occupation-labels.ts
//
// Split out of app/u/[username]/page.tsx (2026-08-29) so the onboarding
// "Я..." step (PLAN.md §6.15, app/onboarding/profile/profile-setup-
// form.tsx — a client component) can import just this label table
// without pulling that page's server-only data-fetching imports
// (lib/a1/users, lib/a1/datasets) into the client bundle — the same
// class of build failure lib/a1/session-constants.ts's own file header
// already documents, for exactly this reason.
import type { Locale } from "./t";

// "Professional" here, deliberately not "Specialist" — same Ukrainian/
// Russian source words as the post-type badge on /u/[username]
// ("Фахівець" / "Специалист"), but this is the OCCUPATION enum value
// ("employed professional", as opposed to freelancer/entrepreneur) and
// the other is a completely different thing (a talent-post badge) —
// translating both to "Specialist" in English etc. would make them read
// as the same concept when they aren't.
export const OCCUPATION_LABELS: Record<string, Record<Locale, string>> = {
  entrepreneur: {
    uk: "Підприємець", en: "Entrepreneur", ru: "Предприниматель", de: "Unternehmer",
    es: "Emprendedor", fr: "Entrepreneur", pl: "Przedsiębiorca", ptBR: "Empreendedor", zh: "创业者",
  },
  professional: {
    uk: "Спеціаліст", en: "Professional", ru: "Специалист", de: "Fachkraft",
    es: "Profesional", fr: "Professionnel", pl: "Specjalista", ptBR: "Profissional", zh: "专业人士",
  },
  freelancer: {
    uk: "Фрілансер", en: "Freelancer", ru: "Фрилансер", de: "Freelancer",
    es: "Freelancer", fr: "Freelance", pl: "Freelancer", ptBR: "Freelancer", zh: "自由职业者",
  },
};

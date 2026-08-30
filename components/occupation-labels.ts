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

// 2026-08-30 CORRECTION (Aleksandr, live-testing feedback, screenshots of
// the real app): "Діяльність пофіксі неймінг, сделай такой же как в
// апке, надо: Бізнесмен, Фахівець, Фрілансер" — the uk wording below
// used to read "Підприємець"/"Спеціаліст" on the deliberate theory (see
// the superseded comment this replaced) that "Фахівець" was already
// spoken for by the post-type badge on /u/[username] and reusing it here
// would blur two different concepts. That theory was wrong: the real app
// DOES use "Фахівець" for this occupation value, confirmed directly by
// Aleksandr against the app itself, not inferred — corrected to match.
// Only uk changed; the other eight locales were never flagged and are
// left as they were (best-effort translations of the old uk wording, not
// independently confirmed against the app's own localization for those
// languages).
export const OCCUPATION_LABELS: Record<string, Record<Locale, string>> = {
  entrepreneur: {
    uk: "Бізнесмен", en: "Entrepreneur", ru: "Предприниматель", de: "Unternehmer",
    es: "Emprendedor", fr: "Entrepreneur", pl: "Przedsiębiorca", ptBR: "Empreendedor", zh: "创业者",
  },
  professional: {
    uk: "Фахівець", en: "Professional", ru: "Специалист", de: "Fachkraft",
    es: "Profesional", fr: "Professionnel", pl: "Specjalista", ptBR: "Profissional", zh: "专业人士",
  },
  freelancer: {
    uk: "Фрілансер", en: "Freelancer", ru: "Фрилансер", de: "Freelancer",
    es: "Freelancer", fr: "Freelance", pl: "Freelancer", ptBR: "Freelancer", zh: "自由职业者",
  },
};

// components/t.tsx
//
// Aleksandr, 2026-08-27: "дефолтный язык - укр. + добавить локализации на
// наши языки" — default UI language is Ukrainian, with Russian (what the
// whole site was written in until now) available as a switch. Scope: the
// site's own static chrome copy — nav, page headers, filter labels,
// empty/error states, badges. NOT user-generated content (post text,
// profile bios, category/tag names) — that comes from the backend/authors
// in whatever language they wrote it in, translating that is a separate,
// much bigger problem this doesn't attempt.
//
// Renders BOTH strings server-side and lets CSS (the `lang-ru:` variant
// in app/globals.css) decide which one is visible — exactly the trick
// already used for the two logo SVGs in site-nav.tsx (dark:hidden /
// hidden dark:block). Zero client JS needed per-string, works inside
// server components, and — importantly — doesn't touch cookies()/
// headers() anywhere, so the ISR'd feed pages (app/page.tsx,
// app/talents/page.tsx) keep revalidating on their normal schedule
// instead of being forced into per-request dynamic rendering.
export function T({ uk, ru }: { uk: string; ru: string }) {
  return (
    <>
      <span className="lang-ru:hidden">{uk}</span>
      <span className="hidden lang-ru:inline">{ru}</span>
    </>
  );
}

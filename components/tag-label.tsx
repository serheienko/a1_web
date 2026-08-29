// components/tag-label.tsx
//
// Aleksandr, 2026-08-29: "тег и не локализованы" — the feed card and
// both detail pages render post.tags raw (English "remote",
// "part-time", "exp-3-yr", ...) regardless of the site's own UK/EN/RU/...
// language switch. components/label-translations.ts already has exactly
// the lookup this needs (translateTagLabel) — built for
// components/filters-form.tsx's own checkboxes and components/
// post-editor.tsx's tag pills, see that file's own comment for why this
// is a small fixed platform-facet vocabulary worth translating client-
// side rather than the open-ended "translate arbitrary backend content"
// problem components/t.tsx explicitly stays out of. It just never got
// wired into the READ side (feed card, job/talent detail pages) until
// now.
//
// Same zero-client-JS trick as components/t.tsx's own <T/>: render every
// locale's translation as its own span and let CSS (the `lang-XX:`
// variants in app/globals.css) decide which one is visible. Keeps this
// usable from server components (post-card.tsx, the detail pages) without
// forcing them into per-request dynamic rendering to read a language
// cookie. A tag not in the lookup falls back to its own raw text in
// every span — same as translateTagLabel's own no-match behavior — so an
// unrecognized/free-form tag (a custom skill someone typed, "iOS",
// "Firebase", ...) still renders exactly once, just untranslated.
import { LOCALES, LOCALE_VISIBILITY_CLASS } from "@/components/t";
import { translateTagLabel } from "@/components/label-translations";

export function TagLabel({ text }: { text: string }) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {translateTagLabel(text, locale)}
        </span>
      ))}
    </>
  );
}

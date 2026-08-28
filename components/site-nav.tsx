// components/site-nav.tsx
//
// Facebook-style top bar (Aleksandr, 2026-08-26: likes FB/Instagram's
// desktop chrome, wants our 2 sections as centered pill tabs in a top bar
// rather than a left sidebar — reverting the earlier sidebar experiment).
//
// 2026-08-28: "давай перенесём поиск в шапку на десктопе, мобильная
// версия пусть остаётся как есть" — components/filters-form.tsx portals
// its desktop search box + filter button into #nav-search-slot below
// (see that file's own comment for why a portal, not a prop, carries the
// actual search UI here — this component has no access to a page's
// categories/tags/URL filter state, and doesn't need it).
//
// Adding that slot broke the old 3-column CSS grid this bar used for
// keeping the tabs pill centered (grid-cols-[1fr_auto_1fr] balances two
// EQUAL-content side columns; a logo+search-box left side is nothing
// like the width of a lone settings button on the right, so the tabs
// would drift off-center). Switched to a flex row with the tabs pill
// absolutely centered over the whole bar instead — that keeps it dead
// center regardless of how wide the search box grows or shrinks,
// independent of the side columns' own widths.
//
// 2026-08-28: dropped the hard `border-b` and added <ProgressiveBlur>
// below — see that component's own comment. The border read as a flat
// cutoff line where content just stopped; the fog gradient now does
// that job itself, so a second, sharper edge on top of it looked
// redundant/busy instead of crisp.
//
// 2026-08-28: the logo Link + its two static <img>s moved into their
// own components/logo-play.tsx — same resting appearance, now with a
// one-shot Lottie play effect on click. See that file's own comment.
//
// 2026-08-28: added `isolate` here after Aleksandr reported the fog
// under this bar reading as a hard cut on his phone rather than a
// gradual blur — the real bug turned out to be in progressive-blur.tsx
// itself (see that file's own comment), but an explicit stacking
// context on the sticky bar is cheap, safe insurance against this
// nav ever getting mis-ordered against scrolled content mid-scroll.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoPlay } from "@/components/logo-play";
import { ProgressiveBlur } from "@/components/progressive-blur";
import { SettingsMenu } from "@/components/settings-menu";
import { T } from "@/components/t";

const NAV_ITEMS = [
  {
    href: "/",
    uk: "Вакансії",
    en: "Jobs",
    ru: "Вакансии",
    de: "Stellenangebote",
    es: "Vacantes",
    fr: "Offres d'emploi",
    pl: "Oferty pracy",
    ptBR: "Vagas",
    zh: "职位",
  },
  {
    href: "/talents",
    uk: "Фахівці",
    en: "Talents",
    ru: "Специалисты",
    de: "Fachkräfte",
    es: "Especialistas",
    fr: "Spécialistes",
    pl: "Specjaliści",
    ptBR: "Especialistas",
    zh: "人才",
  },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-40 isolate bg-app/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl [will-change:transform] dark:bg-black/80"
      style={{ transform: "translateZ(0)" }}
    >
      <ProgressiveBlur />
      <div className="relative flex items-center gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <LogoPlay />

          {/* Desktop-only search box lives in components/filters-form.tsx and
              portals its markup in here — empty (zero-height/width) on pages
              that never mount a <Filters>/<FiltersForm> (e.g. a profile
              page), and hidden below `sm` either way since the portaled
              content itself carries `sm:flex`/mobile-hide classes too
              (belt and suspenders — this wrapper hides it even before that
              content exists). */}
          <div id="nav-search-slot" className="hidden min-w-0 flex-1 sm:flex sm:max-w-xs" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white p-1 dark:bg-neutral-900">
            {NAV_ITEMS.map((item) => {
              const { href, ...labels } = item;
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    "rounded-full px-4 py-2 text-sm font-medium transition sm:px-6 " +
                    (active
                      ? "bg-accent/15 text-accent"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
                  }
                >
                  {/* Destructured above so T only ever receives the 9
                      locale keys it declares — spreading `item` directly
                      would also hand it `href`, which isn't part of its
                      prop type. */}
                  <T {...labels} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          <SettingsMenu />
        </div>
      </div>
    </nav>
  );
}

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
// 2026-08-28: tried moving the logo into components/logo-play.tsx for a
// one-shot Lottie "play" effect on click. Reverted the same day: the
// animation's crop/scale came out wrong in a way that only showed up
// live (the mark visibly shrank and flashed before the real animation
// kicked in) — this environment has no way to render or preview a
// Lottie file to fix that blind, and Aleksandr asked to just revert
// rather than keep guessing at the numbers. Back to the plain static
// logo; components/logo-play.tsx and the two recolored animation JSONs
// under public/brand/ are unused now (left in place in case this gets
// revisited with an actual way to preview it).
//
// 2026-08-28: added `isolate` here after Aleksandr reported the fog
// under this bar reading as a hard cut on his phone rather than a
// gradual blur — the real bug turned out to be in progressive-blur.tsx
// itself (see that file's own comment), but an explicit stacking
// context on the sticky bar is cheap, safe insurance against this
// nav ever getting mis-ordered against scrolled content mid-scroll.
//
// 2026-08-28: added <AccountMenu/> (Stage 2 / Phase 5a, PLAN.md §6.6) —
// "signed in as X" or a Sign in link, next to <SettingsMenu>. See that
// component's own comment for why it reads a plain cookie client-side
// instead of anything server-derived (keeps this nav, and therefore
// every page it sits on top of, out of dynamic rendering).
//
// 2026-08-29: replaced <AccountMenu/> + <SettingsMenu/> with a single
// <AvatarMenu/> (Aleksandr: "вместо кнопок выйти и тд, сделаем
// модалку") — when signed in, one avatar button opens a panel with
// email, theme, language, and sign-out; when signed out, AvatarMenu
// renders the same sign-in link + <SettingsMenu/> pair this nav always
// had. See components/avatar-menu.tsx's own comment for the full
// rationale and the known avatar-photo gap.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarMenu } from "@/components/avatar-menu";
import { ProgressiveBlur } from "@/components/progressive-blur";
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
          <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
            {/* Two exact logo marks exported from Figma (light = brand blue
                #335EF7, dark = white) rather than recoloring one asset with
                CSS filters. */}
            <img src="/brand/a1-logo-blue.svg" alt="A1" className="h-7 w-auto dark:hidden" />
            <img src="/brand/a1-logo-white.svg" alt="A1" className="hidden h-7 w-auto dark:block" />
          </Link>

          {/* Desktop-only search box lives in components/filters-form.tsx and
              portals its markup in here — empty (zero-height/width) on pages
              that never mount a <Filters>/<FiltersForm> (e.g. a profile
              page), and hidden below `sm` either way since the portaled
              content itself carries `sm:flex`/mobile-hide classes too
              (belt and suspenders — this wrapper hides it even before that
              content exists).

              2026-08-29: "уменьши поиск на десктопе по ширине на 40%" —
              cap was `sm:max-w-xs` (20rem/320px); 320px * 0.6 = 192px,
              i.e. `sm:max-w-[12rem]`. `flex-1` still lets it shrink
              further on a narrow viewport; this only lowers the ceiling
              on wide desktop screens. */}
          <div id="nav-search-slot" className="hidden min-w-0 flex-1 sm:flex sm:max-w-[12rem]" />
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
          <AvatarMenu />
        </div>
      </div>
    </nav>
  );
}

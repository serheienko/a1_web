// components/site-nav.tsx
//
// Facebook-style top bar (Aleksandr, 2026-08-26: likes FB/Instagram's
// desktop chrome, wants our 2 sections as centered pill tabs in a top bar
// rather than a left sidebar — reverting the earlier sidebar experiment).
// Three-column grid so the tabs stay visually centered on the page
// regardless of the logo/toggle's width, same trick FB uses for its own
// centered icon row.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/lang-toggle";
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
      className="sticky top-0 z-40 border-b border-neutral-200 bg-app/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl [will-change:transform] dark:border-neutral-800 dark:bg-black/80"
      style={{ transform: "translateZ(0)" }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
        <Link href="/" className="justify-self-start shrink-0 transition-opacity hover:opacity-80">
          {/* Two exact logo marks exported from Figma (light = brand blue #335EF7,
              dark = white) rather than recoloring one asset with CSS filters. */}
          <img src="/brand/a1-logo-blue.svg" alt="A1" className="h-7 w-auto dark:hidden" />
          <img src="/brand/a1-logo-white.svg" alt="A1" className="hidden h-7 w-auto dark:block" />
        </Link>

        <div className="col-start-2 flex items-center gap-1 justify-self-center rounded-full bg-white p-1 dark:bg-neutral-900">
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

        <div className="flex items-center gap-1 justify-self-end">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

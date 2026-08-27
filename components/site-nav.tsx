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
  { href: "/", uk: "Вакансії", ru: "Вакансии" },
  { href: "/talents", uk: "Фахівці", ru: "Специалисты" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-neutral-200 bg-app/80 backdrop-blur dark:border-neutral-800 dark:bg-black/80">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
        <Link href="/" className="justify-self-start shrink-0 transition-opacity hover:opacity-80">
          {/* Two exact logo marks exported from Figma (light = brand blue #335EF7,
              dark = white) rather than recoloring one asset with CSS filters. */}
          <img src="/brand/a1-logo-blue.svg" alt="A1" className="h-7 w-auto dark:hidden" />
          <img src="/brand/a1-logo-white.svg" alt="A1" className="hidden h-7 w-auto dark:block" />
        </Link>

        <div className="col-start-2 flex items-center gap-1 justify-self-center rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "rounded-full px-4 py-2 text-sm font-medium transition sm:px-6 " +
                  (active
                    ? "bg-accent/15 text-accent"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
                }
              >
                <T uk={item.uk} ru={item.ru} />
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

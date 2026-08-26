// components/site-nav.tsx
//
// One nav component, two layouts via responsive classes rather than two
// components: a horizontal top bar below the md breakpoint (unchanged
// mobile behavior), and a fixed left sidebar + centered content column from
// md up — the Instagram-web-style structure Aleksandr asked for on
// 2026-08-26 ("сайдбар + центр-колонка"), replacing the old plain top nav.
// app/layout.tsx's `md:pl-64` on the content wrapper is what makes room for
// the fixed sidebar at md+; this component owns the matching `md:w-64`.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Вакансии" },
  { href: "/talents", label: "Специалисты" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800 md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:border-b-0">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-4 md:mx-0 md:h-full md:max-w-none md:flex-col md:items-stretch md:gap-1 md:px-3 md:py-6">
        <Link
          href="/"
          className="font-display text-base font-bold text-neutral-900 dark:text-neutral-50 md:px-3 md:pb-4 md:text-2xl"
        >
          A1
        </Link>

        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "text-sm transition md:rounded-lg md:px-3 md:py-2 md:text-base md:font-medium " +
                (active
                  ? "text-accent md:bg-accent/10"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 md:hover:bg-neutral-100 md:dark:hover:bg-neutral-900")
              }
            >
              {item.label}
            </Link>
          );
        })}

        <div className="ml-auto md:ml-0 md:mt-auto">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

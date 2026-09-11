// components/admin-nav.tsx
//
// 2026-09-11: there are three admin surfaces now (/admin/posts,
// /admin/applications, /admin/companies) and none of them is linked
// from anywhere public — site-nav.tsx deliberately doesn't know they
// exist, and app/robots.ts disallows /admin/ outright. This is the one
// row of links between them, so getting from one to another doesn't
// mean retyping a URL.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { useEffect, useState } from "react";

const TABS: { href: string; label: Record<Locale, string> }[] = [
  {
    href: "/admin/posts",
    label: { uk: "Дописи", en: "Posts", ru: "Публикации", de: "Beiträge", es: "Publicaciones", fr: "Publications", pl: "Posty", ptBR: "Publicações", zh: "帖子" },
  },
  {
    href: "/admin/applications",
    label: { uk: "Відгуки", en: "Applications", ru: "Отклики", de: "Bewerbungen", es: "Candidaturas", fr: "Candidatures", pl: "Aplikacje", ptBR: "Candidaturas", zh: "申请" },
  },
  {
    href: "/admin/companies",
    label: { uk: "Компанії", en: "Companies", ru: "Компании", de: "Unternehmen", es: "Empresas", fr: "Entreprises", pl: "Firmy", ptBR: "Empresas", zh: "公司" },
  },
];

export function useAdminLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

export function AdminNav({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  return (
    <nav className="mb-4 flex gap-1.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "rounded-full px-3 py-1 text-xs font-medium transition " +
              (active
                ? "bg-accent/10 text-accent"
                : "border border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-50")
            }
          >
            {tab.label[lang]}
          </Link>
        );
      })}
    </nav>
  );
}

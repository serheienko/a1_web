"use client";

// components/selected-roles.tsx
//
// 25.10.2026 (Александр: «выбранную роль хотя бы показывать чипом сверху,
// чтобы было понятно, что ты в фильтрах наклацал, например, DevOps»). Ряд
// над лентой: подпись «Роль» и выбранные профессии синими чипами с
// крестиком. Крестик снимает роль, не трогая остальные фильтры. Появление и
// уход -- плавные (opacity + сдвиг), как у остальных чипов.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/components/t";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import type { JobRole } from "@/lib/seo/job-role";

export function SelectedRoles({ basePath, roles }: { basePath: string; roles: JobRole[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function remove(slug: string) {
    setLeaving(slug);
    const params = new URLSearchParams(window.location.search);
    const rest = params.getAll("role").filter((r) => r !== slug);
    params.delete("role");
    params.delete("page");
    for (const r of rest) params.append("role", r);
    const qs = params.toString();
    setTimeout(() => {
      startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
    }, 160);
  }

  if (roles.length === 0) return null;
  return (
    <div
      className={
        "mb-3 flex flex-wrap items-center gap-2 transition duration-300 ease-out " +
        (shown ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
      }
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <T uk="Роль" en="Role" ru="Роль" de="Rolle" es="Rol" fr="Rôle" pl="Rola" ptBR="Função" zh="职位类型" />
      </span>
      {roles.map((slug) => (
        <span
          key={slug}
          className={
            "inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-1 pl-3 pr-1 text-[13px] font-medium text-accent transition duration-150 " +
            (leaving === slug ? "scale-90 opacity-0" : "scale-100 opacity-100")
          }
        >
          <T {...ROLE_LABELS[slug]} />
          <button
            type="button"
            onClick={() => remove(slug)}
            aria-label="×"
            className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-accent/15 active:scale-90"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}

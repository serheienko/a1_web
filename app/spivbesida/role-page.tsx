// app/spivbesida/role-page.tsx -- общий макет страниц «Кандидату» и
// «Інтерв'юеру» (24.10.2026). Шапка с переключателем ролей и местом под
// иллюстрацию, дальше блоки из kit.tsx в своём порядке для каждой роли.

import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { PAGE, ROLE_PATH, UI, type Role } from "@/lib/interview-kit/content";
import { MrKitProfile } from "@/lib/interview-kit/mr-kit";
import { Antifraud, Checklist, FromA1, IllustrationSlot, KitStyles, ProfileInsteadOfCv, RoleSwitch, Templates, Tools } from "./kit";

const SITE_URL = "https://jobs.a1appp.com";

const META: Record<Role, { title: string; description: string; crumb: string }> = {
  candidate: {
    title: "Чек-лист підготовки до співбесіди в IT і корисні сервіси | A1 Jobs",
    description:
      "Що зробити до, під час і після співбесіди: інтерактивний чек-лист, який можна відмічати й скопіювати, плюс сервіси для тренування, задач на алгоритми й резюме.",
    crumb: "Співбесіда: кандидату",
  },
  interviewer: {
    title: "Як провести чесну співбесіду: чек-лист, готові тексти й захист від AI-підказок | A1 Jobs",
    description:
      "Чек-лист інтерв'юера, готові тексти для запрошення й чату, прийоми, щоб помітити AI-підказки, і сервіси для запису, live coding і схем.",
    crumb: "Співбесіда: інтерв'юеру",
  },
};

export function roleMetadata(role: Role): Metadata {
  const m = META[role];
  const url = `${SITE_URL}${ROLE_PATH[role]}`;
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: m.title, description: m.description },
  };
}

export function RolePage({ role }: { role: Role }) {
  const crumbs = buildLandingBreadcrumbJsonLd(META[role].crumb, `${SITE_URL}${ROLE_PATH[role]}`);
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:pt-12 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <KitStyles />

      <header className="grid items-center gap-6 md:grid-cols-[1.15fr_1fr] md:gap-10">
        <div>
          <Link href="/spivbesida" className="text-[11px] font-medium uppercase tracking-wide text-accent hover:underline">
            <T {...UI.kicker} />
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
            <T {...PAGE[role].h1} />
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            <T {...PAGE[role].sub} />
          </p>
          <div className="mt-5">
            <RoleSwitch role={role} />
          </div>
        </div>
        <IllustrationSlot className="max-md:aspect-[16/9]" />
      </header>

      <div className="mt-8">
        <Checklist role={role} />
      </div>

      {/* 24.10.2026: кандидату -- тезис «профиль A1 вместо резюме» сразу под чек-листом. */}
      {role === "candidate" ? <ProfileInsteadOfCv example={<MrKitProfile />} /> : null}

      {role === "interviewer" ? (
        <>
          <Templates />
          <Antifraud />
        </>
      ) : null}

      <Tools role={role} />

      {role === "candidate" ? <FromA1 /> : null}
    </main>
  );
}

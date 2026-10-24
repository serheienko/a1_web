// app/spivbesida/page.tsx -- вход в раздел «Співбесіда» (24.10.2026,
// Александр: «две разные страницы, для соискателей и для интервьюеров»).
// Здесь две большие карточки-двери и под ними широкий баннер «Профіль A1
// замість резюме» (24.10.2026: рекомендация для обеих сторон, с примером Mr Kit).

import type { Metadata } from "next";
import { T } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { HUB, UI } from "@/lib/interview-kit/content";
import { MrKitProfile } from "@/lib/interview-kit/mr-kit";
import { HubCards, KitStyles, ProfileInsteadOfCv } from "./kit";

const URL = "https://jobs.a1appp.com/spivbesida";
const TITLE = "Співбесіда в IT: чек-листи й інструменти для кандидатів і інтерв'юерів | A1 Jobs";
const DESCRIPTION =
  "Підготовка до співбесіди й чесне проведення співбесіди: інтерактивні чек-листи, готові тексти, прийоми проти AI-підказок і перевірені сервіси.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  const crumbs = buildLandingBreadcrumbJsonLd("Співбесіда", URL);
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:pt-12 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <KitStyles />
      {/* 24.10.2026: без иллюстрации (Александр): на входе только две двери. */}
      <header>
        <div className="text-[11px] font-medium uppercase tracking-wide text-accent">
          <T {...UI.kicker} />
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...HUB.h1} />
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <T {...HUB.sub} />
        </p>
      </header>
      <div className="mt-8">
        <HubCards />
      </div>
      <ProfileInsteadOfCv variant="hub" tone="light" className="mt-4" example={<MrKitProfile />} />
    </main>
  );
}

// components/landing-insights.tsx
//
// 29.10.2026 (идея Разведчика, Александр: «давай»). Срез по вакансиям посадочной: кто нанимает, что
// просят, формат и уровень. Цифры из lib/seo/landing-insights.ts -- из тех же вакансий, что в списке
// ниже, без ИИ. Названия компаний и технологий не переводятся и стоят в разметке ОДИН раз;
// на девять языков уходят только подписи (<T/>), чтобы не раздувать страницу.
import Link from "next/link";
import { T } from "@/components/t";
import type { LandingInsights } from "@/lib/seo/landing-insights";
import { LEVEL_WORDS } from "@/lib/seo/level-words";

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="text-[12px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{title}</div>
      <div className="mt-2 flex flex-col gap-1 text-[15px] text-neutral-800 dark:text-neutral-200">{children}</div>
    </div>
  );
}

export function LandingInsightsBlock({ data }: { data: LandingInsights }) {
  return (
    <section className="mb-8 flex flex-col gap-3 sm:flex-row">
      {data.companies.length > 0 ? (
        <Card title={<T uk="Хто наймає" en="Who is hiring" ru="Кто нанимает" de="Wer stellt ein" es="Quién contrata" fr="Qui recrute" pl="Kto zatrudnia" ptBR="Quem contrata" zh="谁在招聘" />}>
          {data.companies.map((c) => (
            <div key={c.name} className="flex items-baseline justify-between gap-3">
              {c.href ? (
                <Link href={c.href} className="truncate no-underline hover:text-accent">{c.name}</Link>
              ) : (
                <span className="truncate">{c.name}</span>
              )}
              <span className="shrink-0 text-neutral-400 tabular-nums dark:text-neutral-500">{c.count}</span>
            </div>
          ))}
        </Card>
      ) : null}

      {data.skills.length > 0 ? (
        <Card title={<T uk="Що просять найчастіше" en="Most requested skills" ru="Что просят чаще всего" de="Gefragteste Skills" es="Habilidades más pedidas" fr="Compétences les plus demandées" pl="Najczęściej wymagane" ptBR="Habilidades mais pedidas" zh="最常要求的技能" />}>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s) =>
              s.href ? (
                <Link key={s.tech} href={s.href} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[13px] no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800">
                  {s.tech}
                </Link>
              ) : (
                <span key={s.tech} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[13px] dark:bg-neutral-800">{s.tech}</span>
              ),
            )}
          </div>
        </Card>
      ) : null}

      <Card title={<T uk="Формат і рівень" en="Format and level" ru="Формат и уровень" de="Format und Level" es="Formato y nivel" fr="Format et niveau" pl="Format i poziom" ptBR="Formato e nível" zh="形式与级别" />}>
        <div className="flex items-baseline justify-between gap-3">
          <span><T uk="Віддалено" en="Remote" ru="Удалённо" de="Remote" es="Remoto" fr="À distance" pl="Zdalnie" ptBR="Remoto" zh="远程" /></span>
          <span className="shrink-0 text-neutral-400 tabular-nums dark:text-neutral-500">{data.remotePercent}%</span>
        </div>
        {data.levels.map((l) => (
          <div key={l.level} className="flex items-baseline justify-between gap-3">
            <span><T {...LEVEL_WORDS[l.level]} /></span>
            <span className="shrink-0 text-neutral-400 tabular-nums dark:text-neutral-500">{l.count}</span>
          </div>
        ))}
      </Card>
    </section>
  );
}

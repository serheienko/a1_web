// components/hiring-ukraine-page.tsx
//
// 15.10.2026: «Хто наймає в IT в Україні: <місяць>» (app/jobs/hiring/ukraine/[month]/page.tsx).
// Данные -- lib/seo/hiring-ukraine.ts. Тексты: украинский главный, плюс en/ru; остальные языки
// показывают английский (страница про украинский рынок).

import Link from "next/link";
import { T, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import { fill, num } from "@/components/hiring-page";
import { cityLabel } from "@/lib/seo/segments";
import type { HiringUkraine } from "@/lib/seo/hiring-ukraine";
import type { WebPost } from "@/types/web-post";

type L = Record<Locale, string>;

/** uk / en / ru; de, es, fr, pl, ptBR, zh -- английский. */
function l3(uk: string, en: string, ru: string): L {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en };
}

export const UA_TXT = {
  h1: l3("Хто наймає в IT в Україні: {month}", "Who's hiring in tech in Ukraine: {month}", "Кто нанимает в IT в Украине: {month}"),
  crumb: l3("Хто наймає", "Who's hiring", "Кто нанимает"),
  crumbUa: l3("Україна", "Ukraine", "Украина"),
  lead: l3(
    "За {month} IT-фахівців в Україні шукали {c} роботодавців, разом {n} вакансій. {ad}% з них відкрили військові частини та оборонні компанії.",
    "In {month}, {c} employers in Ukraine posted {n} tech jobs. {ad}% of them came from military units and defense companies.",
    "За {month} IT-специалистов в Украине искали {c} работодателей, всего {n} вакансий. {ad}% из них открыли воинские части и оборонные компании.",
  ),
  live: l3("Місяць ще триває, цифри оновлюються щогодини.", "The month is still running, numbers update hourly.", "Месяц ещё идёт, цифры обновляются каждый час."),
  kJobs: l3("вакансій", "jobs", "вакансий"),
  kEmployers: l3("роботодавців", "employers", "работодателей"),
  kArmyDefense: l3("армія та оборонка", "army and defense", "армия и оборонка"),
  kReservation: l3("з бронюванням", "with deferment", "с бронированием"),
  kSalary: l3("із зарплатою", "list a salary", "с зарплатой"),
  kFirstJob: l3("без досвіду", "no experience needed", "без опыта"),
  armyH: l3("Армія та оборонні компанії", "Army and defense companies", "Армия и оборонные компании"),
  armyP: l3(
    "Військові частини: {a} вакансій від {u} підрозділів. Оборонні компанії: {d} вакансій від {dc} компаній. Армія вказує зарплату у {sa}% вакансій, цивільні роботодавці у {sc}%.",
    "Military units: {a} jobs from {u} units. Defense companies: {d} jobs from {dc} companies. The army lists a salary in {sa}% of its jobs, civilian employers in {sc}%.",
    "Воинские части: {a} вакансий от {u} подразделений. Оборонные компании: {d} вакансий от {dc} компаний. Армия указывает зарплату в {sa}% вакансий, гражданские работодатели в {sc}%.",
  ),
  reservationP: l3(
    "Бронювання прямо обіцяють у {r}% вакансій ({rn}).",
    "{r}% of jobs ({rn}) explicitly offer military deferment.",
    "Бронирование прямо обещают в {r}% вакансий ({rn}).",
  ),
  top: l3("Хто наймав найбільше", "Top hiring employers", "Кто нанимал больше всех"),
  sideArmy: l3("армія", "army", "армия"),
  sideDefense: l3("оборонка", "defense", "оборонка"),
  jobsN: l3("{n} вак.", "{n} jobs", "{n} вак."),
  cities: l3("Міста", "Cities", "Города"),
  levels: l3("Рівні в назві вакансії", "Seniority in the job title", "Уровни в названии вакансии"),
  levelsNote: l3("Рівень указано в назві у {p}% вакансій.", "{p}% of titles state a level.", "Уровень указан в названии у {p}% вакансий."),
  english: l3("Англійська", "English", "Английский"),
  englishNote: l3(
    "Рівень англійської прямо вказують у {p}% вакансій. Серед них:",
    "{p}% of jobs state an English level. Among them:",
    "Уровень английского прямо указывают в {p}% вакансий. Среди них:",
  ),
  englishLow: l3("A1–A2", "A1–A2", "A1–A2"),
  experience: l3("Досвід", "Experience", "Опыт"),
  experienceP: l3(
    "Медіана вимог до досвіду: {m}. Вимогу в роках пишуть у {p}% вакансій. Без досвіду готові взяти у {f}% ({fn}).",
    "Median required experience: {m}. {p}% of jobs state years of experience. {f}% ({fn}) are open to people with no experience.",
    "Медиана требований к опыту: {m}. Требование в годах пишут в {p}% вакансий. Без опыта готовы взять в {f}% ({fn}).",
  ),
  stacks: l3("Технології місяця", "Technologies of the month", "Технологии месяца"),
  latest: l3("Свіжі вакансії в Україні", "Latest jobs in Ukraine", "Свежие вакансии в Украине"),
  allUa: l3("Усі вакансії в Україні →", "All jobs in Ukraine →", "Все вакансии в Украине →"),
  months: l3("Інші місяці", "Other months", "Другие месяцы"),
  world: l3("Хто наймає у світі за {month} →", "Who's hiring worldwide in {month} →", "Кто нанимает в мире за {month} →"),
  how: l3(
    "Як рахуємо: усі IT-вакансії за місяць із місцем роботи в Україні, плюс вакансії військових частин. Бронювання, англійську, досвід і зарплату рахуємо лише тоді, коли їх прямо написано у вакансії. Оборонні компанії визначаємо за назвою роботодавця. Цитуйте з посиланням на A1 Jobs.",
    "How we count: all tech jobs of the month located in Ukraine, plus jobs from military units. Deferment, English, experience and salary count only when the job states them explicitly. Defense companies are identified by employer name. Feel free to cite with a link to A1 Jobs.",
    "Как считаем: все IT-вакансии за месяц с местом работы в Украине, плюс вакансии воинских частей. Бронирование, английский, опыт и зарплату считаем, только если они прямо написаны в вакансии. Оборонные компании определяем по названию работодателя. Цитируйте со ссылкой на A1 Jobs.",
  ),
} satisfies Record<string, L>;

export function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

function yearsUk(n: number): L {
  const v = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  const vEn = String(n);
  let uk = "років";
  let ru = "лет";
  if (!Number.isInteger(n)) {
    uk = "року";
    ru = "года";
  } else {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) {
      uk = "рік";
      ru = "год";
    } else if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) {
      uk = "роки";
      ru = "года";
    }
  }
  return l3(`${v} ${uk}`, `${vEn} ${n === 1 ? "year" : "years"}`, `${v} ${ru}`);
}

export function uaLeadOf(d: HiringUkraine, month: L): L {
  return fill(UA_TXT.lead, {
    month,
    n: num(d.total),
    c: num(d.companies),
    ad: String(pct(d.army.posts + d.defense.posts, d.total)),
  });
}

const chip =
  "inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300";
const h2 = "text-lg font-semibold text-neutral-900 dark:text-neutral-50";
const para = "mt-2 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400";

function Bars({ rows }: { rows: { label: L | string; value: number; total: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="mt-3 flex max-w-xl flex-col gap-2">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 text-neutral-700 dark:text-neutral-300">
            {typeof r.label === "string" ? r.label : <T {...r.label} />}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <span className="block h-full rounded-full bg-accent/70" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
          <span className="w-24 shrink-0 text-right tabular-nums text-neutral-500">
            {pct(r.value, r.total)}% <span className="text-neutral-400">({num(r.value)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HiringUkraineBody({
  data,
  month,
  live,
  posts,
  months,
  citySlugs,
  worldHref,
}: {
  data: HiringUkraine;
  month: L;
  live: boolean;
  posts: WebPost[];
  months: { key: string; label: L }[];
  /** Город (как у бэкенда, «Kyiv») -> адрес его страницы, если она есть. */
  citySlugs: Map<string, string>;
  worldHref: string | null;
}) {
  const d = data;
  const kpis: { value: string; label: L }[] = [
    { value: num(d.total), label: UA_TXT.kJobs },
    { value: num(d.companies), label: UA_TXT.kEmployers },
    { value: `${pct(d.army.posts + d.defense.posts, d.total)}%`, label: UA_TXT.kArmyDefense },
    { value: `${pct(d.reservation, d.total)}%`, label: UA_TXT.kReservation },
    { value: `${pct(d.withSalary, d.total)}%`, label: UA_TXT.kSalary },
    { value: `${pct(d.firstJob, d.total)}%`, label: UA_TXT.kFirstJob },
  ];
  const levelTotal = d.levels.junior + d.levels.middle + d.levels.senior + d.levels.lead;
  const e = d.english;

  return (
    <>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <T {...uaLeadOf(d, month)} />
        {live ? (
          <>
            {" "}
            <T {...UA_TXT.live} />
          </>
        ) : null}
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {kpis.map((k, i) => (
          <li key={i} className="rounded-2xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <span className="block text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{k.value}</span>
            <span className="block text-sm text-neutral-500">
              <T {...k.label} />
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <h2 className={h2}>
          <T {...UA_TXT.armyH} />
        </h2>
        <p className={para}>
          <T
            {...fill(UA_TXT.armyP, {
              a: num(d.army.posts),
              u: num(d.army.units),
              d: num(d.defense.posts),
              dc: num(d.defense.companies),
              sa: String(pct(d.army.withSalary, d.army.posts)),
              sc: String(pct(d.civil.withSalary, d.civil.posts)),
            })}
          />{" "}
          <T {...fill(UA_TXT.reservationP, { r: String(pct(d.reservation, d.total)), rn: num(d.reservation) })} />
        </p>
      </section>

      <section className="mt-8">
        <h2 className={h2}>
          <T {...UA_TXT.top} />
        </h2>
        <ol className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
          {d.top.map((c, i) => {
            const name = <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>;
            return (
              <li key={`${c.username ?? c.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-neutral-400">{i + 1}</span>
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="h-7 w-7 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true" />
                )}
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {c.username ? (
                    <Link href={`/u/${c.username}`} className="min-w-0 truncate no-underline hover:text-accent">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  {c.side ? (
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">
                      <T {...(c.side === "army" ? UA_TXT.sideArmy : UA_TXT.sideDefense)} />
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-neutral-500">
                  <T {...fill(UA_TXT.jobsN, { n: num(c.count) })} />
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {d.cities.length ? (
        <section className="mt-8">
          <h2 className={h2}>
            <T {...UA_TXT.cities} />
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {d.cities.filter((c) => c.count >= 3).slice(0, 12).map((c) => {
              const slug = citySlugs.get(c.city);
              const label = (
                <>
                  <T uk={cityLabel(c.city, "uk")} ru={cityLabel(c.city, "ru")} en={c.city} de={c.city} es={c.city} fr={c.city} pl={c.city} ptBR={c.city} zh={c.city} />{" "}
                  <span className="text-neutral-400">
                    {pct(c.count, d.total)}% · {num(c.count)}
                  </span>
                </>
              );
              return (
                <li key={c.city}>
                  {slug ? (
                    <Link href={`/jobs/city/${slug}`} className={chip}>
                      {label}
                    </Link>
                  ) : (
                    <span className={chip}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {levelTotal ? (
        <section className="mt-8">
          <h2 className={h2}>
            <T {...UA_TXT.levels} />
          </h2>
          <p className={para}>
            <T {...fill(UA_TXT.levelsNote, { p: String(pct(levelTotal, d.total)) })} />
          </p>
          <Bars
            rows={(["junior", "middle", "senior", "lead"] as const).map((k) => ({
              label: k === "lead" ? "Lead+" : k[0]!.toUpperCase() + k.slice(1),
              value: d.levels[k],
              total: levelTotal,
            }))}
          />
        </section>
      ) : null}

      {e.known ? (
        <section className="mt-8">
          <h2 className={h2}>
            <T {...UA_TXT.english} />
          </h2>
          <p className={para}>
            <T {...fill(UA_TXT.englishNote, { p: String(pct(e.known, d.total)) })} />
          </p>
          <Bars
            rows={[
              ...(e.low ? [{ label: UA_TXT.englishLow, value: e.low, total: e.known }] : []),
              { label: "B1", value: e.B1, total: e.known },
              { label: "B2", value: e.B2, total: e.known },
              { label: "C1", value: e.C1, total: e.known },
              { label: "C2", value: e.C2, total: e.known },
            ]}
          />
        </section>
      ) : null}

      {d.experience.median != null ? (
        <section className="mt-8">
          <h2 className={h2}>
            <T {...UA_TXT.experience} />
          </h2>
          <p className={para}>
            <T
              {...fill(UA_TXT.experienceP, {
                m: yearsUk(d.experience.median),
                p: String(pct(d.experience.known, d.total)),
                f: String(pct(d.firstJob, d.total)),
                fn: num(d.firstJob),
              })}
            />{" "}
            <Link href="/jobs/tag/no-experience" className="text-accent no-underline hover:underline">
              →
            </Link>
          </p>
        </section>
      ) : null}

      {d.stacks.length ? (
        <section className="mt-8">
          <h2 className={h2}>
            <T {...UA_TXT.stacks} />
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {d.stacks.slice(0, 30).map((s) => (
              <li key={s.slug}>
                <Link href={`/jobs/stack/${s.slug}`} className={chip}>
                  {s.label} <span className="text-neutral-400">{num(s.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {posts.length ? (
        <section className="mt-10">
          <h2 className={h2}>
            <T {...UA_TXT.latest} />
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <Link href="/" className="text-accent no-underline hover:underline">
              <T {...UA_TXT.allUa} />
            </Link>
          </p>
        </section>
      ) : null}

      {months.length > 1 ? (
        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <T {...UA_TXT.months} />
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {months
              .filter((m) => m.key !== d.month)
              .map((m) => (
                <li key={m.key}>
                  <Link href={`/jobs/hiring/ukraine/${m.key}`} className={chip}>
                    <T {...m.label} />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {worldHref ? (
        <p className="mt-8">
          <Link href={worldHref} className="text-accent no-underline hover:underline">
            <T {...fill(UA_TXT.world, { month })} />
          </Link>
        </p>
      ) : null}

      <p className="mt-10 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
        <T {...UA_TXT.how} />
      </p>
    </>
  );
}

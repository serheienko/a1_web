// components/military-banner.tsx
//
// 08.10.2026 (Александр: «переименовать тег бронирования в Військо…
// сверху баннер как превью, называем „статистика“»). Баннер над списком
// на /jobs/tag/reservation: свёрнутый -- флаг, число, три самых нужных
// направления; по клику раскрывается в полную картину (9 направлений,
// работодатели, города). Макет утверждён 08.10.2026.
//
// <details> вместо JS: страница серверная, содержимое лежит в HTML и
// в свёрнутом виде (его читает поисковик), раскрывается без скрипта.
// Блок всегда тёмный (как в макете), поэтому не зависит от темы сайта.
// Цифры считает lib/a1/military.ts из того же кэша на час, что и список.

import Link from "next/link";
import { T, type Locale } from "@/components/t";
import { MilitaryDetails } from "@/components/military-details";
import { ROLE_LABEL, type MilitaryStats, type RoleKey } from "@/lib/a1/military";

const nf = (n: number) => n.toLocaleString("uk-UA").replace(/\s/g, " ");

/** Только uk/en/ru написаны руками; остальные языки показывают английский. */
function tx(uk: string, en: string, ru: string): Record<Locale, string> {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en };
}

function Flag({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 36 24" className="block shrink-0 rounded-[3px]" role="img" aria-label="Прапор України">
      <rect width="36" height="12" fill="#0057b7" />
      <rect y="12" width="36" height="12" fill="#ffd700" />
    </svg>
  );
}

const ICON: Record<RoleKey, React.ReactNode> = {
  "hr-fin-sales": (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.2c3 0 5 2 5 5" />
    </>
  ),
  managers: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" />,
  "qa-sec": (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  electronics: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  production: (
    <>
      <path d="M3 21V10l6 4V10l6 4V6h4v15z" />
      <path d="M7 21v-3M12 21v-3" />
    </>
  ),
  software: <path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14" />,
  design: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7L6 21M12 7l6 14M8.5 15h7" />
    </>
  ),
  "uav-ops": (
    <>
      <circle cx="5" cy="5" r="2.5" />
      <circle cx="19" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </>
  ),
  procurement: (
    <>
      <path d="M2 6h11v10H2zM13 10h4l4 3v3h-8" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  other: <circle cx="12" cy="12" r="4" />,
};

function RoleIcon({ k, size = 22 }: { k: RoleKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e8b43c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[k]}
    </svg>
  );
}

function Bar({ value, max, color = "#e8b43c", delay = 0, h = 6 }: { value: number; max: number; color?: string; delay?: number; h?: number }) {
  const w = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="overflow-hidden rounded-full bg-[#222819]" style={{ height: h }}>
      <div className="mil-grow h-full rounded-full" style={{ width: `${w}%`, background: color, animationDelay: `${delay}s` }} />
    </div>
  );
}

const CSS = `
@keyframes mil-grow{from{width:0}}
@keyframes mil-spin{to{transform:rotate(360deg)}}
@keyframes mil-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes mil-wave{0%,100%{transform:skewY(-2deg) rotate(-1deg)}50%{transform:skewY(2deg) rotate(1deg)}}
.mil-grow{animation:mil-grow 1.2s ease-out both}
.mil-rise{animation:mil-rise .6s ease-out both}
.mil-spin{animation:mil-spin 6s linear infinite}
.mil-wave{animation:mil-wave 4s ease-in-out infinite;transform-origin:left center}
details.mil[open]:not(.mil-closing) .mil-closed-only{display:none}
details.mil:not([open]) .mil-open-only,details.mil.mil-closing .mil-open-only{display:none}
details.mil>summary{list-style:none}
details.mil>summary::-webkit-details-marker{display:none}
@media (prefers-reduced-motion:reduce){.mil-grow,.mil-rise,.mil-spin,.mil-wave{animation:none!important}}
`;

/** Адрес страницы: карточки направлений ведут сюда же с ?role=... и прокручивают к списку. */
const BASE = "/jobs/tag/reservation";

export function MilitaryBanner({ stats, activeRole, open = false }: { stats: MilitaryStats; activeRole?: RoleKey; open?: boolean }) {
  const top = stats.roles.slice(0, 3);
  const maxRole = stats.roles[0]?.count ?? 1;
  const maxEmp = stats.employers[0]?.count ?? 1;
  const maxCity = stats.cities[0]?.count ?? 1;

  return (
    <section aria-label="Статистика" className="mb-8">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <MilitaryDetails
        open={open}
        className="mil overflow-hidden rounded-2xl border border-[#2a3024] bg-[#101310] text-[#e9ecdf]"
        summary={
          <>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: "linear-gradient(#0057b7 50%,#ffd700 50%)" }} />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 hidden h-40 w-40 sm:block">
            <div className="absolute inset-0 rounded-full border border-[#2a3024]" />
            <div className="absolute inset-[17%] rounded-full border border-[#2a3024]" />
            <div className="absolute inset-[34%] rounded-full border border-[#2a3024]" />
            <div
              className="mil-spin absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 0deg,rgba(232,180,60,0) 0deg,rgba(232,180,60,0) 280deg,rgba(232,180,60,.35) 360deg)" }}
            />
          </div>

          <div className="relative mt-1 flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[.14em] text-[#e8b43c]">
            <Flag w={22} h={15} />
            <T {...tx("Військо в цифрах", "Defense jobs in numbers", "Военные вакансии в цифрах")} />
          </div>

          <div className="relative mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="text-6xl font-extrabold leading-[.9] tracking-tight text-[#e8b43c] sm:text-7xl">{nf(stats.total)}</div>
              <div className="mt-1.5 text-[13px] text-[#9aa28c]">
                <T {...tx("військових та оборонних вакансій", "defense and military jobs", "военных и оборонных вакансий")} />
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {top.map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <RoleIcon k={r.key} size={16} />
                  <span className="text-[#c3c9b4]">
                    <T {...tx(ROLE_LABEL[r.key].uk, ROLE_LABEL[r.key].en, ROLE_LABEL[r.key].ru)} />
                  </span>
                  <span className="font-bold text-[#e8b43c]">{nf(r.count)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-[#e8b43c]/50 px-4 py-2 text-[14px] font-semibold text-[#e8b43c]">
            <span className="mil-closed-only">
              <T {...tx("Уся статистика", "Full statistics", "Вся статистика")} />
            </span>
            <span className="mil-open-only">
              <T {...tx("Згорнути", "Collapse", "Свернуть")} />
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mil-closed-only">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mil-open-only">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </div>
          </>
        }
      >
        <div className="border-t border-[#2a3024] p-5 sm:p-6">
          <div className="flex flex-wrap gap-x-9 gap-y-4">
            {[
              { n: nf(stats.employersCount), l: tx("роботодавців", "employers", "работодателей") },
              { n: `${stats.top30Share}%`, l: tx("дають 30 найбільших", "from the top 30", "дают 30 крупнейших") },
              { n: `${stats.kyivShare}%`, l: tx("у Києві", "in Kyiv", "в Киеве") },
              { n: nf(stats.withReservation), l: tx("з бронюванням", "with deferment", "с бронированием") },
              { n: nf(stats.withoutReservation), l: tx("без бронювання", "without deferment", "без бронирования") },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-bold leading-none">{s.n}</div>
                <div className="mt-1 text-[13px] text-[#9aa28c]">
                  <T {...s.l} />
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-[12px] font-semibold uppercase tracking-[.14em] text-[#e8b43c]">
            <T {...tx("Хто потрібен найбільше", "Who is needed most", "Кто нужен больше всего")} />
          </h2>
          <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.roles.map((r, i) => (
              <li key={r.key} className="mil-rise" style={{ animationDelay: `${0.04 * i}s` }}>
              <Link
                href={activeRole === r.key ? BASE : `${BASE}?role=${r.key}#mil-list`}
                rel="nofollow"
                scroll
                aria-current={activeRole === r.key ? "true" : undefined}
                className={
                  "group/card flex h-full flex-col gap-2.5 rounded-xl border bg-[#181c15] p-4 no-underline transition hover:-translate-y-0.5 hover:border-[#e8b43c]/70 hover:bg-[#1d2219] " +
                  (activeRole === r.key ? "border-[#e8b43c]" : "border-[#2a3024]")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#222819]">
                    <RoleIcon k={r.key} />
                  </span>
                  <span className="text-[13px] font-bold tracking-[.14em] text-[#9aa28c]">№ {i + 1}</span>
                </div>
                <div className="min-h-[2.4em] text-[15px] font-bold uppercase leading-tight">
                  <T {...tx(ROLE_LABEL[r.key].uk, ROLE_LABEL[r.key].en, ROLE_LABEL[r.key].ru)} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold leading-none text-[#e8b43c]">{nf(r.count)}</span>
                  <span className="text-[13px] text-[#9aa28c]">
                    <T {...tx("вакансій", "jobs", "вакансий")} /> · {r.pct}%
                  </span>
                </div>
                <Bar value={r.count} max={maxRole} h={7} delay={0.2 + 0.05 * i} />
                {r.examples.length ? <div className="text-[12px] leading-snug text-[#9aa28c]">{r.examples.join(" · ")}</div> : null}
                <div className="mt-auto pt-1 text-[12px] font-semibold text-[#e8b43c] opacity-70 transition group-hover/card:opacity-100">
                  {activeRole === r.key ? (
                    <T {...tx("Показано · скинути ✕", "Showing · clear ✕", "Показано · сбросить ✕")} />
                  ) : (
                    <T {...tx("Показати вакансії →", "Show jobs →", "Показать вакансии →")} />
                  )}
                </div>
              </Link>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#2a3024] bg-[#181c15] p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-[.14em] text-[#e8b43c]">
                <T {...tx("Найбільші роботодавці", "Top employers", "Крупнейшие работодатели")} />
              </h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {stats.employers.map((e, i) => (
                  <li key={e.name + i}>
                    <div className="mb-1 flex justify-between gap-2 text-[14px]">
                      <span className="min-w-0 truncate">
                        {e.name}
                        {e.agency ? (
                          <span className="ml-2 rounded-full border border-[#3a4231] px-2 py-px text-[11px] text-[#9aa28c]">
                            <T {...tx("рекрутингова агенція", "recruiting agency", "рекрутинговое агентство")} />
                          </span>
                        ) : null}
                      </span>
                      <span className="font-bold text-[#e8b43c]">{nf(e.count)}</span>
                    </div>
                    <Bar value={e.count} max={maxEmp} color={e.agency ? "#5a6a3c" : "#e8b43c"} delay={0.05 * i} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-snug text-[#7d8570]">
                <T {...tx("Рекрутингові агенції позначено окремо: одна агенція не повинна виглядати найбільшим роботодавцем.", "Recruiting agencies are marked: one agency should not look like the biggest employer.", "Рекрутинговые агентства отмечены отдельно: одно агентство не должно выглядеть крупнейшим работодателем.")} />
              </p>
            </div>
            <div className="rounded-xl border border-[#2a3024] bg-[#181c15] p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-[.14em] text-[#e8b43c]">
                <T {...tx("Міста", "Cities", "Города")} />
              </h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {stats.cities.map((c, i) => (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between gap-2 text-[14px]">
                      <span>{c.name}</span>
                      <span className="font-bold text-[#e8b43c]">{nf(c.count)}</span>
                    </div>
                    <Bar value={c.count} max={maxCity} color="#4a8fe7" delay={0.05 * i} />
                  </li>
                ))}
              </ul>
              {stats.noCity > 0 ? (
                <p className="mt-3 text-[12px] leading-snug text-[#7d8570]">
                  <T {...tx(`У ${nf(stats.noCity)} вакансій місто не вказане.`, `${nf(stats.noCity)} jobs have no city.`, `У ${nf(stats.noCity)} вакансий город не указан.`)} />
                </p>
              ) : null}
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-[12px] leading-relaxed text-[#7d8570]">
            <T
              {...tx(
                "Склад за назвами вакансій, оновлюється щогодини. До військових належать вакансії оборонних і дронових компаній та військові ролі. Позначка «бронювання» — це слова самого роботодавця: A1 цього не гарантує й не оформлює, умови уточнюйте в компанії.",
                "Breakdown by job titles, refreshed hourly. Defense jobs are those from defense and drone companies plus military roles. “Deferment” is the employer's own statement: A1 does not guarantee or arrange it, confirm the terms with the company.",
                "Состав по названиям вакансий, обновляется каждый час. К военным относятся вакансии оборонных и дроновых компаний и военные роли. Пометка «бронирование» — слова самого работодателя: A1 этого не гарантирует и не оформляет, условия уточняйте в компании.",
              )}
            />
          </p>
        </div>
      </MilitaryDetails>
    </section>
  );
}

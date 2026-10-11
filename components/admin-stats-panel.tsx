"use client";

// components/admin-stats-panel.tsx
//
// 11.10.2026. Клики по сайту: просмотры вакансий, переходы на сайт
// компании, отклики и путь клейма -- по компаниям, внутри по вакансиям.
//
// Весь список приезжает одним запросом и дальше фильтруется в браузере:
// строк тут сотни, а не сотни тысяч, зато поиск мгновенный -- ровно та
// претензия, с которой страница и начиналась («даже 40 откликов
// грузились долго»).

import { Fragment, useEffect, useMemo, useState } from "react";

type Totals = {
  view: number;
  external: number;
  apply: number;
  claim_open: number;
  claim_sent: number;
  claim_done: number;
};

type CompanyRow = { company: string; totals: Totals; posts: { post: string; totals: Totals }[] };

type Data = { ok: boolean; from: string; companies: CompanyRow[]; totals: Totals };

const PERIODS = [
  { days: 1, label: "Сьогодні" },
  { days: 7, label: "7 днів" },
  { days: 30, label: "30 днів" },
  { days: 90, label: "90 днів" },
];

const COLUMNS: { key: keyof Totals; label: string; hint: string }[] = [
  { key: "view", label: "Перегляди", hint: "Відкрили сторінку вакансії" },
  { key: "external", label: "Переходи", hint: "Натиснули «Відкрити вакансію» — пішли на сайт компанії" },
  { key: "apply", label: "Відгуки", hint: "Натиснули «Відгукнутися»" },
  { key: "claim_open", label: "Клейм: відкрили", hint: "Натиснули «Це ваша компанія?»" },
  { key: "claim_sent", label: "Клейм: код", hint: "Пошта підійшла, код надіслано" },
  { key: "claim_done", label: "Клейм: забрали", hint: "Профіль переданий компанії" },
];

export function AdminStatsPanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/api/admin/stats?days=${days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Data | null) => {
        if (cancelled) return;
        if (d?.ok) setData(d);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const rows = useMemo(() => {
    const all = data?.companies ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((r) => r.company.includes(needle) || r.posts.some((p) => p.post.includes(needle)));
  }, [data, query]);

  const cell = "px-3 py-2 text-right tabular-nums";
  const head = "px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Статистика кліків</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Рахуємо у себе, тому сторінка відкривається одразу. Дані з {data?.from ?? "…"}.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition " +
              (p.days === days
                ? "bg-accent text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Пошук за компанією або вакансією…"
        className="mt-4 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />

      {loading && <p className="mt-6 text-sm text-neutral-500">Завантаження…</p>}
      {failed && <p className="mt-6 text-sm text-red-600">Не вдалося завантажити.</p>}

      {data && !loading && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COLUMNS.map((c) => (
              <div
                key={c.key}
                title={c.hint}
                className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
              >
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{c.label}</div>
                <div className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                  {data.totals[c.key]}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Компанія
                  </th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} title={c.hint} className={head}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = openRow === r.company;
                  return (
                    <Fragment key={r.company}>
                      <tr
                        onClick={() => setOpenRow(open ? null : r.company)}
                        className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/50"
                      >
                        <td className="px-3 py-2">
                          <span className="mr-1.5 inline-block text-neutral-400">{open ? "▾" : "▸"}</span>
                          {r.company ? (
                            <a
                              href={`/u/${r.company}`}
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-accent hover:underline"
                            >
                              {r.company}
                            </a>
                          ) : (
                            <span className="text-neutral-500">— без компанії</span>
                          )}
                        </td>
                        {COLUMNS.map((c) => (
                          <td key={c.key} className={cell}>
                            {r.totals[c.key] || ""}
                          </td>
                        ))}
                      </tr>
                      {open &&
                        r.posts.map((p) => (
                          <tr key={`${r.company}/${p.post}`} className="bg-neutral-50/60 text-[13px] dark:bg-neutral-800/30">
                            <td className="px-3 py-1.5 pl-9">
                              <a
                                href={`/jobs/${p.post}`}
                                target="_blank"
                                rel="noopener"
                                className="text-neutral-600 hover:text-accent hover:underline dark:text-neutral-400"
                              >
                                {p.post}
                              </a>
                            </td>
                            {COLUMNS.map((c) => (
                              <td key={c.key} className={cell}>
                                {p.totals[c.key] || ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="mt-6 text-sm text-neutral-500">
              {query ? "Нічого не знайшлося." : "Поки жодного кліку за цей період."}
            </p>
          )}
        </>
      )}
    </main>
  );
}

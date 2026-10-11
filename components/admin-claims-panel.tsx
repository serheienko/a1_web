"use client";

// components/admin-claims-panel.tsx
//
// 11.10.2026. Разбор заявок: компания говорит «это мы, вот наша почта и наш
// сайт», человек сверяет и либо выдаёт ссылку, либо отклоняет.
//
// Что проверять глазами: совпадает ли названный сайт с компанией в профиле и
// стоит ли почта на этом же домене. Ссылка даёт полный доступ к аккаунту, её
// нельзя выдавать «на всякий случай».

import { useEffect, useState } from "react";

type Row = {
  id: string;
  createdAt: string;
  target: { kind: "post"; postId: string } | { kind: "username"; username: string };
  company: string;
  email: string;
  site: string;
  note: string;
  status: "new" | "granted" | "rejected";
  handledAt?: string;
  link?: string;
};

const STATUS: Record<Row["status"], { label: string; className: string }> = {
  new: { label: "Нова", className: "bg-accent/10 text-accent" },
  granted: { label: "Видано", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Відхилено", className: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300" },
};

export function AdminClaimsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [grantReady, setGrantReady] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setFailed(false);
    fetch("/api/admin/claims", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; rows?: Row[]; grantReady?: boolean } | null) => {
        if (d?.ok && d.rows) {
          setRows(d.rows);
          setGrantReady(!!d.grantReady);
        } else setFailed(true);
      })
      .catch(() => setFailed(true));
  }

  useEffect(load, []);

  async function act(id: string, action: "grant" | "reject") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; row?: Row; message?: string } | null;
      if (data?.ok && data.row) {
        setRows((prev) => (prev ?? []).map((r) => (r.id === id ? data.row! : r)));
      } else {
        setError(
          data?.message === "grant_not_configured"
            ? "Не налаштовано CLAIM_GRANT_SECRET — додайте змінну сайту й бекенду."
            : "Не вдалося. Спробуйте ще раз.",
        );
      }
    } catch {
      setError("Не вдалося. Спробуйте ще раз.");
    } finally {
      setBusy(null);
    }
  }

  const pill = "rounded-full px-2.5 py-1 text-xs font-medium";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Заявки на передачу профілю</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Компанії, у яких ми не знаємо домену, тож правило їх не пропускає. Звіряйте сайт і пошту очима — посилання дає
        повний доступ до акаунта.
      </p>

      {!grantReady && (
        <p className="mt-4 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          Видача вимкнена: немає CLAIM_GRANT_SECRET у змінних сайту (і такої самої у бекенда).
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {failed && <p className="mt-6 text-sm text-red-600">Не вдалося завантажити список.</p>}
      {rows === null && !failed && <p className="mt-6 text-sm text-neutral-500">Завантаження…</p>}
      {rows?.length === 0 && <p className="mt-6 text-sm text-neutral-500">Заявок поки немає.</p>}

      <div className="mt-6 flex flex-col gap-3">
        {(rows ?? []).map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${pill} ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span>
              {r.target.kind === "username" ? (
                <a
                  href={`/u/${r.target.username}`}
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-accent hover:underline"
                >
                  {r.target.username}
                </a>
              ) : (
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  вакансія {r.target.postId}
                </span>
              )}
              <span className="text-xs text-neutral-400">{new Date(r.createdAt).toLocaleString("uk-UA")}</span>
            </div>

            <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[7rem_1fr]">
              <dt className="text-neutral-500 dark:text-neutral-400">Пошта</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{r.email}</dd>
              <dt className="text-neutral-500 dark:text-neutral-400">Сайт</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">
                {r.site ? (
                  <a href={r.site} target="_blank" rel="noopener nofollow" className="text-accent hover:underline">
                    {r.site}
                  </a>
                ) : (
                  <span className="text-neutral-400">не вказано</span>
                )}
              </dd>
              {r.note && (
                <>
                  <dt className="text-neutral-500 dark:text-neutral-400">Повідомлення</dt>
                  <dd className="whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">{r.note}</dd>
                </>
              )}
            </dl>

            {r.link && (
              <div className="mt-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Надішліть це посилання компанії (діє 14 днів):
                </p>
                <code className="mt-1 block break-all text-xs text-neutral-900 dark:text-neutral-100">{r.link}</code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(r.link!)}
                  className="mt-2 rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200"
                >
                  Скопіювати
                </button>
              </div>
            )}

            {r.status === "new" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy === r.id || !grantReady}
                  onClick={() => void act(r.id, "grant")}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Видати посилання
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => void act(r.id, "reject")}
                  className="rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  Відхилити
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

// app/admin/first250/page.tsx -- список акции «Перші 250» (14.10.2026, Александр): кто забрал место,
// по порядку. Отсюда же -- выгрузка CSV, по которой через 1–2 недели включаем Premium на год.
// Доступ -- как у остальных админских страниц (ADMIN_EMAILS), иначе обычный 404.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { allEntries, reservedSeats, totalSeats } from "@/lib/first250/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Перші 250 — список" };

export default async function AdminFirst250Page() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) notFound();
  const rows = await allEntries();
  const total = totalSeats();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Перші 250</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Забрали місце за посиланням: <b>{rows.length}</b>. Ще {reservedSeats()} місць зарезервовано (№1–{reservedSeats()}) — для своїх і розіграшів.
            Premium отримують усі до №{total}.
          </p>
        </div>
        <a href="/api/admin/first250" className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black">
          ⬇ Скачати CSV
        </a>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2">№</th>
              <th className="px-3 py-2">Імʼя</th>
              <th className="px-3 py-2">Нік</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Коли</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className={"border-t border-neutral-100 dark:border-neutral-800 " + (r.place > total ? "opacity-50" : "")}>
                <td className="px-3 py-2 tabular-nums">{r.place}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.username ? <a className="text-accent hover:underline" href={`/u/${r.username}`}>@{r.username}</a> : "—"}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-500">{r.claimedAt.slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">Поки нікого.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

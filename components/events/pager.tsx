// components/events/pager.tsx -- нумерация страниц «‹ 1 2 3 … 9 ›» для списков событий (по 20 на страницу).
"use client";

export function pageNumbers(total: number, cur: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1]);
  if (cur <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (cur >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    const prev = nums[i - 1];
    if (prev !== undefined && n - prev > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-[14px] font-medium transition ";
  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="pages">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="prev" className={btn + "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 dark:bg-neutral-800 dark:text-neutral-300"}>‹</button>
      {pageNumbers(pages, page).map((n, i) =>
        n === "…" ? (
          <span key={"g" + i} className="px-1 text-neutral-400">…</span>
        ) : (
          <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={btn + (n === page ? "bg-accent text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300")}>
            {n}
          </button>
        ),
      )}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="next" className={btn + "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 dark:bg-neutral-800 dark:text-neutral-300"}>›</button>
    </nav>
  );
}

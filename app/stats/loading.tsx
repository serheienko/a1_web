// app/stats/loading.tsx -- пока сервер считает статистику, человек сразу видит страницу с заглушками,
// а не «ничего не происходит» (14.10.2026, Александр). Ошибку «мягкого 404» тут не словить:
// /stats существует всегда, notFound() на ней не бывает.
import { T } from "@/components/t";

export default function StatsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-neutral-200/80 dark:bg-neutral-800" />
      <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
        <T
          uk="Рахуємо свіжі цифри по всіх вакансіях…"
          en="Crunching fresh numbers across all jobs…"
          ru="Считаем свежие цифры по всем вакансиям…"
          de="Wir berechnen aktuelle Zahlen aller Stellen…"
          es="Calculando cifras frescas de todas las vacantes…"
          fr="Calcul des chiffres à jour de toutes les offres…"
          pl="Liczymy świeże dane ze wszystkich ofert…"
          ptBR="Calculando números atualizados de todas as vagas…"
          zh="正在统计所有职位的最新数据…"
        />
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200/70 dark:bg-neutral-800/80" />
        ))}
      </div>
      <div className="mt-6 h-72 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/70" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/70" />
        <div className="h-56 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/70" />
      </div>
    </main>
  );
}

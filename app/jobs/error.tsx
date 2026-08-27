"use client";

import { T } from "@/components/t";

export default function JobsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50"><T uk="Не вдалося завантажити вакансії" en="Couldn't load jobs" ru="Не получилось загрузить вакансии" de="Stellenangebote konnten nicht geladen werden" es="No se pudieron cargar las vacantes" fr="Impossible de charger les offres d'emploi" pl="Nie udało się załadować ofert pracy" ptBR="Não foi possível carregar as vagas" zh="无法加载职位" /></h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400"><T uk="Спробуйте оновити сторінку через хвилину." en="Try refreshing the page in a minute." ru="Попробуйте обновить страницу через минуту." de="Versuchen Sie, die Seite in einer Minute zu aktualisieren." es="Intenta actualizar la página en un minuto." fr="Essayez d'actualiser la page dans une minute." pl="Spróbuj odświeżyć stronę za minutę." ptBR="Tente atualizar a página em um minuto." zh="请稍后刷新页面重试。" /></p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
      >
        <T uk="Спробувати знову" en="Try again" ru="Попробовать снова" de="Erneut versuchen" es="Intentar de nuevo" fr="Réessayer" pl="Spróbuj ponownie" ptBR="Tentar novamente" zh="重试" />
      </button>
    </main>
  );
}

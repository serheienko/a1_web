"use client";

import { T } from "@/components/t";

// app/u/[username]/error.tsx
//
// Aleksandr, 2026-08-30 (screen recording): reloading a profile crashed
// the whole page after §6.50 shipped (see components/profile-tabs.tsx's
// own comment on the actual bug and fix). Without a route-local error
// boundary, that crash bubbled all the way up to app/error.tsx — whose
// copy is hardcoded "Не вдалося завантажити вакансії", flatly wrong for
// a profile page. This mirrors app/jobs/error.tsx and app/talents/
// error.tsx's own pattern, just with wording that fits any page under
// /u/[username] instead.
export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50"><T uk="Не вдалося завантажити профіль" en="Couldn't load this profile" ru="Не получилось загрузить профиль" de="Profil konnte nicht geladen werden" es="No se pudo cargar el perfil" fr="Impossible de charger le profil" pl="Nie udało się załadować profilu" ptBR="Não foi possível carregar o perfil" zh="无法加载该资料" /></h1>
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

// components/job-landing.tsx
//
// 2026-09-14. Общая начинка посадочных страниц /jobs/remote, /jobs/office,
// /jobs/hybrid. Зачем они и почему их ровно три -- в шапке
// lib/seo/job-landings.ts.
//
// Серверный компонент. Фильтров здесь намеренно НЕТ, в отличие от
// главной: фильтр добавил бы к адресу параметры, а отфильтрованные
// выдачи у нас закрыты от индексации -- посадочная превращалась бы в
// свою же noindex-версию одним кликом. Здесь только список и
// нумерованная пагинация обычными ссылками.

import { fetchFeedPage, pageToCursor, FEED_PAGE_SIZE } from "@/lib/a1/feed";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { LOCALES, LOCALE_VISIBILITY_CLASS, type Locale } from "@/components/t";
import { T } from "@/components/t";
import type { JobLanding } from "@/lib/seo/job-landings";

/**
 * Строка с числом на девяти языках. Тот же приём, что у <T/>: рисуем все
 * девять вариантов, видимый выбирает CSS -- иначе пришлось бы читать
 * язык из куки и терять статическую генерацию всей страницы.
 *
 * Шаблон со «{n}» вместо склейки «число + фраза»: порядок слов в разных
 * языках разный, и склейкой правильную фразу не собрать.
 */
function CountLine({ template, n }: { template: Record<Locale, string>; n: number }) {
  return (
    <>
      {LOCALES.map((locale) => {
        const [before = "", after = ""] = template[locale].split("{n}");
        return (
          <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
            {before}
            {n.toLocaleString("uk-UA").replace(/ /g, " ")}
            {after}
          </span>
        );
      })}
    </>
  );
}

export async function JobLandingPage({ landing, page }: { landing: JobLanding; page: number }) {
  const { posts, hasMore, total } = await fetchFeedPage("hiring", pageToCursor(page), {
    tags: [landing.tag],
  });
  const totalPages = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
  const avatarBlurs = await Promise.all(posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));

  const basePath = `/jobs/${landing.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* Крошка -- и для Google, и как ссылка обратно в общую ленту. */}
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <a href="/" className="transition hover:text-accent">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />
        </a>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <header className="mb-8">
        {/* В отличие от главной, заголовок виден и на телефоне: на
            посадочной он и есть содержание страницы, а не подпись к
            вкладке, которая и так видна в шапке. */}
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...landing.h1} />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <CountLine template={landing.countLine} n={total} />
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <T {...landing.lead} />
        </p>
      </header>

      {posts.length === 0 ? (
        <EmptyState
          message={
            <T uk="Поки немає відкритих вакансій у цьому форматі." en="There are no open jobs in this format yet." ru="Пока нет открытых вакансий в этом формате." de="Es gibt noch keine offenen Stellen in diesem Format." es="Todavía no hay vacantes en este formato." fr="Il n'y a pas encore d'offres dans ce format." pl="Nie ma jeszcze ofert w tym formacie." ptBR="Ainda não há vagas neste formato." zh="该形式暂无开放职位。" />
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <li key={post.id}>
                <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} />
              </li>
            ))}
          </ul>
          <Pagination basePath={basePath} params={new URLSearchParams()} page={page} hasMore={hasMore} totalPages={totalPages} />
        </>
      )}
    </main>
  );
}

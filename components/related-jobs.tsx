// components/related-jobs.tsx
//
// 2026-09-14 (Александр, SEO-разбор). Подборка внизу страницы вакансии:
// другие вакансии той же компании и похожие. Почему это вообще делается
// -- в шапке lib/a1/related.ts, там же логика подбора.
//
// Серверный компонент без единой строчки клиентского JS -- это главное
// требование, а не деталь. Весь смысл блока в том, что Google видит
// ссылки СРАЗУ В HTML. Подгрузи мы его на клиенте после гидратации --
// робот бы не увидел ничего, и работа была бы напрасной.
//
// Карточки здесь свои, компактные, а не components/post-card.tsx: тот
// тянет аватарки с кешем в Cache Storage, бейджи, меню и относительное
// время -- всё клиентское. Внизу страницы нужен список ссылок, а не
// вторая лента.

import Link from "next/link";
import { T } from "@/components/t";
import type { WebPost } from "@/types/web-post";

function JobRow({ post }: { post: WebPost }) {
  const meta = [post.author.name, post.location?.display].filter(Boolean).join(" · ");

  return (
    <li>
      <Link
        href={`/jobs/${post.slug}`}
        className="group block rounded-xl px-3 py-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <span className="block text-[15px] font-medium leading-snug text-neutral-900 group-hover:text-accent dark:text-neutral-50">
          {post.title}
        </span>
        {meta && (
          <span className="mt-0.5 block truncate text-[13px] text-neutral-500 dark:text-neutral-400">
            {meta}
          </span>
        )}
      </Link>
    </li>
  );
}

function Section({ title, posts }: { title: React.ReactNode; posts: WebPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mt-10">
      {/* Настоящий h2, а не div с мелким шрифтом: у страницы вакансии
          своих подзаголовков почти нет (только «Посилання» и «Питання
          до відгуку»), и этот -- первый, который реально описывает
          содержимое блока. */}
      <h2 className="px-3 text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title}
      </h2>
      <ul className="mt-1 -mx-3">
        {posts.map((post) => (
          <JobRow key={post.id} post={post} />
        ))}
      </ul>
    </section>
  );
}

export function RelatedJobs({
  sameCompany,
  similar,
  companyName,
}: {
  sameCompany: WebPost[];
  similar: WebPost[];
  companyName: string;
}) {
  if (sameCompany.length === 0 && similar.length === 0) return null;

  return (
    <div className="mt-12 border-t border-neutral-100 pt-2 dark:border-neutral-800">
      <Section
        title={
          <>
            <T
              uk="Інші вакансії" en="More jobs at" ru="Другие вакансии"
              de="Weitere Jobs bei" es="Más vacantes en" fr="Autres offres chez"
              pl="Więcej ofert w" ptBR="Mais vagas em" zh="更多职位"
            />{" "}
            {companyName}
          </>
        }
        posts={sameCompany}
      />
      <Section
        title={
          <T
            uk="Схожі вакансії" en="Similar jobs" ru="Похожие вакансии"
            de="Ähnliche Jobs" es="Vacantes similares" fr="Offres similaires"
            pl="Podobne oferty" ptBR="Vagas semelhantes" zh="相似职位"
          />
        }
        posts={similar}
      />
    </div>
  );
}

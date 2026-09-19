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
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { avatarSourceUrl } from "@/lib/avatar-source";
import type { WebPost } from "@/types/web-post";

// 2026-09-16 (Александр). Логотип компании в каждой карточке -- и у
// «інших вакансій» той же компании, и у «схожих», где компании разные.
// Изначально логотип поставили в заголовок секции, но в карточках он
// полезнее: в «схожих» у каждой строки своя компания, и кружок
// отличает их друг от друга быстрее, чем текст.
//
// ОБЫЧНЫЙ <img>, а не CachedAvatar, и это не экономия на спичках:
//
// 1. CachedAvatar -- клиентский компонент, который на монтировании сам
//    лезет за байтами (warmAvatarCache). Блок живёт внизу страницы, его
//    ещё не видно, а девять запросов уже ушли бы. loading="lazy"
//    откладывает их до подхода к экрану.
// 2. Этот файл держится правила «ни строчки клиентского JS» -- весь
//    смысл блока в том, что ссылки видны роботу прямо в HTML.
// 3. Блюр требует посчитать заглушку для каждой картинки на сервере, а
//    это девять лишних загрузок на каждый рендер страницы. Для кружка в
//    20 пикселей оно того не стоит: вместо блюра под картинкой лежит
//    нейтральный кружок, и подмены цвета глаз не замечает.
//
// Адрес -- через avatarSourceUrl: тот же уменьшенный webp (единицы
// килобайт), что и у аватарки в шапке, а не оригинал.
function CompanyLogo({ post }: { post: WebPost }) {
  const src = post.author.avatarUrl
    ? avatarSourceUrl(post.author.avatarUrl)
    : pickDefaultCatAvatar(post.author.username ?? post.author.name ?? post.id);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- см. комментарий выше
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      decoding="async"
      className="h-4 w-4 shrink-0 rounded bg-neutral-100 object-cover dark:bg-neutral-800"
    />
  );
}

function JobRow({ post }: { post: WebPost }) {
  const meta = [post.author.name, post.location?.display].filter(Boolean).join(" · ");

  return (
    <li>
      <Link
        href={`/jobs/${post.slug}`}
        className="group flex h-full flex-col rounded-xl border border-neutral-200 px-3.5 py-3 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
      >
        {/* line-clamp-2 БЕЗ соседнего `block`: у них одинаковый вес, и
            безусловный `block` перебил бы display:-webkit-box, без
            которого line-clamp на Safari/iOS просто не работает. Та же
            грабля, что в components/post-card.tsx -- см. её длинный
            комментарий там. */}
        <span className="line-clamp-2 text-[14px] font-medium leading-snug text-neutral-900 group-hover:text-accent dark:text-neutral-50">
          {post.title}
        </span>
        {meta && (
          <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
            <CompanyLogo post={post} />
            <span className="truncate">{meta}</span>
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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title}
      </h2>
      {/* 2026-09-14 (Александр, скриншот десктопа: «слишком высокая
          страница, ну то есть надо далеко листать... по три
          горизонтально, и тем самым экономить место»). Было девять
          строк в одну колонку -- почти два экрана пустоты справа и
          длинная прокрутка.
          На телефоне остаётся одна колонка: там ширины физически нет, и
          три плитки по ~110px превратили бы каждый заголовок в
          многоточие. Две колонки с sm, три с lg. */}
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
    // 2026-09-19 (Александр, скриншот с телефона): между полем
    // «Додати коментар» и блоком похожих вакансий зияла дыра. Подняли
    // весь блок вместе с разделительной чертой на 20px: mt-12 (48px)
    // -> mt-7 (28px).
    <div className="mt-7 border-t border-neutral-100 pt-2 dark:border-neutral-800">
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

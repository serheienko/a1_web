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
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { WebPost } from "@/types/web-post";

// 2026-09-16 (Александр, скриншот телефона): логотип компании рядом с
// заголовком «Інші вакансії <компанія>». Он тут не украшение: заголовок
// набран капсом и серым, и глазом читается как служебная надпись, а
// кружок сразу говорит «это конкретная компания» -- и даёт вторую
// ссылку на её страницу, кроме имени автора наверху.
//
// По весу это НОЛЬ. Аватарка той же компании уже показана в шапке этой
// же вакансии, а кеш (lib/avatar-image-cache.ts) ключуется по id
// документа и одной ширине на весь сайт -- значит второй показ берётся
// из памяти вкладки, без единого запроса. И блюр, о котором просил
// Александр, там уже встроен: пока байты не пришли, next/image рисует
// размытую заглушку.
const LOGO_PX = 20;

function CompanyLogo({
  avatarUrl,
  blurDataUrl,
  fallbackKey,
}: {
  avatarUrl: string | null;
  blurDataUrl: string | null;
  fallbackKey: string;
}) {
  const className = "h-5 w-5 shrink-0 rounded-md object-cover";
  if (!avatarUrl) {
    // Кот-заглушка, как и везде, где у профиля нет фото (lib/avatars.ts).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={pickDefaultCatAvatar(fallbackKey)} alt="" width={LOGO_PX} height={LOGO_PX} className={className} />;
  }
  return (
    <CachedAvatar
      src={avatarUrl}
      blurDataURL={blurDataUrl ?? BLUR_DATA_URL}
      size={LOGO_PX}
      className={className}
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
          <span className="mt-1 truncate text-[12px] text-neutral-500 dark:text-neutral-400">
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
  companyAvatarUrl = null,
  companyAvatarBlurDataUrl = null,
  companyUsername = null,
  companyKey,
}: {
  sameCompany: WebPost[];
  similar: WebPost[];
  companyName: string;
  companyAvatarUrl?: string | null;
  companyAvatarBlurDataUrl?: string | null;
  companyUsername?: string | null;
  companyKey: string;
}) {
  if (sameCompany.length === 0 && similar.length === 0) return null;

  // items-start, а не items-center: у длинного названия заголовок
  // занимает две строки, и по центру логотип повисает между ними.
  // Высота строки здесь ровно 20px, как и сам логотип, -- при
  // выравнивании по верху он садится точно на первую строку. Проверено
  // на макете с «Центр інновацій та розвитку оборонних технологій МОУ»
  // при ширине экрана 390px.
  const logo = (
    <CompanyLogo
      avatarUrl={companyAvatarUrl}
      blurDataUrl={companyAvatarBlurDataUrl}
      fallbackKey={companyUsername ?? companyName ?? companyKey}
    />
  );

  return (
    <div className="mt-12 border-t border-neutral-100 pt-2 dark:border-neutral-800">
      <Section
        title={
          <span className="inline-flex items-start gap-2 align-middle">
            {companyUsername ? (
              <Link
                href={profileHref(companyUsername)}
                aria-label={companyName}
                className="shrink-0 transition-opacity hover:opacity-80"
              >
                {logo}
              </Link>
            ) : (
              logo
            )}
            <span>
              <T
                uk="Інші вакансії" en="More jobs at" ru="Другие вакансии"
                de="Weitere Jobs bei" es="Más vacantes en" fr="Autres offres chez"
                pl="Więcej ofert w" ptBR="Mais vagas em" zh="更多职位"
              />{" "}
              {companyName}
            </span>
          </span>
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

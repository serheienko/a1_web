export const runtime = "nodejs";
// 09.10.2026 (счёт Railway вырос в 2,5 раза): было 15 с. Пересборка страницы --
// это запрос к бэкенду, а он читает из базы; на 31 тысяче вакансий трафик из базы
// стал заметной статьёй счёта. Вакансии приезжают пачкой раз в сутки, минута
// задержки ничего не меняет, а запросов в четыре раза меньше.
// /api/revalidate остаётся для мгновенного сброса, когда понадобится.
export const revalidate = 60;

// app/page.tsx — the Jobs feed (post-job-employing), living at the site
// root as of 2026-08-26 per Aleksandr: no intermediate landing/chooser
// page, and no "jobs.jobs" duplication in the URL (the domain is already
// jobs.a1appp.com). This is what used to be app/jobs/page.tsx verbatim —
// app/jobs/page.tsx is now a permanent redirect to "/" (forwarding any
// filter query params) for old links/bookmarks. Talents is unaffected,
// still at /talents.

import type { Metadata } from "next";
import { fetchFeedPage, toURLSearchParams, parseFeedFilters, hasActiveFilters, pageToCursor, parsePageParam, FEED_PAGE_SIZE } from "@/lib/a1/feed";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { Filters } from "@/components/filters";
import { DEFAULT_COUNTRY_CODE } from "@/lib/seo/countries";
import { T, type Locale } from "@/components/t";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { JOB_LANDINGS } from "@/lib/seo/job-landings";
import { FACT_LANDINGS } from "@/lib/seo/fact-landings";
import { TOP100_LANDING } from "@/lib/seo/top100-landing";
import { TECH_CATALOG } from "@/lib/seo/tech-catalog";
import { fetchCategories, itCategoryValue } from "@/lib/a1/datasets";
import { StackPicker } from "@/components/stack-picker";
import { buildSiteJsonLd } from "@/lib/seo/jsonld";
import { withCountry } from "@/lib/seo/landing-country";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = toURLSearchParams(await searchParams);
  const filters = parseFeedFilters(params);
  const filtered = hasActiveFilters(filters);
  const page = parsePageParam(params);

  // 2026-08-28, per Aleksandr's review of the SEO copy ("Текст норм" —
  // approved as final): Ukrainian, matching the site's real default
  // (<html lang="uk">, see app/layout.tsx), not the Russian placeholder
  // this carried before. Also drops an earlier draft's mention of a
  // salary filter — there is no such filter (see components/filters.tsx),
  // and fixes "компаній і людей" -> "компаній і приватних осіб", which
  // reads oddly next to a company name.
  // 01.10.2026, по анализу ключевых слов (Google Planner / Bing): заголовок
  // без слов «IT», «Україна», «віддалено» не отвечал ни на один запрос.
  // Александр одобрил замену («делаем все три пункта»).
  const title = "IT вакансії в Україні та віддалено — A1 Jobs";
  const description =
    "Актуальні IT-вакансії в Україні та віддалена робота з усього світу: розробка, QA, дизайн, дані, продукт. Відгукуйтесь напряму. Оновлюється щодня.";

  return {
    title,
    description,
    // Filtered/search views are noindex with a canonical back to the clean
    // feed URL (PLAN.md §3.1) — search-result-shaped pages shouldn't carry
    // JobPosting-adjacent signals into the index.
    // 2026-09-10: each page beyond the first now canonicalizes to
    // ITSELF, not back to page 1 -- unlike a duplicate/tracking-param
    // URL, page 2's posts genuinely aren't on page 1, so collapsing the
    // canonical there would tell Google not to index them.
    alternates: { canonical: page > 1 ? `${SITE_URL}/?page=${page}` : SITE_URL },
    robots: filtered ? { index: false, follow: true } : undefined,
    // og:image comes from the sibling app/opengraph-image.tsx file
    // convention — Next merges it in automatically, no `images` needed
    // here (added 2026-08-28 alongside metadataBase in app/layout.tsx).
    openGraph: { title, description, url: SITE_URL, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

async function FeedList({
  params,
  filters,
  page,
  inUkraine,
}: {
  params: URLSearchParams;
  filters: ReturnType<typeof parseFeedFilters>;
  page: number;
  inUkraine: boolean;
}) {
  const { posts, hasMore, total } = await fetchFeedPage("hiring", pageToCursor(page), filters);
  const totalPages = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
  // Real per-avatar blur (lib/avatar-blur.ts) instead of the generic
  // shared shimmer — see that file's comment for why this lives here
  // rather than inside PostCard itself.
  const avatarBlurs = await Promise.all(posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));

  return posts.length === 0 ? (
      <EmptyState
        message={
          hasActiveFilters(filters) ? (
            <T uk="Нічого не знайшлося. Спробуйте змінити фільтри." en="Nothing found. Try changing the filters." ru="Ничего не нашлось. Попробуйте изменить фильтры." de="Nichts gefunden. Versuchen Sie, die Filter zu ändern." es="No se encontró nada. Prueba a cambiar los filtros." fr="Aucun résultat. Essayez de modifier les filtres." pl="Nic nie znaleziono. Spróbuj zmienić filtry." ptBR="Nada encontrado. Tente alterar os filtros." zh="未找到结果，请尝试更改筛选条件。" />
          ) : (
            <T uk="Поки немає відкритих вакансій." en="There are no open jobs yet." ru="Пока нет открытых вакансий." de="Es gibt noch keine offenen Stellenangebote." es="Todavía no hay vacantes abiertas." fr="Il n'y a pas encore d'offres d'emploi ouvertes." pl="Nie ma jeszcze żadnych otwartych ofert pracy." ptBR="Ainda não há vagas abertas." zh="目前还没有开放的职位。" />
          )
        }
      />
  ) : (
      <>
        <ul className="flex flex-col gap-4">
          {posts.map((post, i) => (
            <li key={post.id}>
              <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} highlightQuery={filters.q} showReservation={inUkraine} />
            </li>
          ))}
        </ul>
        <Pagination basePath="/" params={params} page={page} hasMore={hasMore} totalPages={totalPages} />
      </>
  );
}

export default async function HomePage({ searchParams }: Props) {
  const params = toURLSearchParams(await searchParams);
  const filters = parseFeedFilters(params);
  const page = parsePageParam(params);
  const currentCategory = filters.categories?.[0];
  // Слаги для чипов берём из адреса напрямую: parseFeedFilters отдаёт
  // канонические имена ("Go"), а чипы живут по слагам ("golang").
  const selectedStack = params.getAll("stack").filter((slug) => TECH_CATALOG.some((item) => item.slug === slug));
  // Ряд стека появляется только внутри категории IT (Александр, 2026-09-20).
  // fetchCategories обёрнут в React cache(), так что это тот же ответ, который
  // всё равно берёт <Filters> ниже -- лишнего запроса не возникает.
  const showStack = currentCategory != null && currentCategory === itCategoryValue(await fetchCategories());
  // «Бронювання» актуально только для украинцев: вне Украины чип и плашку прячем.
  const inUkraine = !filters.country || filters.country === DEFAULT_COUNTRY_CODE;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 sm:pt-16 pb-fab-safe">
      {/* 2026-09-15: Organization + WebSite. Описание сайта самого себя,
          которого до сих пор не было ни на одной странице. Только на
          главной -- это разметка про весь сайт, а не про страницу, и
          дублировать её на каждой вакансии не нужно. */}
      {buildSiteJsonLd().map((jsonLd) => (
        // eslint-disable-next-line react/no-danger
        <script key={String(jsonLd["@id"])} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ))}

      {/* Aleksandr, 2026-08-27: hide this heading block on mobile and
          pull the feed up — the tab bar in the nav already says which
          feed you're on, so on a small screen this was just dead space
          above the filters/cards. Desktop keeps it. */}
      <header className="mb-8 hidden sm:block">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellenangebote" es="Vacantes" fr="Offres d'emploi" pl="Oferty pracy" ptBR="Vagas" zh="职位" />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <T uk="Знаходьте найкращу роботу якомога швидше" en="Find the best job as fast as possible" ru="Находите лучшую работу как можно быстрее" de="Finden Sie den besten Job so schnell wie möglich" es="Encuentra el mejor trabajo lo más rápido posible" fr="Trouvez le meilleur emploi le plus rapidement possible" pl="Znajdź najlepszą pracę jak najszybciej" ptBR="Encontre o melhor emprego o mais rápido possível" zh="尽快找到最好的工作" />
        </p>
      </header>

      {/* 2026-09-14: ссылки на посадочные по формату работы.
          Без них страницы /jobs/remote, /jobs/office и /jobs/hybrid
          существуют только в карте сайта -- а карта говорит роботу «вот
          адрес», тогда как ссылка ещё и передаёт вес. Настоящие <Link>,
          а не кнопки фильтра: фильтры у нас меняют адрес через
          router.replace, и по ним робот пройти не может (и не должен --
          отфильтрованные выдачи закрыты от индексации).
          Видны и на телефоне, в отличие от заголовка выше. */}
      {/* 25.09.2026 (Александр, скриншот ленты на телефоне: «Помять эти
          теги в 2 ряда, и чтобы их можно было скроллить и они уходили за
          экран... при скролле должны двигаться 2 ряда одновременно,
          одинаково»).

          БЫЛО: flex-wrap. Шесть чипов на телефоне переносились в ТРИ
          ряда и занимали пол-экрана над лентой.

          СТАЛО: на телефоне это одна горизонтальная лента из двух рядов.
          Оба ряда лежат в ОДНОМ прокручиваемом контейнере и едут вместе,
          а не каждый сам по себе (в этом и была просьба). w-max -- лента
          ровно по содержимому, поэтому чипы честно уходят за правый край,
          а -mx-4 гасит px-4 у <main>, чтобы лента шла от края до края
          экрана.

          Раскладка чисто на CSS, без единого замера в браузере -- она
          верная с ПЕРВОЙ отрисовки и не перескакивает с трёх рядов на
          два уже после загрузки (Александр: «чтобы грузились сразу
          нормально, не на 3 ряда»).

          На sm и шире всё как было -- обычный flex-wrap, там чипы и так
          помещаются в один ряд. */}
      <nav
        aria-label="job formats"
        className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
      {/* 25.09.2026, вторая правка (Александр, скриншот с обведёнными
          пустотами справа от «Робота в офісі» и «Без досвіду»: «не надо
          делать одинаковую ширину... делай просто нормальный пэддинг,
          такой же, как с левой стороны»). Первый заход был на CSS-сетке,
          а сетка тянет столбец по САМОМУ ШИРОКОМУ чипу в нём и растягивает
          под него остальные — поэтому короткий чип получал справа лишний
          воздух, которого нет слева. Теперь два обычных ряда flex: каждый
          чип ровно по своему тексту, отступы между всеми одинаковые.
          Ряды по-прежнему лежат в ОДНОМ прокручиваемом контейнере, значит
          едут вместе — это требование никуда не делось.
          Ряд сверху — формат работы, снизу — признаки вакансии.
          sm:contents на рядах: на планшете и шире они перестают быть
          контейнерами, чипы становятся детьми обёртки и она раскладывает
          их одной строкой с переносом, как было до всей этой правки. */}
      {/* 30.09.2026 (Александр, скриншот: на Британии «Бронювання» нет, второй ряд
          укоротился и справа образовалась дырка, а в первом чипы уходят за
          край экрана: «почему бы не заполнить другим тегом»).

          Теперь чипы не привязаны к рядам заранее: собираем один список,
          прикидываем ширину каждого по длине подписи и раскладываем по двум
          рядам жадно -- следующий чип идёт в тот ряд, который пока короче.
          Так ряды почти равны при любом наборе чипов (с бронюванням и без).
          Раскладка считается на сервере, поэтому она верная с первой
          отрисовки и ничего не прыгает.

          Порядок на планшете и шире сохраняем исходным: там ряды
          sm:contents, а каждому чипу задан order из CSS-переменной. */}
      <div className="flex w-max flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
        {(() => {
          const chips: { key: string; href: string; label: Record<Locale, string> }[] = [
            { key: "top100", href: withCountry(`/jobs/${TOP100_LANDING.slug}`, filters.country), label: TOP100_LANDING.h1 },
            ...JOB_LANDINGS.map((l) => ({ key: l.slug, href: withCountry(`/jobs/${l.slug}`, filters.country), label: l.h1 })),
            ...FACT_LANDINGS.filter((l) => inUkraine || l.slug !== "reservation").map((l) => ({
              key: l.slug,
              href: withCountry(`/jobs/tag/${l.slug}`, filters.country),
              label: l.chip,
            })),
          ];
          type Placed = { chip: (typeof chips)[number]; idx: number };
          const rowA: Placed[] = [];
          const rowB: Placed[] = [];
          const widths = [0, 0];
          chips.forEach((chip, idx) => {
            const w = (chip.label.uk ?? chip.label.en ?? "").length + 4; // +4 -- поля чипа
            const toB = (widths[1] ?? 0) < (widths[0] ?? 0);
            (toB ? rowB : rowA).push({ chip, idx });
            widths[toB ? 1 : 0] = (widths[toB ? 1 : 0] ?? 0) + w;
          });
          return [rowA, rowB].map((row, ri) => (
            <div key={ri} className="flex gap-2 sm:contents">
              {row.map(({ chip, idx }) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  style={{ "--o": idx } as CSSProperties}
                  className="whitespace-nowrap rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent sm:[order:var(--o)] dark:border-neutral-800 dark:text-neutral-400"
                >
                  <T {...chip.label} />
                </Link>
              ))}
            </div>
          ));
        })()}
      </div>
      </nav>

      {/* 2026-09-20: ряд чипов со стеком, виден только в категории IT. Не
          ссылки, а переключатели --
          почему так и почему отдельным рядом, см. шапку
          components/stack-picker.tsx. Выдача со стеком закрыта от
          индексации тем же правилом, что и любая отфильтрованная
          (hasActiveFilters выше), поэтому веса эти кнопки не теряют --
          вес по стеку носят посадочные /jobs/stack/<slug>. */}
      {showStack ? <StackPicker basePath="/" selected={selectedStack} variant="row" /> : null}

      <Filters
        kind="hiring"
        basePath="/"
        currentQuery={filters.q}
        currentCategory={currentCategory}
        currentTags={filters.tags ?? []}
        currentLocation={filters.location}
        currentLocationLabel={filters.locationLabel}
        currentStack={selectedStack}
        currentCountry={filters.country}
      />

      {/* 30.09.2026 (Александр: «очень долго грузится лента при смене
          страны, а лоадер сверху не такой, как везде»). Список вакансий
          вынесен в собственный асинхронный компонент под <Suspense>:
          шапка, чипы и фильтры отдаются сразу, а вместо карточек --
          тот же скелетон, что на остальных страницах. key -- адрес
          выдачи: смена страны/фильтра/страницы пересоздаёт границу и
          снова показывает скелетон, а не держит старую ленту. */}
      <Suspense key={params.toString()} fallback={<FeedSkeleton />}>
        <FeedList params={params} filters={filters} page={page} inUkraine={inUkraine} />
      </Suspense>

      {/* 10.10.2026 (Александр: «где можно увидеть витрины?»). До сих пор с
          главной не вело НИ ОДНОЙ ссылки на посадочные страницы -- ни для
          человека, ни для робота. Одна строка внизу ленты ведёт в каталог,
          а уже оттуда -- во все три тысячи. */}
      <div className="mt-10 border-t border-neutral-100 pt-6 text-center dark:border-neutral-800">
        <Link
          href="/jobs/catalog"
          className="text-sm text-neutral-500 no-underline transition hover:text-accent dark:text-neutral-400"
        >
          <T
            uk="Каталог вакансій: за професією, стеком, містом і країною →"
            en="Job catalog: by role, stack, city and country →"
            ru="Каталог вакансий: по профессии, стеку, городу и стране →"
            de="Job-Katalog: nach Rolle, Stack, Stadt und Land →"
            es="Catálogo: por puesto, stack, ciudad y país →"
            fr="Catalogue : par métier, stack, ville et pays →"
            pl="Katalog ofert: wg stanowiska, stacku, miasta i kraju →"
            ptBR="Catálogo: por função, stack, cidade e país →"
            zh="职位目录：按职位、技术栈、城市和国家 →"
          />
        </Link>
      </div>
    </main>
  );
}

// lib/a1/related.ts
//
// 2026-09-14 (Александр, SEO-разбор). Страница вакансии была тупиком: на
// всю страницу ровно ПЯТЬ ссылок -- логотип, две вкладки навигации и
// дважды профиль автора. Робот приходил из карты сайта и упирался в
// стену, а человек, попавший на протухшую вакансию, видел плашку
// «неактивна» и уходил.
//
// Этот модуль собирает то, что показывается внизу страницы вакансии:
// другие вакансии той же компании и похожие по смыслу. Три причины, и
// каждая сама по себе оправдывает работу:
//
//   1. Свой контент. Текст вакансии у нас чужой -- он приезжает с DOU.
//      Заголовки, компании и города восьми соседних вакансий -- это
//      наше, и такого набора нет больше нигде. Ссылку на первоисточник
//      Александр ставить не хочет (2026-09-14: «если мы будем ссылаться
//      на DOU, это полная сразу будет лажа»), так что перестать быть
//      копией можно только так -- сделав страницу содержательнее
//      оригинала, а не другой.
//   2. Обход. С каждой страницы у робота появляется ещё восемь адресов.
//      При 1790 страницах это разница между «обойдёт за месяцы» и
//      «обойдёт за недели».
//   3. Люди. Вакансия живёт 60 дней. Пришедшему на мёртвую сейчас
//      некуда идти, кроме как назад в поиск.
//
// Подбор намеренно тупой и предсказуемый, без всякого умного ранжирования:
// сначала та же компания, потом совпадение по тегам, потом по категории,
// и если всё равно не набралось -- просто свежие вакансии. Каждый шаг --
// один обычный запрос тем же posts.search, что питает ленту.

import { fetchFeedPage, fetchPostsByAuthor } from "./feed";
import type { WebPost } from "@/types/web-post";

export const SAME_COMPANY_LIMIT = 3;
export const SIMILAR_LIMIT = 6;

export type RelatedJobs = {
  /** Другие вакансии того же автора. Может быть пусто. */
  sameCompany: WebPost[];
  /** Похожие по тегам/категории, добитые свежими. Может быть пусто. */
  similar: WebPost[];
};

const EMPTY: RelatedJobs = { sameCompany: [], similar: [] };

/** Только живые чужие вакансии: не сам пост и не «шукаю роботу». */
function usable(post: WebPost, currentId: string, taken: Set<string>): boolean {
  return post.kind === "hiring" && post.id !== currentId && !taken.has(post.id);
}

export async function fetchRelatedJobs(post: WebPost): Promise<RelatedJobs> {
  if (post.kind !== "hiring") return EMPTY;

  const authorId = post.author.userId;
  const tags = post.tags.slice(0, 3);
  const categories = post.categories.slice(0, 2).map((c) => c.id);

  // Три запроса параллельно, а не по цепочке: страница всё равно ждёт
  // самый медленный из них, а последовательно ждала бы сумму.
  //
  // Каждый обёрнут в собственный catch: подборка внизу страницы не
  // стоит того, чтобы из-за неё падала сама вакансия. Упавший источник
  // просто ничего не даёт.
  const [byAuthor, byTags, fresh] = await Promise.all([
    authorId ? fetchPostsByAuthor(authorId, SAME_COMPANY_LIMIT + 4).catch(() => []) : Promise.resolve([]),
    tags.length > 0 || categories.length > 0
      ? fetchFeedPage("hiring", null, {
          ...(tags.length > 0 ? { tags } : {}),
          ...(categories.length > 0 ? { categories } : {}),
        })
          .then((p) => p.posts)
          .catch(() => [])
      : Promise.resolve([]),
    fetchFeedPage("hiring")
      .then((p) => p.posts)
      .catch(() => []),
  ]);

  const taken = new Set<string>([post.id]);

  const sameCompany: WebPost[] = [];
  for (const candidate of byAuthor) {
    if (sameCompany.length >= SAME_COMPANY_LIMIT) break;
    if (!usable(candidate, post.id, taken)) continue;
    taken.add(candidate.id);
    sameCompany.push(candidate);
  }

  // Порядок источников и есть весь «алгоритм»: сперва то, что реально
  // похоже, свежие -- только чтобы блок не оказался полупустым на
  // вакансии без тегов и категории.
  const similar: WebPost[] = [];
  for (const source of [byTags, fresh]) {
    for (const candidate of source) {
      if (similar.length >= SIMILAR_LIMIT) break;
      if (!usable(candidate, post.id, taken)) continue;
      taken.add(candidate.id);
      similar.push(candidate);
    }
  }

  return { sameCompany, similar };
}

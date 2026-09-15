// lib/seo/job-meta.ts
//
// Описание вакансии для поисковой выдачи (meta description).
//
// 2026-09-15, Александр: «а ты тексты подправил, чтобы контент был более
// уникальным?».
//
// Сам текст вакансии переписывать мы сознательно не стали: он приходит
// от источника, и любая его переработка -- это риск переврать
// требование или цифру в зарплате, то есть подсунуть соискателю не ту
// вакансию. Цена ошибки несопоставима с выигрышем.
//
// А вот описание в выдаче переписать и можно, и нужно. До этой правки
// оно было первыми 155 символами того же чужого текста -- то есть ровно
// тот же сниппет, что у источника, слово в слово. Это единственный наш
// текст, который человек читает ДО перехода на сайт, и он был не наш.
//
// Теперь оно собирается из полей, которые у нас уже есть: формат
// работы, должность, компания, город, вилка. Соврать такое описание
// физически не может -- оно не пересказывает текст, а перечисляет
// данные. И оно всегда разное у разных вакансий.
//
// Украинский, без девяти локалей: <html lang="uk"> и мета-теги -- это
// одна строка на страницу, а не переключаемые спаны (см. components/
// t.tsx про то, почему в вёрстке все девять языков живут рядом).

import type { WebPost } from "@/types/web-post";
import { formatSalary, truncateAtWordBoundary } from "@/lib/format";

const MAX_LENGTH = 155;

// Ярлыки формата работы -- те же теги, что и в lib/seo/jsonld.ts
// (TAG_TO_EMPLOYMENT_TYPE) и lib/seo/job-landings.ts. «no-site» -- это
// именно офис (на бэкенде так называется On-site), а не опечатка.
const FORMAT_PREFIX: Record<string, string> = {
  remote: "Віддалена вакансія",
  "no-site": "Вакансія в офісі",
  hybrid: "Гібридна вакансія",
};

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function formatPrefix(post: WebPost): string {
  for (const tag of post.tags) {
    const prefix = FORMAT_PREFIX[normalizeTag(tag)];
    if (prefix) return prefix;
  }
  return post.isRemote ? "Віддалена вакансія" : "Вакансія";
}

/**
 * Описание для выдачи. Никогда не пустое: если у вакансии нет ни
 * компании, ни города, ни зарплаты, остаётся «Вакансія {должность}» --
 * этого уже достаточно, чтобы описание не совпадало с чужим сниппетом,
 * но в этом случае к нему добавляется кусок самого текста, иначе оно
 * выйдет слишком коротким и бесполезным для человека.
 */
export function buildJobMetaDescription(post: WebPost): string {
  const title = post.title.replace(/\s+/g, " ").trim();

  let lead = `${formatPrefix(post)}: ${title}`;

  // Анонимный автор именем не представляется -- у него в name стоит
  // заглушка, и «в Анонім» читалось бы как название компании.
  if (!post.author.isAnonymous && post.author.name.trim()) {
    lead += ` в ${post.author.name.trim()}`;
  }

  const sentences: string[] = [lead + "."];

  const city = post.location?.city?.trim();
  if (city) sentences.push(`${city}.`);

  const salary = post.salary ? formatSalary(post.salary, "uk") : "";
  if (salary) sentences.push(`${salary}.`);

  let description = sentences.join(" ");

  // Коротко и не из чего дособрать -- добираем началом самого текста.
  // Тут дубль с источником не страшен: он идёт ПОСЛЕ нашей части, и
  // описание целиком всё равно уникально.
  if (description.length < 90) {
    const body = post.contentText.replace(/\s+/g, " ").trim();
    if (body) description = `${description} ${body}`;
  } else {
    description = `${description} Відгукнутися — в A1 Jobs.`;
  }

  // Обрезка по слову легко оставляет висящий хвост вроде «Вимоги:» --
  // в выдаче это читается как оборванная строка. Снимаем любую
  // открывающую/перечисляющую пунктуацию с конца.
  return truncateAtWordBoundary(description, MAX_LENGTH).replace(/[\s:;,\-–—(«"'']+$/u, "");
}

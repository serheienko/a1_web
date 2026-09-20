// lib/a1/company-claim.ts
//
// БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ. 2026-09-20 эти правила переехали в бэкенд:
// apps/api-server-modern/src/services/user-service/methods/_companyClaimRules.ts
// (метод auth.claimRequest). Сайт и приложение зовут теперь один и тот же
// метод, а этот файл оставлен только как след переезда — править его
// бессмысленно, правки ни на что не повлияют. Настоящее место правил —
// в бэкенде.
//
// 2026-09-19 (Александр: «я компания, увидел своё объявление под не своим
// профилем — как мне его забрать?»). Привратник самостоятельного клейма.
//
// Передачу аккаунта бэкенд уже умеет целиком: auth.claimStart минтит
// ссылку, auth.claimVerifyEmail шлёт код, auth.claimConfirm переносит
// аккаунт (app/api/claim/*, app/api/admin/claim-link). Чего он не делает
// и делать не должен — это решать, КОМУ выдать ссылку: claimStart
// выдаёт её любому, кто залогинен под тем самым аккаунтом, то есть нам.
//
// Значит весь вопрос самообслуживания сводится к одному: чем незнакомый
// человек доказал, что он и есть эта компания. Здесь — правило.
//
// Мы не проверяем «почту заявителя» саму по себе. Мы сверяем её с тем,
// что компания УЖЕ опубликовала о себе и что мы забрали вместе с
// вакансией:
//
//   способ Б — адрес на домене сайта компании. Ссылки на свои ресурсы
//     лежат и в самой вакансии (build_companies.py::extract_company_links
//     кладёт до трёх в Post.links), и в профиле (companies[].link,
//     links[] — их проставлял bulk_provision). Домен сайта есть почти у
//     каждой компании, поэтому это основной путь.
//
//   способ А — адрес, напечатанный в тексте самого объявления. Пусть
//     это хоть gmail: его выбрала и опубликовала компания, а не
//     заявитель. Компанию без корпоративной почты пускает именно он.
//     На DOU встречается редко (площадка гонит отклики через свою
//     форму), но на других источниках будет встречаться чаще.
//
// Чего здесь НЕТ: третьего способа — токена, который компания вставляет
// в своё объявление на DOU и который читает парсер. Ему нужно хранилище
// выданных токенов, это отдельный заход.
//
// Server-only: решение о доступе не должно быть видно и тем более
// вычислимо в браузере.

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/company-claim] imported from the browser — this must stay server-only");
}

/**
 * Домены, на которых заводят личную почту. Сайт компании не может ими
 * быть, и если такой домен вдруг попал в ссылки вакансии (рекрутер
 * оставил gmail ссылкой), пускать по нему нельзя — иначе любой
 * владелец ящика на gmail заберёт любую компанию.
 */
const PERSONAL_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "ukr.net", "meta.ua", "i.ua", "bigmir.net",
  "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me",
  "gmx.com", "gmx.net", "aol.com", "zoho.com", "mail.com", "email.ua",
  "yandex.ru", "yandex.ua", "ya.ru", "mail.ru", "inbox.ru", "list.ru",
  "bk.ru", "rambler.ru", "tutanota.com", "fastmail.com", "hey.com",
]);

/**
 * Хосты, которые есть у всех и потому ничего не доказывают: соцсети,
 * доски, формы, репозитории. Ссылка на linkedin.com/company/foo стоит у
 * тысяч компаний, и адрес вида hr@linkedin.com к нашей компании
 * отношения не имеет.
 */
const SHARED_PLATFORM_HOSTS = new Set([
  "linkedin.com", "facebook.com", "fb.com", "instagram.com", "twitter.com",
  "x.com", "t.me", "telegram.me", "telegram.org", "youtube.com", "youtu.be",
  "tiktok.com", "medium.com", "notion.so", "notion.site", "calendly.com",
  "github.com", "gitlab.com", "docs.google.com", "drive.google.com",
  "forms.gle", "forms.office.com", "airtable.com", "typeform.com",
  "dou.ua", "jobs.dou.ua", "djinni.co", "work.ua", "robota.ua", "rabota.ua",
  "glassdoor.com", "clutch.co", "upwork.com", "indeed.com", "bit.ly",
  "a1appp.com", "jobs.a1appp.com",
]);

/** Хост из URL, без www и порта, в нижнем регистре. Null — если это не URL. */
export function hostOf(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let host: string;
  try {
    host = new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  return bare.includes(".") ? bare : null;
}

function isUsableCompanyHost(host: string): boolean {
  if (PERSONAL_MAIL_DOMAINS.has(host)) return false;
  if (SHARED_PLATFORM_HOSTS.has(host)) return false;
  // Поддомен общей платформы — тоже платформа: careers.linkedin.com.
  for (const shared of SHARED_PLATFORM_HOSTS) {
    if (host.endsWith(`.${shared}`)) return false;
  }
  return true;
}

/**
 * Считаем ли, что адрес на домене `emailHost` принадлежит владельцу
 * сайта `siteHost`.
 *
 * Совпадение в обе стороны, потому что в жизни встречаются оба перекоса:
 * сайт careers.cyklum.com при почте @cyklum.com и сайт cyklum.com при
 * почте @mail.cyklum.com. Без общего суффикса — не пускаем: shopify.com
 * и myshopify.com разные конторы.
 */
function hostsBelongTogether(emailHost: string, siteHost: string): boolean {
  if (!isUsableCompanyHost(siteHost)) return false;
  if (emailHost === siteHost) return true;
  return emailHost.endsWith(`.${siteHost}`) || siteHost.endsWith(`.${emailHost}`);
}

export type LinkLike = { url: string };
export type CompanyLike = { link: { url: string } | null };

/**
 * Все домены, которые компания показала как свои: из ссылок вакансии и
 * из профиля. Мусор и общие платформы отсеяны, дубли убраны.
 */
export function companyDomains(input: {
  postLinks?: readonly LinkLike[];
  profileLinks?: readonly LinkLike[];
  profileCompanies?: readonly CompanyLike[];
}): string[] {
  const out = new Set<string>();
  const add = (url: string | undefined | null) => {
    if (!url) return;
    const host = hostOf(url);
    if (host && isUsableCompanyHost(host)) out.add(host);
  };

  for (const link of input.postLinks ?? []) add(link.url);
  for (const link of input.profileLinks ?? []) add(link.url);
  for (const company of input.profileCompanies ?? []) add(company.link?.url);

  return [...out];
}

// Намеренно проще, чем RFC: адрес из текста объявления, а не из формы.
// Хвостовая точка/скобка отрезаются — в описаниях адрес часто стоит в
// конце предложения.
const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Адреса, напечатанные в тексте объявления. Наши собственные и адреса
 * площадок выкинуты: claimcompanies+... — это мы сами, а support@dou.ua
 * к компании отношения не имеет.
 */
export function publishedContacts(text: string): string[] {
  const out = new Set<string>();
  for (const match of text.matchAll(EMAIL_IN_TEXT)) {
    const address = match[0].toLowerCase().replace(/[.,;)\]]+$/, "");
    const host = address.split("@")[1];
    if (!host) continue;
    if (host === "a1appp.com" || host.endsWith(".a1appp.com")) continue;
    if (SHARED_PLATFORM_HOSTS.has(host)) continue;
    out.add(address);
  }
  return [...out];
}

export type ClaimVerdict =
  | { allowed: true; via: "domain" | "published-contact" }
  | { allowed: false; reason: "needs_other_proof"; domains: string[]; hasPublishedContact: boolean };

/**
 * Пускаем ли этот адрес забирать этот профиль.
 *
 * Возврат «нет» — не отказ навсегда: это значит только, что двух
 * автоматических способов не хватило и дальше нужен третий (токен) или
 * руки. Поэтому в отказе едут подсказки, по которым экран объяснит
 * человеку, что от него хотят: какие домены мы считаем домашними и есть
 * ли вообще в объявлении опубликованный адрес.
 */
export function decideClaim(input: {
  email: string;
  domains: readonly string[];
  contacts: readonly string[];
}): ClaimVerdict {
  const email = input.email.trim().toLowerCase();
  const emailHost = email.split("@")[1];
  if (!emailHost) {
    return { allowed: false, reason: "needs_other_proof", domains: [...input.domains], hasPublishedContact: input.contacts.length > 0 };
  }

  if (input.contacts.some((contact) => contact === email)) {
    return { allowed: true, via: "published-contact" };
  }

  if (input.domains.some((site) => hostsBelongTogether(emailHost, site))) {
    return { allowed: true, via: "domain" };
  }

  return {
    allowed: false,
    reason: "needs_other_proof",
    domains: [...input.domains],
    hasPublishedContact: input.contacts.length > 0,
  };
}

/**
 * Маска опубликованного адреса для экрана: человеку показываем, КУДА
 * уйдёт код, но не сам адрес — иначе мы бы своими руками выдали
 * контакт компании любому, кто нажал кнопку.
 */
export function maskEmail(address: string): string {
  const [local, host] = address.split("@");
  if (!local || !host) return "…";
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(3, local.length - 1))}@${host}`;
}

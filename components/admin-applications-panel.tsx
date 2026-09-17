// components/admin-applications-panel.tsx
//
// 2026-09-11 (Aleksandr: "Я сам рандомно откликнусь и хочу посмотреть
// что отклик пришел"). The list behind /admin/applications: every chat
// any imported company account has, i.e. every application anybody has
// sent — see lib/a1/admin-applications.ts for why a chat IS an
// application here, and components/post-viewer-menu.tsx's applyMessage
// comment for the send that had to be fixed before any of this could
// show anything.
//
// Structure copies components/admin-posts-panel.tsx (same account-paged
// fetch, same client-side search over what's already loaded) — read
// that file's header for why the pagination exists at all. One
// deliberate difference: that panel only loads the next page when you
// scroll to the bottom, because it has ~500 accounts' worth of posts to
// show and loading them all up front was wasteful. Here the opposite is
// true — almost every account has NO chats at all, so page after page
// adds nothing to the list, and scrolling through nothing to reach the
// one company that got an application would be absurd. This panel
// therefore keeps fetching pages by itself until every account has been
// checked, showing "checked X/Y accounts" while it goes. Leaving the
// page cancels the run (the runIdRef guard below).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminNav, useAdminLocale } from "@/components/admin-nav";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { ClaimLinkButton, ClaimLinkDetails, useClaimLink } from "@/components/admin-claim-link";

type ApplicationMessage = { id: string; text: string; kind: string; dateMs: number; fromCompany: boolean };
type Application = {
  chatId: string;
  companyName: string;
  companyEmail: string;
  applicantId: string | null;
  applicantName: string;
  applicantUsername: string | null;
  lastMessageAtMs: number;
  messageCount: number;
  messages: ApplicationMessage[];
};

type StringKey =
  | "title" | "signedInAs" | "totalCount" | "loadingMore" | "searchPlaceholder"
  | "empty" | "noMatches" | "loadError" | "unknownApplicant"
  | "noText" | "fromCompany" | "refresh" | "groupCount";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Відгуки", en: "Applications", ru: "Отклики", de: "Bewerbungen", es: "Candidaturas", fr: "Candidatures", pl: "Aplikacje", ptBR: "Candidaturas", zh: "申请" },
  signedInAs: { uk: "Обліковий запис", en: "Signed in as", ru: "Аккаунт", de: "Angemeldet als", es: "Sesión iniciada como", fr: "Connecté en tant que", pl: "Zalogowano jako", ptBR: "Conectado como", zh: "已登录" },
  totalCount: { uk: "Знайдено відгуків: {n}", en: "Applications found: {n}", ru: "Найдено откликов: {n}", de: "Gefundene Bewerbungen: {n}", es: "Candidaturas encontradas: {n}", fr: "Candidatures trouvées : {n}", pl: "Znaleziono aplikacji: {n}", ptBR: "Candidaturas encontradas: {n}", zh: "找到 {n} 份申请" },
  loadingMore: { uk: "Перевіряю акаунти: {loaded}/{total}…", en: "Checking accounts: {loaded}/{total}…", ru: "Проверяю аккаунты: {loaded}/{total}…", de: "Konten werden geprüft: {loaded}/{total}…", es: "Revisando cuentas: {loaded}/{total}…", fr: "Vérification des comptes : {loaded}/{total}…", pl: "Sprawdzam konta: {loaded}/{total}…", ptBR: "Verificando contas: {loaded}/{total}…", zh: "正在检查账号：{loaded}/{total}…" },
  searchPlaceholder: { uk: "Пошук за компанією, іменем або текстом…", en: "Search by company, name or text…", ru: "Поиск по компании, имени или тексту…", de: "Suche nach Unternehmen, Name oder Text…", es: "Buscar por empresa, nombre o texto…", fr: "Rechercher par entreprise, nom ou texte…", pl: "Szukaj po firmie, nazwisku lub treści…", ptBR: "Buscar por empresa, nome ou texto…", zh: "按公司、姓名或内容搜索…" },
  empty: { uk: "Поки що жодного відгуку", en: "No applications yet", ru: "Пока ни одного отклика", de: "Noch keine Bewerbungen", es: "Aún no hay candidaturas", fr: "Aucune candidature pour l'instant", pl: "Jeszcze brak aplikacji", ptBR: "Ainda não há candidaturas", zh: "还没有申请" },
  noMatches: { uk: "Нічого не знайдено", en: "Nothing found", ru: "Ничего не найдено", de: "Nichts gefunden", es: "No se encontró nada", fr: "Rien trouvé", pl: "Nic nie znaleziono", ptBR: "Nada encontrado", zh: "未找到任何内容" },
  loadError: { uk: "Не вдалося завантажити відгуки", en: "Couldn't load applications", ru: "Не удалось загрузить отклики", de: "Bewerbungen konnten nicht geladen werden", es: "No se pudieron cargar las candidaturas", fr: "Impossible de charger les candidatures", pl: "Nie udało się wczytać aplikacji", ptBR: "Não foi possível carregar as candidaturas", zh: "无法加载申请" },
  unknownApplicant: { uk: "Невідомий користувач", en: "Unknown user", ru: "Неизвестный пользователь", de: "Unbekannter Nutzer", es: "Usuario desconocido", fr: "Utilisateur inconnu", pl: "Nieznany użytkownik", ptBR: "Usuário desconhecido", zh: "未知用户" },
  noText: { uk: "(без тексту)", en: "(no text)", ru: "(без текста)", de: "(kein Text)", es: "(sin texto)", fr: "(sans texte)", pl: "(bez tekstu)", ptBR: "(sem texto)", zh: "（无文本）" },
  fromCompany: { uk: "Від компанії", en: "From the company", ru: "От компании", de: "Vom Unternehmen", es: "De la empresa", fr: "De l'entreprise", pl: "Od firmy", ptBR: "Da empresa", zh: "来自公司" },
  groupCount: { uk: "відгуків: {n}", en: "applications: {n}", ru: "откликов: {n}", de: "Bewerbungen: {n}", es: "candidaturas: {n}", fr: "candidatures : {n}", pl: "aplikacji: {n}", ptBR: "candidaturas: {n}", zh: "申请：{n}" },
  refresh: { uk: "Оновити", en: "Refresh", ru: "Обновить", de: "Aktualisieren", es: "Actualizar", fr: "Actualiser", pl: "Odśwież", ptBR: "Atualizar", zh: "刷新" },
};

function t(key: StringKey, lang: Locale, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

function formatWhen(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

// Matches DEFAULT_PAGE_SIZE in app/api/admin/applications/route.ts.
// One account with no chats costs two backend calls (login +
// chats.getChats), so a page of 40 stays comfortably inside that
// route's own 60s maxDuration even at its CONCURRENCY cap.
const ACCOUNT_PAGE_SIZE = 40;

type ApplicationsPage = { applications: Application[]; total: number; nextOffset: number | null; hasMore: boolean };

async function fetchPage(offset: number, refresh: boolean): Promise<ApplicationsPage> {
  const res = await authFetch(
    `/api/admin/applications?offset=${offset}&limit=${ACCOUNT_PAGE_SIZE}${refresh ? "&refresh=1" : ""}`,
  );
  const data = await res.json();
  if (!data.ok) throw new Error("not ok");
  return {
    applications: data.applications ?? [],
    total: data.total ?? 0,
    nextOffset: data.nextOffset ?? null,
    hasMore: Boolean(data.hasMore) && data.nextOffset !== null && data.nextOffset !== undefined,
  };
}

function dedupe(items: Application[]): Application[] {
  const seen = new Map<string, Application>();
  for (const item of items) seen.set(`${item.companyEmail}:${item.chatId}`, item);
  return Array.from(seen.values());
}

export function AdminApplicationsPanel({ signedInAs }: { signedInAs: string }) {
  const lang = useAdminLocale();
  const [items, setItems] = useState<Application[] | null>(null);
  const [totalAccounts, setTotalAccounts] = useState<number | null>(null);
  const [loadedAccounts, setLoadedAccounts] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  // Bumped on every (re)start and on unmount — an in-flight run whose id
  // no longer matches drops its results instead of writing them into a
  // newer run's state.
  const runIdRef = useRef(0);

  // Сколько страниц аккаунтов тянуть одновременно. Было строго по
  // одной, и обход всех ~525 аккаунтов занимал минуты (2026-09-17,
  // Александр: «чтобы найти отзывы, он как-то тоже очень дико долго
  // грузит»). Три -- потому что каждая страница на сервере и так
  // разворачивается в пачку параллельных входов, и больше значило бы
  // бить по бэкенду втрое сильнее ради всё той же очереди.
  const PAGE_CONCURRENCY = 3;

  // Обходит все страницы аккаунтов, дописывая найденное по ходу.
  async function scanAll(refresh = false) {
    const runId = ++runIdRef.current;
    setError(false);
    setItems(null);
    setLoadedAccounts(0);
    setTotalAccounts(null);
    setScanning(true);
    try {
      let acc: Application[] = [];
      // Первая страница отдельно: из неё узнаём, сколько всего
      // аккаунтов, и дальше уже знаем все смещения наперёд -- можно не
      // ждать каждую страницу, чтобы узнать следующую.
      const first = await fetchPage(0, refresh);
      if (runIdRef.current !== runId) return;
      acc = dedupe(first.applications);
      acc.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
      setItems(acc.slice());
      setTotalAccounts(first.total);
      setLoadedAccounts(Math.min(ACCOUNT_PAGE_SIZE, first.total));

      const offsets: number[] = [];
      for (let o = ACCOUNT_PAGE_SIZE; o < first.total; o += ACCOUNT_PAGE_SIZE) offsets.push(o);
      let done = 1;
      let next = 0;
      async function worker() {
        for (;;) {
          const i = next++;
          const offset = offsets[i];
          if (offset === undefined) return;
          const page = await fetchPage(offset, refresh);
          if (runIdRef.current !== runId) return;
          // Дедупликация по «компания+чат»: сервер ставит аккаунты, у
          // которых отклики были в прошлый раз, в начало обхода (см.
          // knownActive в lib/a1/admin-applications.ts), поэтому один и
          // тот же аккаунт может попасть в две страницы.
          acc = dedupe(acc.concat(page.applications));
          acc.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
          setItems(acc.slice());
          done += 1;
          setLoadedAccounts(Math.min(done * ACCOUNT_PAGE_SIZE, first.total));
        }
      }
      await Promise.all(Array.from({ length: Math.min(PAGE_CONCURRENCY, offsets.length) }, worker));
    } catch {
      if (runIdRef.current === runId) setError(true);
    } finally {
      if (runIdRef.current === runId) setScanning(false);
    }
  }

  useEffect(() => {
    scanAll();
    return () => {
      runIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.companyName.toLowerCase().includes(q) ||
        a.applicantName.toLowerCase().includes(q) ||
        (a.applicantUsername ?? "").toLowerCase().includes(q) ||
        a.messages.some((m) => m.text.toLowerCase().includes(q)),
    );
  }, [items, query]);

  // Отклики одной компании -- одной карточкой (2026-09-17, Александр:
  // «если это отзывы на одну компанию, они должны группироваться в
  // блок, который нажимаешь, он раскрывается, и ты видишь, что у них
  // несколько»). Порядок компаний -- по самому свежему отклику, внутри
  // компании -- тоже сверху свежие.
  const groups = useMemo(() => {
    if (!filtered) return null;
    const byCompany = new Map<string, { companyName: string; companyEmail: string; apps: Application[]; lastMessageAtMs: number }>();
    for (const app of filtered) {
      const group = byCompany.get(app.companyEmail);
      if (group) {
        group.apps.push(app);
        group.lastMessageAtMs = Math.max(group.lastMessageAtMs, app.lastMessageAtMs);
      } else {
        byCompany.set(app.companyEmail, {
          companyName: app.companyName,
          companyEmail: app.companyEmail,
          apps: [app],
          lastMessageAtMs: app.lastMessageAtMs,
        });
      }
    }
    const list = Array.from(byCompany.values());
    for (const group of list) group.apps.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
    list.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
    return list;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <AdminNav lang={lang} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.title[lang]}</h1>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
            {STRINGS.signedInAs[lang]}: {signedInAs}
          </p>
          {items !== null && (
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t("totalCount", lang, { n: items.length })}</p>
          )}
          {totalAccounts !== null && scanning && (
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
              {t("loadingMore", lang, { loaded: loadedAccounts, total: totalAccounts })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => scanAll(true)}
          className="shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {STRINGS.refresh[lang]}
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={STRINGS.searchPlaceholder[lang]}
        className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{STRINGS.loadError[lang]}</p>}

      {!error && items === null && (
        <div className="flex justify-center py-8">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {items !== null && items.length === 0 && !error && !scanning && (
        <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">{STRINGS.empty[lang]}</p>
      )}

      {filtered !== null && filtered.length === 0 && items !== null && items.length > 0 && (
        <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">{STRINGS.noMatches[lang]}</p>
      )}

      <div className="flex flex-col gap-2">
        {groups?.map((group) => (
          <CompanyApplications key={group.companyEmail} group={group} lang={lang} />
        ))}
      </div>

      {scanning && (
        <div className="flex justify-center py-6">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin text-neutral-400" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

    </div>
  );
}

// Карточка одной компании: стрелка, название, счётчик и кнопка
// «Створити посилання» -- та же самая, что во вкладке «Компанії»
// (components/admin-claim-link.tsx), чтобы за ссылкой не ходить в
// другую вкладку.
function CompanyApplications({
  group,
  lang,
}: {
  group: { companyName: string; companyEmail: string; apps: Application[]; lastMessageAtMs: number };
  lang: Locale;
}) {
  // Свёрнуто по умолчанию: в шапке и так видно компанию, сколько
  // откликов и когда был последний -- этого хватает, чтобы решить,
  // разворачивать ли.
  const [open, setOpen] = useState(false);
  const claim = useClaimLink(group.companyEmail, lang);
  const latest = group.apps[0];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{group.companyName}</span>
            <span className="block truncate text-xs text-neutral-400 dark:text-neutral-500">
              {t("groupCount", lang, { n: group.apps.length })}
              {latest ? ` · ${latest.applicantName || STRINGS.unknownApplicant[lang]} · ${formatWhen(group.lastMessageAtMs)}` : ""}
            </span>
          </span>
        </button>
        <ClaimLinkButton lang={lang} busy={claim.busy} onClick={() => void claim.createLink()} />
      </div>

      <div className="px-3 pb-3 empty:hidden">
        <ClaimLinkDetails lang={lang} link={claim.link} error={claim.error} copied={claim.copied} onCopy={() => void claim.copy()} />
      </div>

      {open && (
        <div className="flex flex-col gap-2 border-t border-neutral-100 p-3 dark:border-neutral-900">
          {group.apps.map((app) => (
            <ApplicationCard key={app.chatId} app={app} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, lang }: { app: Application; lang: Locale }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {app.applicantName || STRINGS.unknownApplicant[lang]}
          {app.applicantUsername ? (
            <span className="ml-1.5 text-xs font-normal text-neutral-400 dark:text-neutral-500">@{app.applicantUsername}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500">{formatWhen(app.lastMessageAtMs)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {app.messages.map((m) => (
          <div
            key={m.id}
            className={
              "rounded-lg px-2.5 py-1.5 text-xs " +
              (m.fromCompany
                ? "bg-accent/5 text-neutral-600 dark:text-neutral-300"
                : "bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200")
            }
          >
            {m.fromCompany && (
              <span className="mr-1.5 text-[10px] uppercase tracking-wide text-accent">{STRINGS.fromCompany[lang]}</span>
            )}
            <span className="whitespace-pre-wrap break-words">{m.text || STRINGS.noText[lang]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// components/admin-companies-panel.tsx
//
// 2026-09-11 (Aleksandr: "хочу увидеть функционал передачи акка в
// админке"). The account-handover surface: search the ~500 imported
// company accounts, press one button, get the /claim/<key>/<code> link
// to hand that company. Replaces having to run "Claude outputs"/
// make_claim_link.py in a terminal — same two backend calls, just done
// server-side by app/api/admin/claim-link/route.ts.
//
// The list itself comes from app/api/admin/companies (a straight read of
// TECHNICAL_ACCOUNTS_JSON, no backend round trip), so it loads instantly
// and all searching/filtering happens client-side over the full list.
// Only the first VISIBLE_LIMIT matches are rendered — 500 rows of
// buttons is pointless when the search box narrows to the one company
// being handed over in two keystrokes.
//
// The warning line under the title is not decoration: the link really
// does transfer the account (the company sets its own email and
// password through it, and lib/a1/user-flags.ts's UNCLAIMED flag comes
// off), and it is one-shot — minting a new one invalidates nothing, but
// the first person to finish the flow owns the account.
"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminNav, useAdminLocale } from "@/components/admin-nav";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

type Company = { name: string; email: string };

type StringKey =
  | "title" | "signedInAs" | "totalCount" | "searchPlaceholder" | "warning"
  | "createLink" | "creating" | "copy" | "copied" | "loadError"
  | "noMatches" | "narrowSearch" | "linkTitle" | "errAlreadyClaimed"
  | "errUnknownAccount" | "errUnknown" | "expiresIn";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Компанії", en: "Companies", ru: "Компании", de: "Unternehmen", es: "Empresas", fr: "Entreprises", pl: "Firmy", ptBR: "Empresas", zh: "公司" },
  signedInAs: { uk: "Обліковий запис", en: "Signed in as", ru: "Аккаунт", de: "Angemeldet als", es: "Sesión iniciada como", fr: "Connecté en tant que", pl: "Zalogowano jako", ptBR: "Conectado como", zh: "已登录" },
  totalCount: { uk: "Усього компаній: {n}", en: "Companies: {n}", ru: "Всего компаний: {n}", de: "Unternehmen insgesamt: {n}", es: "Total de empresas: {n}", fr: "Total d'entreprises : {n}", pl: "Łącznie firm: {n}", ptBR: "Total de empresas: {n}", zh: "共 {n} 家公司" },
  searchPlaceholder: { uk: "Пошук за назвою компанії…", en: "Search by company name…", ru: "Поиск по названию компании…", de: "Nach Firmennamen suchen…", es: "Buscar por nombre de empresa…", fr: "Rechercher par nom d'entreprise…", pl: "Szukaj po nazwie firmy…", ptBR: "Buscar por nome da empresa…", zh: "按公司名称搜索…" },
  warning: {
    uk: "Посилання справді передає акаунт: той, хто пройде по ньому, задасть свою пошту й пароль і стане власником. Надсилайте його лише самій компанії.",
    en: "The link really does hand the account over: whoever completes it sets their own email and password and becomes the owner. Send it only to the company itself.",
    ru: "Ссылка действительно передаёт аккаунт: тот, кто пройдёт по ней, задаст свою почту и пароль и станет владельцем. Отправляйте её только самой компании.",
    de: "Der Link übergibt das Konto wirklich: Wer ihn abschließt, legt eigene E-Mail und Passwort fest und wird Eigentümer. Nur an das Unternehmen selbst senden.",
    es: "El enlace transfiere la cuenta de verdad: quien lo complete define su correo y contraseña y pasa a ser el propietario. Envíalo solo a la propia empresa.",
    fr: "Le lien transfère réellement le compte : celui qui le complète définit son e-mail et son mot de passe et devient propriétaire. À n'envoyer qu'à l'entreprise elle-même.",
    pl: "Link naprawdę przekazuje konto: kto go użyje, ustawi własny e-mail i hasło i zostanie właścicielem. Wysyłaj tylko do samej firmy.",
    ptBR: "O link realmente transfere a conta: quem o concluir define o próprio e-mail e senha e vira o dono. Envie apenas para a própria empresa.",
    zh: "该链接会真正移交账号：完成流程的人将设置自己的邮箱和密码并成为所有者。只发给该公司本人。",
  },
  createLink: { uk: "Створити посилання", en: "Create link", ru: "Создать ссылку", de: "Link erstellen", es: "Crear enlace", fr: "Créer un lien", pl: "Utwórz link", ptBR: "Criar link", zh: "创建链接" },
  creating: { uk: "Створюю…", en: "Creating…", ru: "Создаю…", de: "Wird erstellt…", es: "Creando…", fr: "Création…", pl: "Tworzę…", ptBR: "Criando…", zh: "创建中…" },
  copy: { uk: "Копіювати", en: "Copy", ru: "Копировать", de: "Kopieren", es: "Copiar", fr: "Copier", pl: "Kopiuj", ptBR: "Copiar", zh: "复制" },
  copied: { uk: "Скопійовано", en: "Copied", ru: "Скопировано", de: "Kopiert", es: "Copiado", fr: "Copié", pl: "Skopiowano", ptBR: "Copiado", zh: "已复制" },
  loadError: { uk: "Не вдалося завантажити список", en: "Couldn't load the list", ru: "Не удалось загрузить список", de: "Liste konnte nicht geladen werden", es: "No se pudo cargar la lista", fr: "Impossible de charger la liste", pl: "Nie udało się wczytać listy", ptBR: "Não foi possível carregar a lista", zh: "无法加载列表" },
  noMatches: { uk: "Нічого не знайдено", en: "Nothing found", ru: "Ничего не найдено", de: "Nichts gefunden", es: "No se encontró nada", fr: "Rien trouvé", pl: "Nic nie znaleziono", ptBR: "Nada encontrado", zh: "未找到任何内容" },
  narrowSearch: { uk: "Показано {shown} з {n} — уточніть пошук", en: "Showing {shown} of {n} — narrow the search", ru: "Показано {shown} из {n} — уточните поиск", de: "{shown} von {n} angezeigt — Suche eingrenzen", es: "Mostrando {shown} de {n} — afina la búsqueda", fr: "{shown} sur {n} affichés — affinez la recherche", pl: "Pokazano {shown} z {n} — zawęź wyszukiwanie", ptBR: "Mostrando {shown} de {n} — refine a busca", zh: "显示 {shown}/{n} — 请细化搜索" },
  linkTitle: { uk: "Посилання на передачу", en: "Handover link", ru: "Ссылка на передачу", de: "Übergabe-Link", es: "Enlace de traspaso", fr: "Lien de transfert", pl: "Link przekazania", ptBR: "Link de transferência", zh: "移交链接" },
  errAlreadyClaimed: { uk: "Акаунт уже передано", en: "Account already claimed", ru: "Аккаунт уже передан", de: "Konto bereits übernommen", es: "La cuenta ya fue reclamada", fr: "Compte déjà réclamé", pl: "Konto już przejęte", ptBR: "Conta já reivindicada", zh: "账号已被认领" },
  errUnknownAccount: { uk: "Такого акаунта немає в списку", en: "No such account on file", ru: "Такого аккаунта нет в списке", de: "Konto nicht in der Liste", es: "Esa cuenta no está en la lista", fr: "Compte absent de la liste", pl: "Brak takiego konta na liście", ptBR: "Conta não está na lista", zh: "列表中没有该账号" },
  errUnknown: { uk: "Не вдалося створити посилання", en: "Couldn't create the link", ru: "Не удалось создать ссылку", de: "Link konnte nicht erstellt werden", es: "No se pudo crear el enlace", fr: "Impossible de créer le lien", pl: "Nie udało się utworzyć linku", ptBR: "Não foi possível criar o link", zh: "无法创建链接" },
  expiresIn: { uk: "Дійсне {days} днів", en: "Valid for {days} days", ru: "Действует {days} дней", de: "{days} Tage gültig", es: "Válido {days} días", fr: "Valable {days} jours", pl: "Ważny {days} dni", ptBR: "Válido por {days} dias", zh: "有效期 {days} 天" },
};

function t(key: StringKey, lang: Locale, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

const VISIBLE_LIMIT = 60;

type LinkState = { url: string; days: number } | null;

export function AdminCompaniesPanel({ signedInAs }: { signedInAs: string }) {
  const lang = useAdminLocale();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, LinkState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/admin/companies")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setError(true);
          return;
        }
        setCompanies(data.companies ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!companies) return null;
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [companies, query]);

  async function createLink(email: string) {
    if (busyEmail) return;
    setBusyEmail(email);
    setErrors((prev) => ({ ...prev, [email]: "" }));
    try {
      const res = await authFetch("/api/admin/claim-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.url === "string") {
        const days = Math.max(1, Math.round((Number(data.expiresInSeconds) || 0) / 86400));
        setLinks((prev) => ({ ...prev, [email]: { url: data.url, days } }));
        return;
      }
      const reason = typeof data?.reason === "string" ? data.reason : "unknown";
      const message =
        reason === "already_claimed"
          ? STRINGS.errAlreadyClaimed[lang]
          : reason === "unknown_account"
            ? STRINGS.errUnknownAccount[lang]
            : STRINGS.errUnknown[lang];
      // The backend's own words when there are any (admin-only route, see
      // app/api/admin/claim-link/route.ts's `debug`) — a generic "couldn't
      // create the link" told nobody anything the first time this failed.
      const debug = typeof data?.debug === "string" && data.debug ? ` — ${data.debug}` : "";
      setErrors((prev) => ({ ...prev, [email]: message + debug }));
    } catch {
      setErrors((prev) => ({ ...prev, [email]: STRINGS.errUnknown[lang] }));
    } finally {
      setBusyEmail(null);
    }
  }

  async function copy(email: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedEmail(email);
      window.setTimeout(() => setCopiedEmail((cur) => (cur === email ? null : cur)), 2000);
    } catch {
      // Clipboard blocked (insecure context, denied permission) — the
      // link is right there on screen and selectable, so this needs no
      // error state of its own.
    }
  }

  const shown = filtered?.slice(0, VISIBLE_LIMIT) ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <AdminNav lang={lang} />
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.title[lang]}</h1>
        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
          {STRINGS.signedInAs[lang]}: {signedInAs}
        </p>
        {companies !== null && (
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t("totalCount", lang, { n: companies.length })}</p>
        )}
      </div>

      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300">
        {STRINGS.warning[lang]}
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={STRINGS.searchPlaceholder[lang]}
        className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{STRINGS.loadError[lang]}</p>}

      {!error && companies === null && (
        <div className="flex justify-center py-8">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {filtered !== null && filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">{STRINGS.noMatches[lang]}</p>
      )}

      {filtered !== null && shown !== null && filtered.length > shown.length && (
        <p className="mb-2 text-xs text-neutral-400 dark:text-neutral-500">
          {t("narrowSearch", lang, { shown: shown.length, n: filtered.length })}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {shown?.map((company) => {
          const link = links[company.email] ?? null;
          const err = errors[company.email];
          return (
            <div key={company.email} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{company.name}</span>
                <button
                  type="button"
                  onClick={() => createLink(company.email)}
                  disabled={busyEmail === company.email}
                  className="shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {busyEmail === company.email ? STRINGS.creating[lang] : STRINGS.createLink[lang]}
                </button>
              </div>

              {err ? <p className="text-xs text-red-600 dark:text-red-400">{err}</p> : null}

              {link ? (
                <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-900">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      {STRINGS.linkTitle[lang]} · {t("expiresIn", lang, { days: link.days })}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(company.email, link.url)}
                      className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent transition hover:bg-accent/20"
                    >
                      {copiedEmail === company.email ? STRINGS.copied[lang] : STRINGS.copy[lang]}
                    </button>
                  </div>
                  <p className="break-all text-xs text-neutral-700 dark:text-neutral-200">{link.url}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

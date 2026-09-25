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

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminNav, useAdminLocale } from "@/components/admin-nav";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { ClaimLinkButton, ClaimLinkDetails, useClaimLink } from "@/components/admin-claim-link";

type Company = { name: string; email: string };

type StringKey =
  | "title" | "signedInAs" | "totalCount" | "searchPlaceholder" | "warning"
  | "loadError" | "noMatches" | "narrowSearch"
  | "logo" | "logoBusy" | "logoDone" | "logoFailed" | "logoTooLarge" | "logoHint";

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
  loadError: { uk: "Не вдалося завантажити список", en: "Couldn't load the list", ru: "Не удалось загрузить список", de: "Liste konnte nicht geladen werden", es: "No se pudo cargar la lista", fr: "Impossible de charger la liste", pl: "Nie udało się wczytać listy", ptBR: "Não foi possível carregar a lista", zh: "无法加载列表" },
  noMatches: { uk: "Нічого не знайдено", en: "Nothing found", ru: "Ничего не найдено", de: "Nichts gefunden", es: "No se encontró nada", fr: "Rien trouvé", pl: "Nic nie znaleziono", ptBR: "Nada encontrado", zh: "未找到任何内容" },
  narrowSearch: { uk: "Показано {shown} з {n} — уточніть пошук", en: "Showing {shown} of {n} — narrow the search", ru: "Показано {shown} из {n} — уточните поиск", de: "{shown} von {n} angezeigt — Suche eingrenzen", es: "Mostrando {shown} de {n} — afina la búsqueda", fr: "{shown} sur {n} affichés — affinez la recherche", pl: "Pokazano {shown} z {n} — zawęź wyszukiwanie", ptBR: "Mostrando {shown} de {n} — refine a busca", zh: "显示 {shown}/{n} — 请细化搜索" },
  logo: { uk: "Логотип", en: "Logo", ru: "Логотип", de: "Logo", es: "Logotipo", fr: "Logo", pl: "Logo", ptBR: "Logotipo", zh: "标识" },
  logoBusy: { uk: "Завантаження…", en: "Uploading…", ru: "Загрузка…", de: "Wird hochgeladen…", es: "Subiendo…", fr: "Envoi…", pl: "Wysyłanie…", ptBR: "Enviando…", zh: "上传中…" },
  logoDone: { uk: "Готово", en: "Done", ru: "Готово", de: "Fertig", es: "Listo", fr: "Terminé", pl: "Gotowe", ptBR: "Pronto", zh: "完成" },
  logoFailed: { uk: "Не вдалося замінити логотип", en: "Couldn't replace the logo", ru: "Не удалось заменить логотип", de: "Logo konnte nicht ersetzt werden", es: "No se pudo reemplazar el logotipo", fr: "Impossible de remplacer le logo", pl: "Nie udało się zmienić logo", ptBR: "Não foi possível trocar o logotipo", zh: "无法替换标识" },
  logoTooLarge: { uk: "Файл завеликий (до 4 МБ)", en: "File too large (4 MB max)", ru: "Файл слишком большой (до 4 МБ)", de: "Datei zu groß (max. 4 MB)", es: "Archivo demasiado grande (máx. 4 MB)", fr: "Fichier trop volumineux (4 Mo max)", pl: "Plik za duży (maks. 4 MB)", ptBR: "Arquivo muito grande (máx. 4 MB)", zh: "文件过大（最大 4 MB）" },
  logoHint: { uk: "Квадратна картинка, знак у центрі", en: "A square image, mark centred", ru: "Квадратная картинка, знак по центру", de: "Quadratisches Bild, Zeichen mittig", es: "Imagen cuadrada, con la marca centrada", fr: "Image carrée, marque centrée", pl: "Kwadratowy obraz, znak na środku", ptBR: "Imagem quadrada, marca centralizada", zh: "方形图片，标记居中" },
};

function t(key: StringKey, lang: Locale, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

const VISIBLE_LIMIT = 60;

export function AdminCompaniesPanel({ signedInAs }: { signedInAs: string }) {
  const lang = useAdminLocale();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

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
        {shown?.map((company) => (
          <CompanyRow key={company.email} company={company} lang={lang} />
        ))}
      </div>
    </div>
  );
}

// Одна строка списка. Отдельным компонентом, потому что состояние
// ссылки живёт в хуке, а хук нельзя звать в цикле внутри родителя.
function CompanyRow({ company, lang }: { company: Company; lang: Locale }) {
  const claim = useClaimLink(company.email, lang);
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{company.name}</span>
        <CompanyLogoButton email={company.email} lang={lang} />
        <ClaimLinkButton lang={lang} busy={claim.busy} onClick={() => void claim.createLink()} />
      </div>
      <ClaimLinkDetails lang={lang} link={claim.link} error={claim.error} copied={claim.copied} onCopy={() => void claim.copy()} />
    </div>
  );
}

// 25.09.2026 (Александр, профиль /u/whitebit: «Поставьте только быка в
// центр аватара»). Раньше логотип компании менялся только входом ПОД
// компанией -- карандаш у аватара в её собственном профиле. Здесь та же
// замена, но от имени компании действует сервер
// (app/api/admin/companies/avatar), поэтому пароли не проходят через
// браузер и не нужны тому, кто правит логотипы.
//
// Кадрирования тут намеренно нет, в отличие от кнопки в профиле: там
// человек заливает случайное фото, здесь -- заранее подготовленный
// квадратный знак. Подпись под кнопкой прямо это и просит.
function CompanyLogoButton({ email, lang }: { email: string; lang: Locale }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setError(null);
    if (file.size > 4 * 1024 * 1024) {
      setError(t("logoTooLarge", lang));
      return;
    }
    setState("busy");
    try {
      // base64 из ArrayBuffer кусками: btoa(String.fromCharCode(...all))
      // на мегабайтном файле переполняет стек аргументов.
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const res = await fetch("/api/admin/companies/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, mimetype: file.type || "image/png", dataBase64: btoa(binary) }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setError(data?.debug ? `${t("logoFailed", lang)}: ${data.debug}` : t("logoFailed", lang));
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError(t("logoFailed", lang));
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={() => inputRef.current?.click()}
        title={t("logoHint", lang)}
        className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {state === "busy" ? t("logoBusy", lang) : state === "done" ? t("logoDone", lang) : t("logo", lang)}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void send(file);
        }}
      />
      {error && <span className="mt-1 max-w-[220px] text-right text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

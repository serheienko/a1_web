// components/admin-claim-link.tsx
//
// Кнопка «Створити посилання» вместе со всем, что вокруг неё: запрос,
// показ ссылки, копирование и разбор отказов. 2026-09-17.
//
// Раньше всё это жило внутри components/admin-companies-panel.tsx.
// Вынесено, потому что Александр попросил ту же кнопку прямо в
// «Відгуках»: «Create Link должен быть в тех же applications, просто
// чтобы я повторно не шёл, не искал компании». Второй копии кнопки в
// проекте быть не должно -- предупреждение о том, что ссылка реально
// отдаёт аккаунт, и разбор ошибок обязаны совпадать в обоих местах.
//
// Сам запрос -- app/api/admin/claim-link (два вызова бэкенда,
// server-side); ссылка одноразовая по смыслу: кто первым пройдёт по
// ней, тот и станет владельцем аккаунта.
"use client";

import { useState } from "react";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

type StringKey =
  | "createLink" | "creating" | "copy" | "copied" | "linkTitle"
  | "errAlreadyClaimed" | "errUnknownAccount" | "errUnknown" | "expiresIn";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  createLink: { uk: "Створити посилання", en: "Create link", ru: "Создать ссылку", de: "Link erstellen", es: "Crear enlace", fr: "Créer un lien", pl: "Utwórz link", ptBR: "Criar link", zh: "创建链接" },
  creating: { uk: "Створюю…", en: "Creating…", ru: "Создаю…", de: "Wird erstellt…", es: "Creando…", fr: "Création…", pl: "Tworzę…", ptBR: "Criando…", zh: "创建中…" },
  copy: { uk: "Копіювати", en: "Copy", ru: "Копировать", de: "Kopieren", es: "Copiar", fr: "Copier", pl: "Kopiuj", ptBR: "Copiar", zh: "复制" },
  copied: { uk: "Скопійовано", en: "Copied", ru: "Скопировано", de: "Kopiert", es: "Copiado", fr: "Copié", pl: "Skopiowano", ptBR: "Copiado", zh: "已复制" },
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

/** Только кнопка -- её ставят в строку с названием компании. */
export function ClaimLinkButton({
  lang,
  busy,
  onClick,
}: {
  lang: Locale;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {busy ? STRINGS.creating[lang] : STRINGS.createLink[lang]}
    </button>
  );
}

/**
 * Состояние одной кнопки: запрос ссылки, сама ссылка, отказ,
 * копирование. Хук, а не компонент, потому что строка, в которую это
 * встраивается, у двух панелей разная: в «Компаніях» -- просто
 * название, в «Відгуках» -- стрелка, название и счётчик.
 */
export function useClaimLink(email: string, lang: Locale) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; days: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function createLink() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/claim-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.url === "string") {
        const days = Math.max(1, Math.round((Number(data.expiresInSeconds) || 0) / 86400));
        setLink({ url: data.url, days });
        return;
      }
      const reason = typeof data?.reason === "string" ? data.reason : "unknown";
      const message =
        reason === "already_claimed"
          ? STRINGS.errAlreadyClaimed[lang]
          : reason === "unknown_account"
            ? STRINGS.errUnknownAccount[lang]
            : STRINGS.errUnknown[lang];
      // Слова самого бэкенда, когда они есть (маршрут админский, см.
      // app/api/admin/claim-link/route.ts) -- общее «не удалось» в
      // первый же отказ никому ничего не объяснило.
      const debug = typeof data?.debug === "string" && data.debug ? ` — ${data.debug}` : "";
      setError(message + debug);
    } catch {
      setError(STRINGS.errUnknown[lang]);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена может быть закрыт браузером -- ссылка и так на
      // экране и выделяется мышью, отдельная ошибка тут не нужна.
    }
  }

  return { busy, link, error, copied, createLink, copy };
}

/** Ссылка или отказ -- то, что появляется под строкой после нажатия. */
export function ClaimLinkDetails({
  lang,
  link,
  error,
  copied,
  onCopy,
}: {
  lang: Locale;
  link: { url: string; days: number } | null;
  error: string;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!link && !error) return null;
  return (
    <>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      {link ? (
        <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-900">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {STRINGS.linkTitle[lang]} · {t("expiresIn", lang, { days: link.days })}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent transition hover:bg-accent/20"
            >
              {copied ? STRINGS.copied[lang] : STRINGS.copy[lang]}
            </button>
          </div>
          <p className="break-all text-xs text-neutral-700 dark:text-neutral-200">{link.url}</p>
        </div>
      ) : null}
    </>
  );
}

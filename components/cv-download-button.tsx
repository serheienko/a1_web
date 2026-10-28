// components/cv-download-button.tsx
//
// 28.10.2026 (Александр): «Зберегти CV» на своём профиле -- круглый значок
// под «поділитися», того же вида. Нажал -- сайт собирает PDF из профиля
// (app/api/cv/[username]/route.ts), пока крутится колесо, потом файл
// скачивается. Язык CV угадывается по тексту профиля, язык сайта -- запасной.
"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";

const LABEL: Record<Locale, string> = {
  uk: "Зберегти CV", en: "Save CV", ru: "Сохранить CV", de: "Lebenslauf speichern",
  es: "Guardar CV", fr: "Enregistrer le CV", pl: "Zapisz CV", ptBR: "Salvar currículo", zh: "保存简历",
};
const FAILED: Record<Locale, string> = {
  uk: "Не вдалося зібрати CV, спробуйте ще раз", en: "Couldn't build the CV, please try again", ru: "Не удалось собрать CV, попробуйте ещё раз",
  de: "Lebenslauf konnte nicht erstellt werden, bitte erneut versuchen", es: "No se pudo crear el CV, inténtelo de nuevo", fr: "Impossible de créer le CV, réessayez",
  pl: "Nie udało się utworzyć CV, spróbuj ponownie", ptBR: "Não foi possível criar o currículo, tente novamente", zh: "无法生成简历，请重试",
};

export function CvDownloadButton({ username, className }: { username: string; className?: string }) {
  const lang = useActiveLocale() as Locale;
  const [isOwner, setIsOwner] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && data.username === username) setIsOwner(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!isOwner) return null;

  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cv/${encodeURIComponent(username)}?ui=${lang}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "CV.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      window.alert(FAILED[lang]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      aria-label={LABEL[lang]}
      title={LABEL[lang]}
      className={
        "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-900/80 text-white shadow-sm transition hover:bg-neutral-900 active:scale-90 disabled:opacity-80 dark:border-black " +
        (className ?? "")
      }
      disabled={busy}
    >
      {busy ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" />
        </svg>
      )}
    </button>
  );
}

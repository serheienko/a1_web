// components/cv-landing-cta.tsx -- кнопка страницы «CV Builder» (28.10.2026).
//
// Не вошёл -- «Створити резюме безкоштовно» ведёт на вход с возвратом сюда же
// (/sign-in?reason=cv&next=...). Вошёл -- сразу «Завантажити моє резюме»
// (PDF из своего профиля, app/api/cv/[username]) и рядом «Доповнити профіль»
// (профиль с открытым редактором, ?edit=1). Регистрация обязательна: CV
// собирается из профиля (решение Александра 28.10.2026).
"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { profileHref } from "@/lib/profile-href";

type Props = {
  lang: string;
  path: string;
  ctaCreate: string;
  ctaDownload: string;
  ctaFill: string;
  hint: string;
  tone?: "light" | "dark";
};

export function CvLandingCta({ lang, path, ctaCreate, ctaDownload, ctaFill, hint, tone = "light" }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && typeof d.username === "string" && d.username) setUsername(d.username);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const primary =
    tone === "dark"
      ? "bg-white text-[#2840B8] hover:bg-white/90"
      : "bg-accent text-white hover:brightness-110";
  const secondary =
    tone === "dark"
      ? "border border-white/50 bg-white/10 text-white hover:bg-white/20"
      : "border border-neutral-300 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900";
  const base = "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition active:scale-[0.98]";

  async function download() {
    if (!username || busy) return;
    setBusy(true);
    setFailed(false);
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
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (!username) {
    return (
      <div className="flex flex-wrap gap-3">
        <a href={`/sign-in?reason=cv&next=${encodeURIComponent(path)}`} className={`${base} ${primary}`}>
          {ctaCreate}
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={download} disabled={busy} className={`${base} ${primary} disabled:opacity-80`}>
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" /> : null}
          {ctaDownload}
        </button>
        <a href={`${profileHref(username)}?edit=1`} className={`${base} ${secondary}`}>
          {ctaFill}
        </a>
      </div>
      <p className={"mt-3 text-[13px] " + (tone === "dark" ? "text-white/80" : "text-neutral-500 dark:text-neutral-400")}>
        {failed ? "⚠ " : ""}
        {hint}
      </p>
    </div>
  );
}

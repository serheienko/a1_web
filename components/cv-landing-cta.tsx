// components/cv-landing-cta.tsx -- кнопка страницы «CV Builder» (28.10.2026).
//
// Не вошёл -- «Створити резюме безкоштовно» ведёт на вход с возвратом сюда же
// (/sign-in?reason=cv&next=...). Вошёл -- сразу «Завантажити моє резюме»
// (PDF из своего профиля, app/api/cv/[username]) и рядом «Доповнити профіль»
// (профиль с открытым редактором, ?edit=1). Регистрация обязательна: CV
// собирается из профиля (решение Александра 28.10.2026).
"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const WHO_KEY = "a1-cv-who";
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
  // 28.10.2026 (Александр: «при перезагрузке кнопка 0,3 с прыгает»). Пока не знаем, вошёл ли
  // человек, кнопки невидимы (место занято, ничего не прыгает), потом плавно проявляются.
  // Последний ответ запоминаем в sessionStorage и берём его до первой отрисовки --
  // при перезагрузке сразу верная кнопка.
  const [state, setState] = useState<{ ready: boolean; username: string | null }>({ ready: false, username: null });
  const username = state.username;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    try {
      const cached = sessionStorage.getItem(WHO_KEY);
      if (cached !== null) setState({ ready: true, username: cached || null });
    } catch {
      /* без хранилища -- ждём ответа */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const u = d?.ok && typeof d.username === "string" && d.username ? (d.username as string) : null;
        setState({ ready: true, username: u });
        try {
          sessionStorage.setItem(WHO_KEY, u ?? "");
        } catch {
          /* не страшно */
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, ready: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const primary =
    tone === "dark"
      ? "bg-white text-[#2840B8] hover:bg-white/90"
      : "cvl-grad text-white shadow-[0_10px_30px_-10px_rgba(107,77,255,0.7)] hover:brightness-110";
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

  const fade = "transition-opacity duration-300 " + (state.ready ? "opacity-100" : "pointer-events-none opacity-0");

  if (!username) {
    return (
      <div className={"flex flex-wrap gap-3 " + fade}>
        <a href={`/sign-in?reason=cv&next=${encodeURIComponent(path)}`} className={`${base} ${primary}`}>
          {ctaCreate}
        </a>
      </div>
    );
  }

  return (
    <div className={fade}>
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

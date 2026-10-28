// components/cv-landing-cta.tsx -- кнопка страницы «CV Builder» (28.10.2026).
//
// Не вошёл -- «Створити резюме безкоштовно» ведёт на вход с возвратом сюда же
// (/sign-in?reason=cv&next=...). Вошёл -- сразу «Завантажити моє резюме»
// (PDF из своего профиля, app/api/cv/[username]) и рядом «Доповнити профіль»
// (профиль с открытым редактором, ?edit=1). Регистрация обязательна: CV
// собирается из профиля (решение Александра 28.10.2026).
"use client";

import { useEffect, useState } from "react";

const WHO_KEY = "a1-cv-who";
import { authFetch } from "@/lib/auth-fetch";
import { profileHref } from "@/lib/profile-href";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";

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
  // 28.10.2026 (Александр, видео: «кнопка моргает и прыгает при перезагрузке»).
  // Сервер рисует ОБА варианта сразу: для гостя («Створити») и для вошедшего
  // («Завантажити» + «Доповнити» + подсказка). Крошечный скрипт ниже ещё до первой
  // отрисовки смотрит cookie a1_user и помечает <html>; CSS показывает нужный вариант.
  // Ничего не ждём, не прячем и не проявляем -- верные кнопки стоят с первого кадра.
  // username нужен только для самих действий: берём из кэша аватарки в шапке, потом
  // уточняем через whoami. Если cookie устарела и whoami сказал «гость» -- снимаем метку.
  const [username, setUsername] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      const m = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
      if (m) {
        const prof = localStorage.getItem("a1_profile_cache:" + decodeURIComponent(m[1] ?? ""));
        const cached = (prof ? (JSON.parse(prof) as { username?: string | null }).username : null) || localStorage.getItem(WHO_KEY);
        if (cached) setUsername(cached);
      }
    } catch {
      /* без хранилища -- узнаем из whoami */
    }
    let cancelled = false;
    whoami().then((u) => {
      if (cancelled || u === undefined) return;
      setUsername(u);
      const root = document.documentElement;
      if (u) root.setAttribute("data-a1-signed", "");
      else root.removeAttribute("data-a1-signed");
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
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const u = username ?? (await whoami());
      if (!u) throw new Error("no user");
      const res = await fetch(`/api/cv/${encodeURIComponent(u)}?ui=${lang}`);
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

  return (
    <div className="cvl-cta">
      <style>{`html[data-a1-signed] .cvl-cta-out,html:not([data-a1-signed]) .cvl-cta-in{display:none}`}</style>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: `try{/(?:^|; )${DISPLAY_COOKIE}=/.test(document.cookie)&&document.documentElement.setAttribute("data-a1-signed","")}catch(e){}` }}
      />
      <div className="cvl-cta-out flex flex-wrap gap-3">
        <a href={`/sign-in?reason=cv&next=${encodeURIComponent(path)}`} className={`${base} ${primary}`}>
          {ctaCreate}
        </a>
      </div>
      <div className="cvl-cta-in">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={download} disabled={busy} className={`${base} ${primary} disabled:opacity-80`}>
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" /> : null}
            {ctaDownload}
          </button>
          <a href={username ? `${profileHref(username)}?edit=1` : "/"} className={`${base} ${secondary}`}>
            {ctaFill}
          </a>
        </div>
        <p className={"mt-3 text-[13px] " + (tone === "dark" ? "text-white/80" : "text-neutral-500 dark:text-neutral-400")}>
          {failed ? "⚠ " : ""}
          {hint}
        </p>
      </div>
    </div>
  );
}

// undefined -- сеть не ответила (ничего не меняем), null -- гость, строка -- username.
async function whoami(): Promise<string | null | undefined> {
  try {
    const d = await (await authFetch("/api/account/whoami")).json();
    const u = d?.ok && typeof d.username === "string" && d.username ? (d.username as string) : null;
    try {
      if (u) localStorage.setItem(WHO_KEY, u);
      else localStorage.removeItem(WHO_KEY);
    } catch {
      /* не страшно */
    }
    return u;
  } catch {
    return undefined;
  }
}

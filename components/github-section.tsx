// components/github-section.tsx
//
// 18.10.2026 (Александр): «подтверждённый GitHub». Плитка GitHub показывается ТОЛЬКО тому, кто
// доказал, что аккаунт из ссылки -- его (GitHub OAuth). Иначе любой мог бы вставить чужую ссылку
// и получить чужую карточку.
//
//  - Профиль подтверждён (бэкенд отдаёт githubVerifiedLogin, он совпадает с логином из ссылки) --
//    плитка с галочкой «GitHub підтверджено».
//  - Не подтверждён -- обычная ссылка и всё. А ВЛАДЕЛЬЦУ профиля тут же показываем тихую
//    карточку с кнопкой «Підтвердити через GitHub».
//
// Страница профиля кешируется на 10 минут и не знает, кто её смотрит, поэтому «это мой профиль» и
// свежий статус подтверждения определяются в браузере (как в edit-profile-button.tsx). Так человек
// сразу после возврата с GitHub видит плитку, не дожидаясь обновления кеша.
"use client";

import { useEffect, useState } from "react";
import { type Locale } from "@/components/t";
import { GithubTile } from "@/components/github-tile";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";

type Strings = { verify: string; hint: string; redirecting: string; busy: string; error: string };

const STRINGS: Record<Locale, Strings> = {
  uk: {
    verify: "Підтвердити через GitHub",
    hint: "Підтвердьте, що цей акаунт GitHub належить вам, і під посиланнями з’явиться ваша картка: внески, мови та найкращі репозиторії.",
    redirecting: "Переходимо до GitHub…",
    busy: "Забагато спроб. Спробуйте пізніше.",
    error: "Не вдалося розпочати підтвердження. Спробуйте ще раз.",
  },
  en: {
    verify: "Verify with GitHub",
    hint: "Confirm this GitHub account is yours and a card with your contributions, languages and top repositories will appear under your links.",
    redirecting: "Taking you to GitHub…",
    busy: "Too many attempts. Please try again later.",
    error: "Couldn’t start verification. Please try again.",
  },
  ru: {
    verify: "Подтвердить через GitHub",
    hint: "Подтвердите, что этот аккаунт GitHub принадлежит вам, и под ссылками появится ваша карточка: вклады, языки и лучшие репозитории.",
    redirecting: "Переходим на GitHub…",
    busy: "Слишком много попыток. Попробуйте позже.",
    error: "Не удалось начать подтверждение. Попробуйте ещё раз.",
  },
  de: {
    verify: "Mit GitHub bestätigen",
    hint: "Bestätigen Sie, dass dieses GitHub-Konto Ihnen gehört – dann erscheint unter Ihren Links Ihre Karte mit Beiträgen, Sprachen und Top-Repositories.",
    redirecting: "Weiter zu GitHub …",
    busy: "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
    error: "Die Bestätigung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.",
  },
  es: {
    verify: "Verificar con GitHub",
    hint: "Confirma que esta cuenta de GitHub es tuya y debajo de tus enlaces aparecerá tu tarjeta con contribuciones, lenguajes y repositorios destacados.",
    redirecting: "Abriendo GitHub…",
    busy: "Demasiados intentos. Inténtalo de nuevo más tarde.",
    error: "No se pudo iniciar la verificación. Inténtalo de nuevo.",
  },
  fr: {
    verify: "Vérifier avec GitHub",
    hint: "Confirmez que ce compte GitHub est bien le vôtre : une carte avec vos contributions, langages et principaux dépôts apparaîtra sous vos liens.",
    redirecting: "Redirection vers GitHub…",
    busy: "Trop de tentatives. Réessayez plus tard.",
    error: "Impossible de lancer la vérification. Réessayez.",
  },
  pl: {
    verify: "Potwierdź przez GitHub",
    hint: "Potwierdź, że to konto GitHub należy do Ciebie, a pod linkami pojawi się Twoja karta: wkład, języki i najlepsze repozytoria.",
    redirecting: "Przechodzimy do GitHuba…",
    busy: "Zbyt wiele prób. Spróbuj ponownie później.",
    error: "Nie udało się rozpocząć potwierdzenia. Spróbuj ponownie.",
  },
  ptBR: {
    verify: "Verificar com o GitHub",
    hint: "Confirme que esta conta do GitHub é sua e um cartão com suas contribuições, linguagens e principais repositórios aparecerá abaixo dos seus links.",
    redirecting: "Indo para o GitHub…",
    busy: "Muitas tentativas. Tente novamente mais tarde.",
    error: "Não foi possível iniciar a verificação. Tente novamente.",
  },
  zh: {
    verify: "通过 GitHub 验证",
    hint: "确认这个 GitHub 账号属于您，您的链接下方就会显示包含贡献、语言和热门仓库的卡片。",
    redirecting: "正在前往 GitHub…",
    busy: "尝试次数过多，请稍后再试。",
    error: "无法开始验证，请重试。",
  },
};

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

type Props = {
  /** Имя в адресе профиля -- чтобы понять, что это профиль смотрящего. */
  username: string;
  /** Логин из GitHub-ссылки профиля; null -- ссылки на GitHub нет. */
  linkLogin: string | null;
  /** Сервер уже видит подтверждение (логин из ссылки == githubVerifiedLogin). */
  serverVerified: boolean;
};

export function GithubSection({ username, linkLogin, serverVerified }: Props) {
  const lang = useActiveLocale();
  const s = STRINGS[lang];
  const [verified, setVerified] = useState(serverVerified);
  const [isOwner, setIsOwner] = useState(false);
  const [phase, setPhase] = useState<"idle" | "going" | "busy" | "error">("idle");
  const [shown, setShown] = useState(false);

  // Свежее подтверждение владельца: страница могла быть из кеша.
  useEffect(() => {
    if (!linkLogin) return;
    let cancelled = false;
    (async () => {
      try {
        const who = await authFetch("/api/account/whoami").then((r) => r.json());
        if (cancelled || !who?.ok || who.username !== username) return;
        setIsOwner(true);
        const st = await authFetch("/api/github/verify/status").then((r) => r.json());
        if (cancelled || !st?.ok) return;
        setVerified(typeof st.login === "string" && st.login.toLowerCase() === linkLogin.toLowerCase());
      } catch {
        // Не вошёл или сеть -- остаётся то, что показал сервер.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, linkLogin]);

  const card = linkLogin && !verified && isOwner;
  useEffect(() => {
    if (!card) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [card]);

  if (!linkLogin) return null;
  if (verified) return <GithubTile key={linkLogin} login={linkLogin} />;
  if (!card) return null;

  const start = async () => {
    if (phase === "going") return;
    setPhase("going");
    try {
      const res = await authFetch("/api/github/verify/begin", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && typeof data.url === "string") {
        window.location.assign(data.url);
        return;
      }
      setPhase(res.status === 429 ? "busy" : "error");
    } catch {
      setPhase("error");
    }
  };

  return (
    <section
      className={`mt-6 flex flex-col gap-3 rounded-card bg-card p-4 shadow-sm transition-all duration-500 ease-out sm:flex-row sm:items-center sm:gap-4 sm:p-5 dark:border dark:border-neutral-800 dark:bg-neutral-900 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-neutral-900 dark:text-neutral-100">
          <GithubMark />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink-faint">{s.hint}</p>
          {(phase === "busy" || phase === "error") && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {phase === "busy" ? s.busy : s.error}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={start}
        disabled={phase === "going"}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-default disabled:opacity-70 disabled:hover:scale-100 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {phase === "going" ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            {s.redirecting}
          </>
        ) : (
          s.verify
        )}
      </button>
    </section>
  );
}

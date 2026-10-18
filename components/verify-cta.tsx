// components/verify-cta.tsx
//
// 18.10.2026: общая часть «Підтвердити через Dribbble / Stack Overflow» (GitHub -- в
// components/github-section.tsx): запуск подтверждения и тихая карточка-кнопка для владельца профиля.
// Запуск: POST /api/<сервис>/verify/begin -> адрес /api/<сервис>/verify/start?state=... -> уходим на сервис.
"use client";

import { useState, type ReactNode } from "react";
import { type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";
import { PROVIDER_NAME, type VerifyProvider } from "@/components/provider-verify-result";

type Strings = {
  verify: string;
  redirecting: string;
  busy: string;
  error: string;
  /** Кнопка «Оновити» в плитке Dribbble. */
  refresh: string;
  hint: Record<VerifyProvider, string>;
};

// {name} -- название сервиса.
const STRINGS: Record<Locale, Strings> = {
  uk: { verify: "Підтвердити через {name}", redirecting: "Переходимо до {name}…", busy: "Забагато спроб. Спробуйте пізніше.", error: "Не вдалося розпочати підтвердження. Спробуйте ще раз.", refresh: "Оновити", hint: { dribbble: "Підтвердьте, що цей акаунт Dribbble належить вам, і під посиланнями з’являться ваші роботи.", stackoverflow: "Підтвердьте, що цей профіль Stack Overflow належить вам, і під посиланнями з’явиться ваша картка: репутація, значки та найсильніші теми." } },
  en: { verify: "Verify with {name}", redirecting: "Taking you to {name}…", busy: "Too many attempts. Please try again later.", error: "Couldn’t start verification. Please try again.", refresh: "Refresh", hint: { dribbble: "Confirm this Dribbble account is yours and your shots will appear under your links.", stackoverflow: "Confirm this Stack Overflow profile is yours and a card with your reputation, badges and top tags will appear under your links." } },
  ru: { verify: "Подтвердить через {name}", redirecting: "Переходим на {name}…", busy: "Слишком много попыток. Попробуйте позже.", error: "Не удалось начать подтверждение. Попробуйте ещё раз.", refresh: "Обновить", hint: { dribbble: "Подтвердите, что этот аккаунт Dribbble принадлежит вам, и под ссылками появятся ваши работы.", stackoverflow: "Подтвердите, что этот профиль Stack Overflow принадлежит вам, и под ссылками появится ваша карточка: репутация, значки и сильнейшие темы." } },
  de: { verify: "Mit {name} bestätigen", redirecting: "Weiter zu {name} …", busy: "Zu viele Versuche. Bitte versuchen Sie es später erneut.", error: "Die Bestätigung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.", refresh: "Aktualisieren", hint: { dribbble: "Bestätigen Sie, dass dieses Dribbble-Konto Ihnen gehört – dann erscheinen Ihre Shots unter Ihren Links.", stackoverflow: "Bestätigen Sie, dass dieses Stack-Overflow-Profil Ihnen gehört – dann erscheint unter Ihren Links Ihre Karte mit Reputation, Abzeichen und Top-Themen." } },
  es: { verify: "Verificar con {name}", redirecting: "Abriendo {name}…", busy: "Demasiados intentos. Inténtalo de nuevo más tarde.", error: "No se pudo iniciar la verificación. Inténtalo de nuevo.", refresh: "Actualizar", hint: { dribbble: "Confirma que esta cuenta de Dribbble es tuya y tus trabajos aparecerán debajo de tus enlaces.", stackoverflow: "Confirma que este perfil de Stack Overflow es tuyo y debajo de tus enlaces aparecerá tu tarjeta con reputación, insignias y temas destacados." } },
  fr: { verify: "Vérifier avec {name}", redirecting: "Redirection vers {name}…", busy: "Trop de tentatives. Réessayez plus tard.", error: "Impossible de lancer la vérification. Réessayez.", refresh: "Actualiser", hint: { dribbble: "Confirmez que ce compte Dribbble est bien le vôtre : vos shots apparaîtront sous vos liens.", stackoverflow: "Confirmez que ce profil Stack Overflow est bien le vôtre : une carte avec votre réputation, vos badges et vos principaux sujets apparaîtra sous vos liens." } },
  pl: { verify: "Potwierdź przez {name}", redirecting: "Przechodzimy do {name}…", busy: "Zbyt wiele prób. Spróbuj ponownie później.", error: "Nie udało się rozpocząć potwierdzenia. Spróbuj ponownie.", refresh: "Odśwież", hint: { dribbble: "Potwierdź, że to konto Dribbble należy do Ciebie, a pod linkami pojawią się Twoje prace.", stackoverflow: "Potwierdź, że ten profil Stack Overflow należy do Ciebie, a pod linkami pojawi się Twoja karta: reputacja, odznaki i najmocniejsze tematy." } },
  ptBR: { verify: "Verificar com o {name}", redirecting: "Indo para o {name}…", busy: "Muitas tentativas. Tente novamente mais tarde.", error: "Não foi possível iniciar a verificação. Tente novamente.", refresh: "Atualizar", hint: { dribbble: "Confirme que esta conta do Dribbble é sua e seus trabalhos aparecerão abaixo dos seus links.", stackoverflow: "Confirme que este perfil do Stack Overflow é seu e um cartão com sua reputação, medalhas e principais temas aparecerá abaixo dos seus links." } },
  zh: { verify: "通过 {name} 验证", redirecting: "正在前往 {name}…", busy: "尝试次数过多，请稍后再试。", error: "无法开始验证，请重试。", refresh: "刷新", hint: { dribbble: "确认这个 Dribbble 账号属于您，您的作品就会显示在链接下方。", stackoverflow: "确认这个 Stack Overflow 个人资料属于您，您的链接下方就会显示包含声望、徽章和热门标签的卡片。" } },
};

export function useVerifyStrings() {
  const lang = useActiveLocale();
  return { s: STRINGS[lang], lang };
}

export type VerifyPhase = "idle" | "going" | "busy" | "error";

/** Запуск подтверждения (и «Оновити» -- это то же самое подтверждение заново). */
export function useStartVerify(provider: VerifyProvider) {
  const [phase, setPhase] = useState<VerifyPhase>("idle");
  const start = async () => {
    if (phase === "going") return;
    setPhase("going");
    try {
      const res = await authFetch(`/api/${provider}/verify/begin`, { method: "POST" });
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
  return { phase, start };
}

export function VerifyCtaCard({
  provider,
  icon,
  phase,
  onStart,
  shown,
}: {
  provider: VerifyProvider;
  icon: ReactNode;
  phase: VerifyPhase;
  onStart: () => void;
  shown: boolean;
}) {
  const { s } = useVerifyStrings();
  const name = PROVIDER_NAME[provider];
  return (
    <section
      className={`mt-6 flex flex-col gap-3 rounded-card bg-card p-4 shadow-sm transition-all duration-500 ease-out sm:flex-row sm:items-center sm:gap-4 sm:p-5 dark:border dark:border-neutral-800 dark:bg-neutral-900 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-neutral-900 dark:text-neutral-100">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm text-ink-faint">{s.hint[provider]}</p>
          {(phase === "busy" || phase === "error") && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {phase === "busy" ? s.busy : s.error}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={phase === "going"}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-default disabled:opacity-70 disabled:hover:scale-100 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {phase === "going" ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            {s.redirecting.split("{name}").join(name)}
          </>
        ) : (
          s.verify.split("{name}").join(name)
        )}
      </button>
    </section>
  );
}

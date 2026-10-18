// components/github-verify-result.tsx
//
// 18.10.2026: куда GitHub возвращает человека после «Підтвердити через GitHub» (и на сайте, и из
// приложения: там это системный браузер). Показывает итог и ведёт в профиль, если человек вошёл на
// сайте; иначе -- на главную. В приложение вернуться можно обычным переключением -- оно само
// проверит статус при возврате.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { profileHref } from "@/lib/profile-href";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { VerifyStatus } from "@/lib/github/verify";

type Copy = { title: string; body: string };
type Strings = { statuses: Record<VerifyStatus, Copy>; toProfile: string; toHome: string };

const STRINGS: Record<Locale, Strings> = {
  uk: {
    statuses: {
      ok: { title: "GitHub підтверджено", body: "Готово! Картка GitHub тепер видна у вашому профілі. Якщо ви починали в застосунку, просто поверніться до нього." },
      denied: { title: "Підтвердження скасовано", body: "Ви не дали дозволу на GitHub, тому нічого не змінилося. Спробувати знову можна будь-коли." },
      expired: { title: "Посилання застаріло", body: "Підтвердження діє 10 хвилин і працює лише в тому браузері, де його розпочато. Почніть ще раз із профілю." },
      taken: { title: "Не вдалося підтвердити", body: "Цей GitHub вже підтверджено іншим профілем." },
      busy: { title: "Забагато спроб", body: "Зачекайте трохи й спробуйте знову." },
      error: { title: "Щось пішло не так", body: "Не вдалося підтвердити GitHub. Спробуйте ще раз трохи пізніше." },
    },
    toProfile: "До профілю",
    toHome: "На головну",
  },
  en: {
    statuses: {
      ok: { title: "GitHub verified", body: "Done! Your GitHub card now shows on your profile. If you started in the app, just switch back to it." },
      denied: { title: "Verification cancelled", body: "You didn’t grant access on GitHub, so nothing changed. You can try again any time." },
      expired: { title: "This link has expired", body: "Verification lasts 10 minutes and only works in the browser where it was started. Please start again from your profile." },
      taken: { title: "Couldn’t verify", body: "This GitHub account is already verified by another profile." },
      busy: { title: "Too many attempts", body: "Please wait a little and try again." },
      error: { title: "Something went wrong", body: "We couldn’t verify your GitHub. Please try again a bit later." },
    },
    toProfile: "Back to profile",
    toHome: "Home",
  },
  ru: {
    statuses: {
      ok: { title: "GitHub подтверждён", body: "Готово! Карточка GitHub теперь видна в вашем профиле. Если вы начинали в приложении, просто вернитесь в него." },
      denied: { title: "Подтверждение отменено", body: "Вы не дали разрешение на GitHub, поэтому ничего не изменилось. Попробовать снова можно в любой момент." },
      expired: { title: "Ссылка устарела", body: "Подтверждение действует 10 минут и работает только в том браузере, где его начали. Начните заново из профиля." },
      taken: { title: "Не удалось подтвердить", body: "Этот GitHub уже подтверждён другим профилем." },
      busy: { title: "Слишком много попыток", body: "Подождите немного и попробуйте снова." },
      error: { title: "Что-то пошло не так", body: "Не удалось подтвердить GitHub. Попробуйте ещё раз чуть позже." },
    },
    toProfile: "В профиль",
    toHome: "На главную",
  },
  de: {
    statuses: {
      ok: { title: "GitHub bestätigt", body: "Fertig! Ihre GitHub-Karte erscheint jetzt in Ihrem Profil. Wenn Sie in der App gestartet haben, wechseln Sie einfach dorthin zurück." },
      denied: { title: "Bestätigung abgebrochen", body: "Sie haben den Zugriff auf GitHub nicht erlaubt, daher hat sich nichts geändert. Sie können es jederzeit erneut versuchen." },
      expired: { title: "Der Link ist abgelaufen", body: "Die Bestätigung gilt 10 Minuten und funktioniert nur in dem Browser, in dem sie gestartet wurde. Bitte starten Sie erneut in Ihrem Profil." },
      taken: { title: "Bestätigung nicht möglich", body: "Dieses GitHub-Konto ist bereits von einem anderen Profil bestätigt." },
      busy: { title: "Zu viele Versuche", body: "Bitte warten Sie einen Moment und versuchen Sie es erneut." },
      error: { title: "Etwas ist schiefgelaufen", body: "Wir konnten Ihr GitHub nicht bestätigen. Bitte versuchen Sie es später erneut." },
    },
    toProfile: "Zum Profil",
    toHome: "Zur Startseite",
  },
  es: {
    statuses: {
      ok: { title: "GitHub verificado", body: "¡Listo! Tu tarjeta de GitHub ya se muestra en tu perfil. Si empezaste en la app, simplemente vuelve a ella." },
      denied: { title: "Verificación cancelada", body: "No diste permiso en GitHub, así que no ha cambiado nada. Puedes intentarlo de nuevo cuando quieras." },
      expired: { title: "El enlace ha caducado", body: "La verificación dura 10 minutos y solo funciona en el navegador donde se inició. Empieza de nuevo desde tu perfil." },
      taken: { title: "No se pudo verificar", body: "Esta cuenta de GitHub ya está verificada por otro perfil." },
      busy: { title: "Demasiados intentos", body: "Espera un momento e inténtalo de nuevo." },
      error: { title: "Algo salió mal", body: "No pudimos verificar tu GitHub. Inténtalo de nuevo un poco más tarde." },
    },
    toProfile: "Ir al perfil",
    toHome: "Inicio",
  },
  fr: {
    statuses: {
      ok: { title: "GitHub vérifié", body: "C’est fait ! Votre carte GitHub s’affiche désormais sur votre profil. Si vous avez commencé dans l’appli, il suffit d’y retourner." },
      denied: { title: "Vérification annulée", body: "Vous n’avez pas autorisé l’accès sur GitHub, rien n’a donc changé. Vous pouvez réessayer à tout moment." },
      expired: { title: "Le lien a expiré", body: "La vérification dure 10 minutes et ne fonctionne que dans le navigateur où elle a été lancée. Recommencez depuis votre profil." },
      taken: { title: "Vérification impossible", body: "Ce compte GitHub est déjà vérifié par un autre profil." },
      busy: { title: "Trop de tentatives", body: "Patientez un instant, puis réessayez." },
      error: { title: "Une erreur s’est produite", body: "Nous n’avons pas pu vérifier votre GitHub. Réessayez un peu plus tard." },
    },
    toProfile: "Retour au profil",
    toHome: "Accueil",
  },
  pl: {
    statuses: {
      ok: { title: "GitHub potwierdzony", body: "Gotowe! Karta GitHub jest teraz widoczna w Twoim profilu. Jeśli zaczynałeś w aplikacji, po prostu do niej wróć." },
      denied: { title: "Potwierdzenie anulowane", body: "Nie udzieliłeś zgody na GitHubie, więc nic się nie zmieniło. Możesz spróbować ponownie w dowolnej chwili." },
      expired: { title: "Link wygasł", body: "Potwierdzenie działa 10 minut i tylko w przeglądarce, w której je rozpoczęto. Zacznij od nowa z poziomu profilu." },
      taken: { title: "Nie udało się potwierdzić", body: "To konto GitHub jest już potwierdzone przez inny profil." },
      busy: { title: "Zbyt wiele prób", body: "Poczekaj chwilę i spróbuj ponownie." },
      error: { title: "Coś poszło nie tak", body: "Nie udało się potwierdzić GitHuba. Spróbuj ponownie nieco później." },
    },
    toProfile: "Do profilu",
    toHome: "Strona główna",
  },
  ptBR: {
    statuses: {
      ok: { title: "GitHub verificado", body: "Pronto! Seu cartão do GitHub já aparece no perfil. Se você começou pelo app, é só voltar a ele." },
      denied: { title: "Verificação cancelada", body: "Você não autorizou o acesso no GitHub, então nada mudou. Você pode tentar de novo quando quiser." },
      expired: { title: "O link expirou", body: "A verificação dura 10 minutos e só funciona no navegador em que foi iniciada. Comece de novo pelo seu perfil." },
      taken: { title: "Não foi possível verificar", body: "Esta conta do GitHub já foi verificada por outro perfil." },
      busy: { title: "Muitas tentativas", body: "Aguarde um pouco e tente de novo." },
      error: { title: "Algo deu errado", body: "Não conseguimos verificar seu GitHub. Tente novamente um pouco mais tarde." },
    },
    toProfile: "Ir para o perfil",
    toHome: "Início",
  },
  zh: {
    statuses: {
      ok: { title: "GitHub 已验证", body: "完成！您的 GitHub 卡片现已显示在个人资料中。如果您是从应用开始的，返回应用即可。" },
      denied: { title: "验证已取消", body: "您没有在 GitHub 上授权，因此没有任何更改。您可以随时重试。" },
      expired: { title: "链接已过期", body: "验证有效期为 10 分钟，且只能在发起验证的浏览器中完成。请从个人资料重新开始。" },
      taken: { title: "无法验证", body: "该 GitHub 账号已被另一个个人资料验证。" },
      busy: { title: "尝试次数过多", body: "请稍等片刻后再试。" },
      error: { title: "出了点问题", body: "我们无法验证您的 GitHub，请稍后再试。" },
    },
    toProfile: "返回个人资料",
    toHome: "首页",
  },
};

export function GithubVerifyResult({ status }: { status: VerifyStatus }) {
  const lang = useActiveLocale();
  const s = STRINGS[lang];
  const copy = s.statuses[status];
  const [username, setUsername] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && typeof d.username === "string") setUsername(d.username);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const ok = status === "ok";

  return (
    <div
      className={`flex flex-col items-center rounded-card bg-card p-8 text-center shadow-sm transition-all duration-500 ease-out dark:border dark:border-neutral-800 dark:bg-neutral-900 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          ok ? "bg-accent/10 text-accent" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
        }`}
        aria-hidden="true"
      >
        {ok ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5" />
            <path d="M12 16.5h.01" />
          </svg>
        )}
      </span>
      <h1 className="mt-5 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{copy.title}</h1>
      <p className="mt-2 text-sm text-ink-faint">{copy.body}</p>
      <Link
        href={username ? profileHref(username) : "/"}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-neutral-700 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {username ? s.toProfile : s.toHome}
      </Link>
    </div>
  );
}

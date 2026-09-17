// components/account-danger-zone.tsx
//
// 2026-09-13 (Александр: "В редактировании профиля надо добавить
// возможность его удалить в самом низу. Это надо сделать умно с
// начальным предложением просто деактивировать, не удаляя"), плюс три
// скриншота того же экрана из приложения -- «Деактивувати акаунт
// замість видалення?» с двумя пояснениями и двумя кнопками. Здесь тот
// же порядок разговора, что и там.
//
// Важное отличие от приложения, и оно намеренное. В приложении ОБЕ
// кнопки того экрана зовут один и тот же запрос -- account.delete
// (lib/features/settings/presentation/components/
// styled_deactive_account_modal_item.dart: и PrimaryButton, и
// OutlineButton вызывают deactivate(); а deactivate в
// lib/core/constants/api_constants.dart -- это адрес account.delete).
// То есть «деактивувати» там удаляет навсегда, хотя текст обещает
// «доки ви не ввійдете знову». Здесь кнопки делают разное:
//
//   «Приховати профіль» -> /api/account/visibility, обратимо;
//   «Видалити акаунт»   -> /api/account/delete, безвозвратно, и только
//                          после второго подтверждения.
//
// Отдельный файл, а не ещё триста строк внутри components/profile-
// editor.tsx (там и так под три тысячи): у этого блока своя работа и
// свои запросы, к остальным полям профиля он не имеет отношения.
"use client";

import { useEffect, useState } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { createPortal } from "react-dom";
import { type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

type Key =
  | "sectionTitle"
  | "hiddenNow"
  | "showAgain"
  | "deleteAccount"
  | "modalTitle"
  | "hideTitle"
  | "hideText"
  | "deleteTitle"
  | "deleteText"
  | "hideAction"
  | "showAction"
  | "cancel"
  | "confirmTitle"
  | "confirmText"
  | "confirmAction"
  | "working"
  | "failed"
  | "notSupported";

const STRINGS: Record<Key, Record<Locale, string>> = {
  sectionTitle: {
    uk: "Акаунт", en: "Account", ru: "Аккаунт", de: "Konto", es: "Cuenta",
    fr: "Compte", pl: "Konto", ptBR: "Conta", zh: "账户",
  },
  hiddenNow: {
    uk: "Профіль прихований з пошуку", en: "Your profile is hidden from search",
    ru: "Профиль скрыт из поиска", de: "Dein Profil ist aus der Suche ausgeblendet",
    es: "Tu perfil está oculto en la búsqueda", fr: "Votre profil est masqué dans la recherche",
    pl: "Twój profil jest ukryty w wyszukiwaniu", ptBR: "Seu perfil está oculto na busca",
    zh: "你的资料已从搜索中隐藏",
  },
  showAgain: {
    uk: "Показати профіль", en: "Show profile again", ru: "Показать профиль",
    de: "Profil wieder zeigen", es: "Mostrar perfil de nuevo", fr: "Réafficher le profil",
    pl: "Pokaż profil ponownie", ptBR: "Mostrar perfil novamente", zh: "重新显示资料",
  },
  deleteAccount: {
    uk: "Видалити акаунт", en: "Delete account", ru: "Удалить аккаунт", de: "Konto löschen",
    es: "Eliminar cuenta", fr: "Supprimer le compte", pl: "Usuń konto", ptBR: "Excluir conta",
    zh: "删除账户",
  },
  modalTitle: {
    uk: "Приховати профіль замість видалення?", en: "Hide your profile instead of deleting?",
    ru: "Скрыть профиль вместо удаления?", de: "Profil ausblenden statt löschen?",
    es: "¿Ocultar tu perfil en lugar de eliminarlo?", fr: "Masquer votre profil plutôt que le supprimer ?",
    pl: "Ukryć profil zamiast go usuwać?", ptBR: "Ocultar seu perfil em vez de excluir?",
    zh: "隐藏资料而不是删除？",
  },
  hideTitle: {
    uk: "Приховати — тимчасово", en: "Hiding is temporary", ru: "Скрыть — временно",
    de: "Ausblenden ist vorübergehend", es: "Ocultar es temporal", fr: "Masquer est temporaire",
    pl: "Ukrycie jest tymczasowe", ptBR: "Ocultar é temporário", zh: "隐藏是临时的",
  },
  hideText: {
    uk: "Профіль зникне з пошуку та зі списків. Чати, дописи й підписки лишаються. Повернути — однією кнопкою тут же.",
    en: "Your profile disappears from search and listings. Chats, posts and contacts stay. One button here brings it back.",
    ru: "Профиль исчезнет из поиска и списков. Чаты, дописи и контакты останутся. Вернуть — одной кнопкой здесь же.",
    de: "Dein Profil verschwindet aus Suche und Listen. Chats, Beiträge und Kontakte bleiben. Ein Klick hier holt es zurück.",
    es: "Tu perfil desaparece de la búsqueda y de las listas. Chats, publicaciones y contactos siguen ahí. Un botón aquí lo devuelve.",
    fr: "Votre profil disparaît de la recherche et des listes. Discussions, publications et contacts restent. Un bouton ici le rétablit.",
    pl: "Profil znika z wyszukiwania i list. Czaty, posty i kontakty zostają. Jeden przycisk tutaj go przywraca.",
    ptBR: "Seu perfil some da busca e das listas. Conversas, publicações e contatos continuam. Um botão aqui traz de volta.",
    zh: "你的资料会从搜索和列表中消失。聊天、帖子和联系人都保留。在这里一键即可恢复。",
  },
  deleteTitle: {
    uk: "Видалення — назавжди", en: "Deleting is permanent", ru: "Удаление — навсегда",
    de: "Löschen ist endgültig", es: "Eliminar es permanente", fr: "La suppression est définitive",
    pl: "Usunięcie jest trwałe", ptBR: "A exclusão é permanente", zh: "删除是永久的",
  },
  deleteText: {
    uk: "Акаунт закриється, нік і пошта звільняться, усі сеанси обірвуться. Увійти знову тією ж поштою вже не вийде.",
    en: "The account closes, your username and email are released, every session ends. Signing back in with the same email will not work.",
    ru: "Аккаунт закроется, ник и почта освободятся, все сеансы оборвутся. Войти снова той же почтой уже не выйдет.",
    de: "Das Konto wird geschlossen, Nutzername und E-Mail werden freigegeben, alle Sitzungen enden. Eine erneute Anmeldung mit derselben E-Mail ist nicht möglich.",
    es: "La cuenta se cierra, tu usuario y correo quedan libres y todas las sesiones terminan. No podrás volver a entrar con el mismo correo.",
    fr: "Le compte est fermé, votre identifiant et votre e-mail sont libérés, toutes les sessions prennent fin. Vous ne pourrez plus vous reconnecter avec cet e-mail.",
    pl: "Konto zostanie zamknięte, nazwa i e-mail zwolnione, wszystkie sesje zakończone. Ponowne logowanie tym samym e-mailem nie zadziała.",
    ptBR: "A conta é encerrada, seu nome de usuário e e-mail são liberados e todas as sessões terminam. Não será possível entrar de novo com o mesmo e-mail.",
    zh: "账户将被关闭，用户名和邮箱被释放，所有会话结束。无法再用同一邮箱登录。",
  },
  hideAction: {
    uk: "Приховати профіль", en: "Hide my profile", ru: "Скрыть профиль", de: "Profil ausblenden",
    es: "Ocultar mi perfil", fr: "Masquer mon profil", pl: "Ukryj profil", ptBR: "Ocultar meu perfil",
    zh: "隐藏我的资料",
  },
  showAction: {
    uk: "Показати профіль", en: "Show my profile", ru: "Показать профиль", de: "Profil wieder zeigen",
    es: "Mostrar mi perfil", fr: "Réafficher mon profil", pl: "Pokaż profil", ptBR: "Mostrar meu perfil",
    zh: "显示我的资料",
  },
  cancel: {
    uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar",
    fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消",
  },
  confirmTitle: {
    uk: "Точно видалити акаунт?", en: "Delete the account for good?", ru: "Точно удалить аккаунт?",
    de: "Konto endgültig löschen?", es: "¿Eliminar la cuenta definitivamente?",
    fr: "Supprimer définitivement le compte ?", pl: "Na pewno usunąć konto?",
    ptBR: "Excluir a conta definitivamente?", zh: "确定永久删除账户？",
  },
  confirmText: {
    uk: "Це не можна скасувати. Якщо не впевнені — приховайте профіль, його завжди можна повернути.",
    en: "This cannot be undone. If you are unsure, hide your profile instead — that is always reversible.",
    ru: "Это нельзя отменить. Если не уверены — скройте профиль, его всегда можно вернуть.",
    de: "Das lässt sich nicht rückgängig machen. Im Zweifel blende dein Profil aus — das ist jederzeit umkehrbar.",
    es: "Esto no se puede deshacer. Si dudas, oculta tu perfil: eso siempre es reversible.",
    fr: "C'est irréversible. En cas de doute, masquez votre profil : cela se défait à tout moment.",
    pl: "Tego nie da się cofnąć. Jeśli nie masz pewności, ukryj profil — to zawsze można odwrócić.",
    ptBR: "Isso não pode ser desfeito. Na dúvida, oculte seu perfil: isso é sempre reversível.",
    zh: "此操作无法撤销。如果不确定，请改为隐藏资料，随时可以恢复。",
  },
  confirmAction: {
    uk: "Так, видалити назавжди", en: "Yes, delete permanently", ru: "Да, удалить навсегда",
    de: "Ja, endgültig löschen", es: "Sí, eliminar definitivamente", fr: "Oui, supprimer définitivement",
    pl: "Tak, usuń na zawsze", ptBR: "Sim, excluir para sempre", zh: "是的，永久删除",
  },
  working: {
    uk: "Хвилинку…", en: "Working…", ru: "Минутку…", de: "Einen Moment…", es: "Un momento…",
    fr: "Un instant…", pl: "Chwileczkę…", ptBR: "Um momento…", zh: "请稍候…",
  },
  failed: {
    uk: "Не вдалося. Спробуйте ще раз", en: "Didn't work. Please try again",
    ru: "Не получилось. Попробуйте ещё раз", de: "Hat nicht geklappt. Bitte erneut versuchen",
    es: "No funcionó. Inténtalo de nuevo", fr: "Échec. Réessayez",
    pl: "Nie udało się. Spróbuj ponownie", ptBR: "Não deu certo. Tente de novo",
    zh: "没有成功，请重试",
  },
  notSupported: {
    uk: "Приховування ще недоступне — оновлення сервера в дорозі",
    en: "Hiding isn't available yet — the server update is on its way",
    ru: "Скрытие пока недоступно — обновление сервера в пути",
    de: "Ausblenden ist noch nicht verfügbar — das Server-Update kommt noch",
    es: "Ocultar aún no está disponible: la actualización del servidor está en camino",
    fr: "Le masquage n'est pas encore disponible — la mise à jour du serveur arrive",
    pl: "Ukrywanie nie jest jeszcze dostępne — aktualizacja serwera w drodze",
    ptBR: "Ocultar ainda não está disponível — a atualização do servidor está a caminho",
    zh: "隐藏功能尚未开放 — 服务器更新即将到来",
  },
};

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
      <path d="M9.4 5.2A9.7 9.7 0 0112 5c5 0 9 4.5 9 7a12 12 0 01-2.6 3.6M6.2 6.7C3.9 8.2 3 10.4 3 12c0 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M12 4.5L2.8 20h18.4L12 4.5z" />
      <path d="M12 10v4.5M12 17.3h.01" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  );
}

// 2026-09-14 (Александр: «Еще добавь кнопку "отменить", или крестик
// сверху закрытия. С анимацией при наведении»). Из первого шага окна
// выйти можно было только кликом по затемнению -- на телефоне это
// вообще не читается как «закрыть». Крестик здесь ровно тот же, что в
// «поділитися» и в «новий чат»: круглая подложка на hover, сам
// крестик поворачивается на четверть. Плюс Escape.
function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-4 w-4 transition-transform duration-200 ease-out group-hover/close:rotate-90 motion-reduce:transition-none"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function AccountDangerZone({ lang, initialHidden }: { lang: Locale; initialHidden: boolean }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [open, setOpen] = useState(false);
  // Второй шаг подтверждения живёт отдельным состоянием, а не заменой
  // окна: назад из него можно вернуться, ничего не потеряв.
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<Key | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirming(false);
    setErrorKey(null);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // busy -- запрос уже ушёл; закрывать окно под ним нельзя, close()
      // это и так проверяет, но лишний preventDefault тут ни к чему.
      if (busy) return;
      e.preventDefault();
      close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  async function toggleHidden(next: boolean) {
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const res = await authFetch("/api/account/visibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hidden: next }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setHidden(next);
        setOpen(false);
        setConfirming(false);
        return;
      }
      setErrorKey(data?.message === "not_supported_yet" ? "notSupported" : "failed");
    } catch {
      setErrorKey("failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const res = await authFetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        // Полная перезагрузка, а не router.push: сессии больше нет, и
        // всё, что держится в памяти вкладки, нужно выбросить.
        window.location.href = "/";
        return;
      }
      setErrorKey("failed");
    } catch {
      setErrorKey("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
      <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.sectionTitle[lang]}</div>

      {hidden && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
          <span className="flex items-center gap-2">
            <EyeOffIcon />
            {STRINGS.hiddenNow[lang]}
          </span>
          <button
            type="button"
            onClick={() => void toggleHidden(false)}
            disabled={busy}
            className="font-medium text-accent transition hover:opacity-80 disabled:opacity-60"
          >
            {STRINGS.showAgain[lang]}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-2 rounded-xl px-1 py-2 text-sm font-medium text-red-600 transition hover:opacity-80 dark:text-red-400"
      >
        <TrashIcon />
        {STRINGS.deleteAccount[lang]}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(close)}>
            <div
              className="animate-modal-in flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-5 shadow-xl dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок вынесен из обеих веток: он в любом случае один,
                  а крестик должен стоять на одном и том же месте и на
                  первом шаге, и на подтверждении удаления. */}
              <div className="flex items-start gap-3">
                <h2 className="min-w-0 flex-1 text-[19px] font-bold leading-snug text-neutral-900 dark:text-neutral-50">
                  {confirming ? STRINGS.confirmTitle[lang] : STRINGS.modalTitle[lang]}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  aria-label={STRINGS.cancel[lang]}
                  className="group/close -mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-900 active:scale-90 disabled:cursor-default disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-neutral-50"
                >
                  <CloseIcon />
                </button>
              </div>

              {!confirming ? (
                <>
                  <div className="flex gap-3 text-neutral-500 dark:text-neutral-400">
                    <EyeOffIcon />
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.hideTitle[lang]}</div>
                      <p className="mt-0.5 text-[13px] leading-snug">{STRINGS.hideText[lang]}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 text-neutral-500 dark:text-neutral-400">
                    <WarningIcon />
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.deleteTitle[lang]}</div>
                      <p className="mt-0.5 text-[13px] leading-snug">{STRINGS.deleteText[lang]}</p>
                    </div>
                  </div>

                  {errorKey && <p className="text-[13px] text-red-600 dark:text-red-400">{STRINGS[errorKey][lang]}</p>}

                  <button
                    type="button"
                    onClick={() => void toggleHidden(!hidden)}
                    disabled={busy}
                    className="mt-1 w-full rounded-full bg-accent py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? STRINGS.working[lang] : hidden ? STRINGS.showAction[lang] : STRINGS.hideAction[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorKey(null);
                      setConfirming(true);
                    }}
                    disabled={busy}
                    className="-mt-1 w-full rounded-full py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    {STRINGS.deleteAccount[lang]}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{STRINGS.confirmText[lang]}</p>

                  {errorKey && <p className="text-[13px] text-red-600 dark:text-red-400">{STRINGS[errorKey][lang]}</p>}

                  <button
                    type="button"
                    onClick={() => void deleteAccount()}
                    disabled={busy}
                    className="w-full rounded-full bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {busy ? STRINGS.working[lang] : STRINGS.confirmAction[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="-mt-2 w-full rounded-full py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {STRINGS.cancel[lang]}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

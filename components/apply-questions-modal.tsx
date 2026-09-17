"use client";

// components/apply-questions-modal.tsx
//
// Александр, 17.09.2026 (видео с телефона + «ДА» на разбор формата):
// вопросы к отклику показывались на странице вакансии списком, а
// ответить было негде -- отклик уходил шаблонным текстом мимо них.
//
// Здесь повторён флоу приложения, а не придуман свой:
//   * один вопрос на шаг, сверху зелёная полоса прогресса;
//   * на последнем шаге заголовок меняется на «Почти готово» и
//     появляется предупреждение, что ответы нельзя изменить;
//   * внизу кружок «назад», кружок «проверить ответы» и главная
//     кнопка «Далее» / «Отправить»;
//   * корзина очищает все ответы (с подтверждением);
//   * крестик спрашивает, выходить ли, и сохраняет черновик.
// Все подписи взяты из ARB-файлов приложения (ключи
// jobPostApplyModal*), чтобы web и телефон говорили одними словами.
//
// Само сообщение собирает сервер -- app/api/chats/send/route.ts,
// ветка `application`: точная копия buildApplicationMessageEntities из
// lib/features/posts/backend_utils/apply_utils.dart.
//
// Черновик лежит в localStorage (по одному на вакансию): приложение
// обещает «ответы сохранятся как черновик», и без этого обещание было
// бы ложью. Любое обращение к хранилищу обёрнуто в try/catch -- в
// приватном окне оно бросает.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

const STRINGS = {
  title: {
    uk: "Кілька швидких запитань", en: "A few quick questions", ru: "Пара быстрых вопросов",
    de: "Ein paar kurze Fragen", es: "Unas preguntas rápidas", fr: "Quelques questions rapides",
    pl: "Kilka szybkich pytań", ptBR: "Algumas perguntas rápidas", zh: "几个简单问题",
  },
  almostDone: {
    uk: "Майже готово", en: "Almost done", ru: "Почти готово", de: "Fast fertig",
    es: "Ya casi está", fr: "Presque fini", pl: "Już prawie koniec", ptBR: "Quase lá", zh: "即将完成",
  },
  lastStepSubtitle: {
    uk: "Відповіді не можна редагувати після надсилання.",
    en: "Answers can't be edited after submission.",
    ru: "Ответы нельзя изменить после отправки.",
    de: "Antworten können nach dem Absenden nicht mehr bearbeitet werden.",
    es: "Las respuestas no se pueden editar tras enviarlas.",
    fr: "Les réponses ne peuvent pas être modifiées après l'envoi.",
    pl: "Po wysłaniu odpowiedzi nie można ich edytować.",
    ptBR: "As respostas não podem ser editadas após o envio.",
    zh: "提交后无法修改答案。",
  },
  reviewTitle: {
    uk: "Перевірте свої відповіді", en: "Review your answers", ru: "Проверьте свои ответы",
    de: "Prüfe deine Antworten", es: "Revisa tus respuestas", fr: "Relis tes réponses",
    pl: "Sprawdź swoje odpowiedzi", ptBR: "Revise suas respostas", zh: "查看您的答案",
  },
  submit: {
    uk: "Надіслати", en: "Submit", ru: "Отправить", de: "Absenden", es: "Enviar",
    fr: "Envoyer", pl: "Wyślij", ptBR: "Enviar", zh: "提交",
  },
  next: {
    uk: "Далі", en: "Next", ru: "Далее", de: "Weiter", es: "Siguiente", fr: "Suivant",
    pl: "Dalej", ptBR: "Avançar", zh: "下一步",
  },
  clearTitle: {
    uk: "Очистити відповіді?", en: "Clear answers?", ru: "Очистить ответы?",
    de: "Antworten löschen?", es: "¿Borrar las respuestas?", fr: "Effacer les réponses ?",
    pl: "Wyczyścić odpowiedzi?", ptBR: "Limpar respostas?", zh: "清除答案？",
  },
  clearSubtitle: {
    uk: "Усі ваші відповіді буде видалено.", en: "This will delete all your answers.",
    ru: "Это удалит все ваши ответы.", de: "Damit werden alle deine Antworten gelöscht.",
    es: "Se eliminarán todas tus respuestas.", fr: "Toutes tes réponses seront supprimées.",
    pl: "Spowoduje to usunięcie wszystkich Twoich odpowiedzi.",
    ptBR: "Isso vai apagar todas as suas respostas.", zh: "这将删除您的所有答案。",
  },
  clearConfirm: {
    uk: "Очистити", en: "Clear", ru: "Очистить", de: "Löschen", es: "Borrar", fr: "Effacer",
    pl: "Wyczyść", ptBR: "Limpar", zh: "清除",
  },
  leaveTitle: {
    uk: "Покинути заповнення?", en: "Leave application?", ru: "Выйти из заполнения?",
    de: "Bewerbung verlassen?", es: "¿Salir de la candidatura?", fr: "Quitter la candidature ?",
    pl: "Opuścić aplikację?", ptBR: "Sair da candidatura?", zh: "退出填写？",
  },
  leaveSubtitle: {
    uk: "Ваші відповіді збережуться в чернетці.", en: "Your answers will be saved as a draft.",
    ru: "Ваши ответы сохранятся как черновик.", de: "Deine Antworten werden als Entwurf gespeichert.",
    es: "Tus respuestas se guardarán como borrador.", fr: "Tes réponses seront enregistrées comme brouillon.",
    pl: "Twoje odpowiedzi zostaną zapisane jako wersja robocza.",
    ptBR: "Suas respostas serão salvas como rascunho.", zh: "您的答案将保存为草稿。",
  },
  leaveConfirm: {
    uk: "Вийти", en: "Leave", ru: "Выйти", de: "Verlassen", es: "Salir", fr: "Quitter",
    pl: "Opuść", ptBR: "Sair", zh: "退出",
  },
  leaveCancel: {
    uk: "Продовжити", en: "Keep answering", ru: "Продолжить", de: "Weiter antworten",
    es: "Seguir respondiendo", fr: "Continuer à répondre", pl: "Odpowiadaj dalej",
    ptBR: "Continuar respondendo", zh: "继续回答",
  },
  failed: {
    uk: "Щось пішло не так. Будь ласка, спробуйте знову",
    en: "Something went wrong. Please, try again",
    ru: "Что-то пошло не так. Пожалуйста, попробуйте снова",
    de: "Etwas ist schiefgelaufen. Bitte versuch es erneut",
    es: "Algo salió mal. Inténtalo de nuevo",
    fr: "Une erreur est survenue. Réessaie",
    pl: "Coś poszło nie tak. Spróbuj ponownie",
    ptBR: "Algo deu errado. Tente novamente",
    zh: "出现错误。请重试",
  },
  reviewAria: {
    uk: "Перевірити відповіді", en: "Review answers", ru: "Проверить ответы",
    de: "Antworten prüfen", es: "Revisar respuestas", fr: "Relire les réponses",
    pl: "Sprawdź odpowiedzi", ptBR: "Revisar respostas", zh: "查看答案",
  },
  backAria: {
    uk: "Назад", en: "Back", ru: "Назад", de: "Zurück", es: "Atrás", fr: "Retour",
    pl: "Wstecz", ptBR: "Voltar", zh: "返回",
  },
  clearAria: {
    uk: "Очистити відповіді", en: "Clear answers", ru: "Очистить ответы",
    de: "Antworten löschen", es: "Borrar respuestas", fr: "Effacer les réponses",
    pl: "Wyczyść odpowiedzi", ptBR: "Limpar respostas", zh: "清除答案",
  },
  closeAria: {
    uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer",
    pl: "Zamknij", ptBR: "Fechar", zh: "关闭",
  },
} satisfies Record<string, Record<Locale, string>>;

/** Зелёный акцент полосы прогресса -- applyQuestionsAccentGreen из приложения. */
const ACCENT_GREEN = "#23D28C";

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

function draftKey(postId: string): string {
  return `a1:apply-draft:${postId}`;
}

function readDraft(postId: string, count: number): string[] {
  const empty = Array.from({ length: count }, () => "");
  try {
    const raw = window.localStorage.getItem(draftKey(postId));
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return empty;
    return empty.map((fallback, i) => {
      const value = parsed[i];
      return typeof value === "string" ? value : fallback;
    });
  } catch {
    return empty;
  }
}

export function ApplyQuestionsModal({
  postId,
  postTitle,
  questions,
  authorUserId,
  onClose,
  onSubmitted,
}: {
  postId: string;
  postTitle: string;
  questions: string[];
  authorUserId: string;
  onClose: () => void;
  /** Отклик ушёл -- родитель показывает своё «спасибо». */
  onSubmitted: () => void;
}) {
  const lang = useActiveLocale();
  const [answers, setAnswers] = useState<string[]>(() =>
    Array.from({ length: questions.length }, () => ""),
  );
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [errored, setErrored] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lastIndex = questions.length - 1;
  const isLastStep = step === lastIndex;
  const current = answers[step] ?? "";
  const hasAnything = useMemo(() => answers.some((a) => a.trim().length > 0), [answers]);
  const allAnswered = useMemo(() => answers.every((a) => a.trim().length > 0), [answers]);

  // Черновик: читаем один раз при открытии, пишем на каждое изменение.
  useEffect(() => {
    setAnswers(readDraft(postId, questions.length));
  }, [postId, questions.length]);

  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey(postId), JSON.stringify(answers));
    } catch {
      // Приватное окно или запрет на хранилище -- черновика просто не будет.
    }
  }, [postId, answers]);

  // Страница под окном не должна прокручиваться -- как в остальных
  // модалках этого приложения.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (!reviewing) textareaRef.current?.focus();
  }, [step, reviewing]);

  const requestClose = useCallback(() => {
    if (hasAnything) {
      setLeaveOpen(true);
      return;
    }
    onClose();
  }, [hasAnything, onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (clearOpen) {
        setClearOpen(false);
        return;
      }
      if (leaveOpen) {
        setLeaveOpen(false);
        return;
      }
      requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearOpen, leaveOpen, requestClose]);

  function setAnswer(value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === step ? value : a)));
  }

  function clearAll() {
    setAnswers(Array.from({ length: questions.length }, () => ""));
    setStep(0);
    setReviewing(false);
    setClearOpen(false);
  }

  function goBack() {
    if (reviewing) {
      setReviewing(false);
      return;
    }
    if (step === 0) {
      requestClose();
      return;
    }
    setStep((s) => s - 1);
  }

  async function submit() {
    if (sending || !allAnswered) return;
    setSending(true);
    setErrored(false);
    try {
      const opened = await authFetch("/api/chats/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authorUserId }),
      });
      const openedData = await opened.json().catch(() => null);
      if (!openedData?.ok || typeof openedData.chatId !== "string") throw new Error("open_failed");

      const sent = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: openedData.chatId,
          application: {
            postId,
            postTitle,
            answers: questions.map((question, i) => ({
              question,
              answer: (answers[i] ?? "").trim(),
            })),
          },
        }),
      });
      const sentData = await sent.json().catch(() => null);
      if (!sentData?.ok) throw new Error("send_failed");

      // Отклик ушёл -- черновик больше не нужен.
      try {
        window.localStorage.removeItem(draftKey(postId));
      } catch {
        // не страшно
      }
      onSubmitted();
    } catch {
      setErrored(true);
    } finally {
      setSending(false);
    }
  }

  const progress = reviewing ? 1 : (step + 1) / questions.length;
  const heading = reviewing
    ? STRINGS.reviewTitle[lang]
    : isLastStep
      ? STRINGS.almostDone[lang]
      : STRINGS.title[lang];

  const primaryDisabled = sending || (reviewing ? !allAnswered : current.trim().length === 0);
  const primaryLabel = reviewing || isLastStep ? STRINGS.submit[lang] : STRINGS.next[lang];

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px] dark:bg-neutral-900"
      >
        {/* Полоса прогресса -- как зелёная дуга сверху листа в приложении. */}
        <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: ACCENT_GREEN }}
          />
        </div>

        <button
          type="button"
          onClick={requestClose}
          aria-label={STRINGS.closeAria[lang]}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-neutral-500 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-400 dark:hover:bg-white/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="px-6 pb-6 pt-8">
          <p className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">{heading}</p>
          {(isLastStep || reviewing) && (
            <p className="mt-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
              {STRINGS.lastStepSubtitle[lang]}
            </p>
          )}

          {reviewing ? (
            <ul className="mt-5 flex max-h-[45vh] flex-col gap-3 overflow-y-auto">
              {questions.map((question, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewing(false);
                      setStep(i);
                    }}
                    className="w-full rounded-2xl bg-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
                  >
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {i + 1}. {question}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
                      👉 {(answers[i] ?? "").trim()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="mt-5 text-center text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {step + 1}. {questions[step]}
              </p>
              <div className="relative mt-4">
                <textarea
                  ref={textareaRef}
                  value={current}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="w-full resize-none rounded-2xl bg-neutral-100 p-4 pr-11 text-sm text-neutral-900 outline-none ring-accent/40 transition focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
                />
                {current.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAnswer("")}
                    aria-label={STRINGS.clearAria[lang]}
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-300/80 text-neutral-600 transition hover:bg-neutral-400/80 dark:bg-neutral-600 dark:text-neutral-200"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3 w-3" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}

          {errored && (
            <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">{STRINGS.failed[lang]}</p>
          )}

          {hasAnything && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                aria-label={STRINGS.clearAria[lang]}
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              aria-label={STRINGS.backAria[lang]}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            {!reviewing && hasAnything && (
              <button
                type="button"
                onClick={() => setReviewing(true)}
                aria-label={STRINGS.reviewAria[lang]}
                title={STRINGS.reviewAria[lang]}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-accent transition hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 6h2M4 12h2M4 18h2M10 6h10M10 12h10M10 18h10" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (reviewing || isLastStep) {
                  void submit();
                  return;
                }
                setStep((s) => Math.min(s + 1, lastIndex));
              }}
              disabled={primaryDisabled}
              className="h-12 flex-1 rounded-full bg-accent text-sm font-bold uppercase tracking-wide text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {primaryLabel}
            </button>
          </div>
        </div>

        {clearOpen && (
          <ConfirmLayer
            title={STRINGS.clearTitle[lang]}
            body={STRINGS.clearSubtitle[lang]}
            confirmLabel={STRINGS.clearConfirm[lang]}
            cancelLabel={STRINGS.leaveCancel[lang]}
            destructive
            onConfirm={clearAll}
            onCancel={() => setClearOpen(false)}
          />
        )}
        {leaveOpen && (
          <ConfirmLayer
            title={STRINGS.leaveTitle[lang]}
            body={STRINGS.leaveSubtitle[lang]}
            confirmLabel={STRINGS.leaveConfirm[lang]}
            cancelLabel={STRINGS.leaveCancel[lang]}
            onConfirm={onClose}
            onCancel={() => setLeaveOpen(false)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Подтверждение поверх листа -- как в приложении, не отдельным окном. */
function ConfirmLayer({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{title}</p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={
              "w-full rounded-full py-2.5 text-sm font-semibold text-white transition " +
              (destructive ? "bg-red-600 hover:bg-red-700" : "bg-accent hover:opacity-90")
            }
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

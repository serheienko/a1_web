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
// Отправка идёт методом **posts.apply** (app/api/posts/apply), ответы
// привязаны к id вопроса. Сообщение «📩 Application (…)» в чате создаёт
// БЭКЕНД сам -- приложение его не шлёт, оно только рисует оптимистичную
// копию и переходит в чат. Поэтому и здесь после успеха мы просто
// открываем чат с автором, а не отправляем второе сообщение.
//
// Черновик лежит в localStorage (по одному на вакансию): приложение
// обещает «ответы сохранятся как черновик», и без этого обещание было
// бы ложью. Любое обращение к хранилищу обёрнуто в try/catch -- в
// приватном окне оно бросает.
//
// 14.10.2026 (Александр: «человек может подать аппликацию только после
// того, как заполнит Screening Questions… репродукцию такую же, как в
// приложении»). Догнали приложение там, где сайт от него отставал:
//   * отправить нельзя, пока нет ответа на КАЖДЫЙ вопрос (раньше сайт
//     пропускал вопросы без пометки required) и пока ответ не укладывается
//     в minLength/maxLength вопроса -- иначе бэкенд всё равно откажет;
//   * при открытии -- свежие вопросы, «вы уже откликались» и черновик с
//     сервера (posts.applyGetDrafts), при «Вийти» -- черновик на сервер
//     (posts.applySaveDraft), корзина стирает его (posts.applyClearDrafts):
//     начатое в приложении продолжается на сайте и наоборот
//     (app/api/posts/apply-state);
//   * полоса прогресса -- доля заполненных ответов, ответы на экране
//     проверки правятся прямо в списке -- как в приложении.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import type { WebApplyQuestion } from "@/types/web-post";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { useActiveLocale } from "@/lib/use-active-locale";

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
  answerHint: {
    uk: "Ваша відповідь…", en: "Your answer…", ru: "Ваш ответ…", de: "Deine Antwort …",
    es: "Tu respuesta…", fr: "Ta réponse…", pl: "Twoja odpowiedź…", ptBR: "Sua resposta…",
    zh: "您的回答…",
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
  // 14.10.2026: новые подписи (в приложении их нет -- там нет и этих проверок на экране).
  minChars: {
    uk: "Ще хоча б {n} симв.", en: "At least {n} more characters", ru: "Ещё хотя бы {n} симв.",
    de: "Noch mindestens {n} Zeichen", es: "Al menos {n} caracteres más", fr: "Encore au moins {n} caractères",
    pl: "Jeszcze co najmniej {n} znaków", ptBR: "Pelo menos mais {n} caracteres", zh: "至少再输入 {n} 个字符",
  },
  needAll: {
    uk: "Щоб надіслати, дайте відповідь на всі запитання.",
    en: "Answer every question to submit.",
    ru: "Чтобы отправить, ответьте на все вопросы.",
    de: "Beantworte alle Fragen, um abzusenden.",
    es: "Responde todas las preguntas para enviar.",
    fr: "Réponds à toutes les questions pour envoyer.",
    pl: "Odpowiedz na wszystkie pytania, aby wysłać.",
    ptBR: "Responda todas as perguntas para enviar.",
    zh: "回答所有问题后才能提交。",
  },
  alreadyApplied: {
    uk: "Ви вже відгукувалися на цю вакансію. Новий відгук прийде компанії ще раз.",
    en: "You've already applied to this job. A new application will reach the company again.",
    ru: "Вы уже откликались на эту вакансию. Новый отклик придёт компании ещё раз.",
    de: "Du hast dich bereits beworben. Eine neue Bewerbung geht erneut an das Unternehmen.",
    es: "Ya te postulaste a esta oferta. Una nueva postulación volverá a llegar a la empresa.",
    fr: "Tu as déjà postulé. Une nouvelle candidature sera de nouveau envoyée à l'entreprise.",
    pl: "Już aplikowałeś na tę ofertę. Nowe zgłoszenie trafi do firmy ponownie.",
    ptBR: "Você já se candidatou. Uma nova candidatura chegará à empresa novamente.",
    zh: "您已申请过该职位。新的申请会再次发送给公司。",
  },
  loading: {
    uk: "Завантажуємо запитання…", en: "Loading questions…", ru: "Загружаем вопросы…",
    de: "Fragen werden geladen…", es: "Cargando preguntas…", fr: "Chargement des questions…",
    pl: "Ładowanie pytań…", ptBR: "Carregando perguntas…", zh: "正在加载问题…",
  },
} satisfies Record<string, Record<Locale, string>>;

/** Зелёный акцент полосы прогресса -- applyQuestionsAccentGreen из приложения. */
const ACCENT_GREEN = "#23D28C";

function draftKey(postId: string): string {
  return `a1:apply-draft:${postId}`;
}

/** Черновик лежит по id вопроса, а не по порядковому номеру: вопросы в
 *  посте могут переставить или дописать, и тогда «ответ №2» уехал бы не
 *  к тому вопросу. */
function readDraft(postId: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(draftKey(postId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeDraft(postId: string, answers: Record<string, string>) {
  try {
    if (Object.values(answers).some((v) => v.trim())) {
      window.localStorage.setItem(draftKey(postId), JSON.stringify(answers));
    } else {
      window.localStorage.removeItem(draftKey(postId));
    }
  } catch {
    // Приватное окно или запрет на хранилище -- черновика в браузере просто не будет.
  }
}

/**
 * Ответ годится: не пустой и в пределах minLength/maxLength вопроса -- те же
 * проверки, что делает бэкенд в posts.apply (длину он считает по обрезанному
 * тексту). Пустой ответ не принимает и приложение: кнопка «Далі» там
 * неактивна на любом вопросе, обязательный он или нет (14.10.2026: раньше
 * сайт пропускал вопросы без пометки required, приложение -- нет).
 */
function answerOk(q: WebApplyQuestion, text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (q.minLength != null && t.length < q.minLength) return false;
  if (q.maxLength != null && t.length > q.maxLength) return false;
  return true;
}

/** Только ответы на нынешние вопросы (вопросы могли поменять, пока черновик лежал). */
function fitDraft(questions: WebApplyQuestion[], draft: Record<string, string> | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!draft) return out;
  for (const q of questions) {
    if (typeof draft[q.id] === "string") out[q.id] = draft[q.id]!;
  }
  return out;
}

const hasText = (a: Record<string, string>) => Object.values(a).some((v) => v.trim().length > 0);

export function ApplyQuestionsModal({
  postId,
  questions: initialQuestions,
  authorUserId,
  onClose,
  onSubmitted,
}: {
  postId: string;
  questions: WebApplyQuestion[];
  authorUserId: string;
  onClose: () => void;
  /** Отклик ушёл -- родитель показывает своё «спасибо». */
  onSubmitted: () => void;
}) {
  const lang = useActiveLocale();
  const router = useRouter();
  const [questions, setQuestions] = useState<WebApplyQuestion[]>(initialQuestions);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [errored, setErrored] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lastIndex = questions.length - 1;
  const isLastStep = step === lastIndex;
  const question = questions[step];
  const current = question ? (answers[question.id] ?? "") : "";
  const hasAnything = useMemo(() => hasText(answers), [answers]);
  const filled = useMemo(
    () => questions.filter((q) => answerOk(q, answers[q.id] ?? "")).length,
    [answers, questions],
  );
  const allOk = filled === questions.length;

  // 14.10.2026: как приложение при открытии листа -- свежие вопросы с бэкенда
  // (страница могла закешироваться со старыми, а бэкенд сверяет ответы с
  // текущими), отметка «уже откликались» и черновик, сохранённый на сервере:
  // начал отвечать в приложении -- продолжил на сайте, и наоборот. Черновик
  // этого браузера важнее серверного (он свежее), серверный -- если своего нет.
  useEffect(() => {
    let alive = true;
    const local = readDraft(postId);
    (async () => {
      let qs = initialQuestions;
      let server: Record<string, string> | null = null;
      let wasApplied = false;
      try {
        const res = await authFetch(`/api/posts/apply-state?postId=${encodeURIComponent(postId)}`);
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          if (Array.isArray(data.questions) && data.questions.length > 0) qs = data.questions as WebApplyQuestion[];
          wasApplied = data.applied === true;
          if (data.draft && typeof data.draft === "object") server = data.draft as Record<string, string>;
        }
      } catch {
        // Не достучались -- отвечаем на вопросы со страницы, черновик из браузера.
      }
      if (!alive) return;
      const fromLocal = fitDraft(qs, local);
      const start = hasText(fromLocal) ? fromLocal : fitDraft(qs, server);
      setQuestions(qs);
      setApplied(wasApplied);
      setAnswers(start);
      // Открываемся на первом вопросе без ответа -- как приложение после черновика.
      const firstOpen = qs.findIndex((q) => !answerOk(q, start[q.id] ?? ""));
      setStep(firstOpen === -1 ? Math.max(0, qs.length - 1) : firstOpen);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // Вопросы со страницы нужны только как запасной вариант при открытии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    if (!loading) writeDraft(postId, answers);
  }, [loading, postId, answers]);

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
    if (!reviewing && !loading) textareaRef.current?.focus();
  }, [step, reviewing, loading]);

  /** Черновик на сервер -- как приложение при «Вийти» (posts.applySaveDraft). */
  const saveServerDraft = useCallback(() => {
    void authFetch("/api/posts/apply-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        postId,
        answers: questions.map((q) => ({ questionId: q.id, text: answers[q.id] ?? "" })),
      }),
    }).catch(() => {});
  }, [postId, questions, answers]);

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

  function setAnswerFor(id: string, value: string) {
    setErrored(false);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function clearAll() {
    setAnswers({});
    setStep(0);
    setReviewing(false);
    setClearOpen(false);
    void authFetch(`/api/posts/apply-state?postId=${encodeURIComponent(postId)}`, { method: "DELETE" }).catch(() => {});
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
    if (sending || !allOk) return;
    setSending(true);
    setErrored(false);
    try {
      // Приложение отправляет ВСЕ вопросы (applyToPost) -- повторяем.
      const res = await authFetch("/api/posts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          answers: questions.map((q) => ({
            questionId: q.id,
            text: (answers[q.id] ?? "").trim(),
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error("apply_failed");

      // Серверный черновик бэкенд стирает сам (posts.apply, clearDraft).
      writeDraft(postId, {});
      onSubmitted();

      // Сообщение с заявкой создаёт бэкенд -- ведём человека в чат, где
      // оно и появится, ровно как приложение после posts.apply.
      try {
        const opened = await authFetch("/api/chats/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authorUserId }),
        });
        const openedData = await opened.json().catch(() => null);
        if (openedData?.ok && typeof openedData.chatId === "string") {
          router.push(`/chats/${openedData.chatId}`);
        }
      } catch {
        // Чат не открылся -- отклик всё равно ушёл, человек увидит
        // «спасибо» и найдёт переписку сам.
      }
    } catch {
      setErrored(true);
    } finally {
      setSending(false);
    }
  }

  function onPrimary() {
    if (reviewing) {
      void submit();
      return;
    }
    if (isLastStep) {
      // Последний шаг, но где-то раньше ответ стёрли или он короче нужного --
      // показываем все ответы разом, а не шлём заведомый отказ.
      if (allOk) void submit();
      else setReviewing(true);
      return;
    }
    setStep((s) => Math.min(s + 1, lastIndex));
  }

  // Полоса -- доля заполненных ответов, как в приложении
  // (applicantProgressFraction: стёр ответ -- полоса укоротилась).
  const progress = questions.length ? filled / questions.length : 0;
  const heading = reviewing
    ? STRINGS.reviewTitle[lang]
    : isLastStep
      ? STRINGS.almostDone[lang]
      : STRINGS.title[lang];

  const stepBlocked = !question || !answerOk(question, current);
  const primaryDisabled = sending || loading || (reviewing ? !allOk : stepBlocked);
  const primaryLabel = reviewing || isLastStep ? STRINGS.submit[lang] : STRINGS.next[lang];

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      {...backdropDismiss(requestClose)}
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
            data-testid="apply-progress"
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
          {(isLastStep || reviewing) && !loading && (
            <p className="mt-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
              {STRINGS.lastStepSubtitle[lang]}
            </p>
          )}
          {applied && !loading && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {STRINGS.alreadyApplied[lang]}
            </p>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12" aria-live="polite">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-accent" aria-hidden="true" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{STRINGS.loading[lang]}</span>
            </div>
          ) : reviewing ? (
            // В приложении ответы на экране проверки правятся прямо в списке -- так и здесь.
            <ul className="mt-5 flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
              {questions.map((q, i) => {
                const value = answers[q.id] ?? "";
                return (
                  <li key={q.id} className="rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {i + 1}. {q.text}
                    </p>
                    <textarea
                      value={value}
                      onChange={(e) => setAnswerFor(q.id, e.target.value)}
                      rows={2}
                      maxLength={q.maxLength ?? 4000}
                      placeholder={STRINGS.answerHint[lang]}
                      aria-invalid={!answerOk(q, value)}
                      className={
                        "mt-2 w-full resize-y rounded-xl bg-white p-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-900 dark:text-neutral-100 " +
                        (answerOk(q, value) ? "ring-accent/40" : "ring-1 ring-red-400/70 focus:ring-red-400")
                      }
                    />
                    <AnswerHints q={q} value={value} lang={lang} />
                  </li>
                );
              })}
            </ul>
          ) : (
            question && (
              <>
                {/* Вопрос слева, как в приложении -- по центру только заголовок листа. */}
                <p className="mt-5 text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {step + 1}. {question.text}
                </p>
                <div className="relative mt-3">
                  <textarea
                    ref={textareaRef}
                    value={current}
                    onChange={(e) => setAnswerFor(question.id, e.target.value)}
                    onKeyDown={(e) => {
                      // Ctrl/Cmd+Enter -- «Далі», как отправка в чатах сайта.
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !primaryDisabled) {
                        e.preventDefault();
                        onPrimary();
                      }
                    }}
                    rows={5}
                    maxLength={question.maxLength ?? 4000}
                    placeholder={STRINGS.answerHint[lang]}
                    className="w-full resize-none rounded-2xl bg-neutral-100 p-4 pr-11 text-sm text-neutral-900 outline-none ring-accent/40 transition placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  {current.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAnswerFor(question.id, "")}
                      aria-label={STRINGS.clearAria[lang]}
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-300/80 text-neutral-600 transition hover:bg-neutral-400/80 dark:bg-neutral-600 dark:text-neutral-200"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3 w-3" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </div>
                <AnswerHints q={question} value={current} lang={lang} />
              </>
            )
          )}

          {reviewing && !allOk && !loading && (
            <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">{STRINGS.needAll[lang]}</p>
          )}
          {errored && (
            <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">{STRINGS.failed[lang]}</p>
          )}

          {hasAnything && !loading && (
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
            {/* Кружок «назад» и кружок «проверить ответы» появляются со
                второго шага -- на первом в приложении их нет. */}
            {(step > 0 || reviewing) && !loading && (
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
            )}
            {!reviewing && step > 0 && !loading && (
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
              onClick={onPrimary}
              disabled={primaryDisabled}
              className="relative h-12 flex-1 rounded-full bg-accent text-sm font-bold uppercase tracking-wide text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {sending ? (
                <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              ) : (
                primaryLabel
              )}
              {!reviewing && !loading && !sending && (
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-semibold opacity-70">
                  {step + 1}/{questions.length}
                </span>
              )}
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
            onConfirm={() => {
              saveServerDraft();
              onClose();
            }}
            onCancel={() => setLeaveOpen(false)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Под полем: сколько ещё набрать до minLength и счётчик до maxLength. */
function AnswerHints({ q, value, lang }: { q: WebApplyQuestion; value: string; lang: Locale }) {
  const len = value.trim().length;
  const short = q.minLength != null && len > 0 && len < q.minLength ? q.minLength - len : 0;
  if (!short && q.maxLength == null) return null;
  return (
    <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[11px]">
      <span className="text-amber-700 dark:text-amber-400">
        {short ? STRINGS.minChars[lang].replace("{n}", String(short)) : ""}
      </span>
      {q.maxLength != null && (
        <span className={len > q.maxLength ? "text-red-600" : "text-neutral-400"}>
          {len}/{q.maxLength}
        </span>
      )}
    </div>
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

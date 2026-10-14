"use client";

// components/apply-questions-cta.tsx
//
// 14.10.2026 (Александр: блок Screening Questions «отображается на сайте, но должен работать в
// связке» с откликом). Кнопка под списком «Питання до відгуку»: открывает то же окно с вопросами,
// что и «Відгукнутися» в строке действий (гость -- сначала вход, потом окно откроется само).
// Сама ничего не отправляет -- зовёт строку действий событием (lib/apply-events.ts).

import { requestApply } from "@/lib/apply-events";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { Locale } from "@/components/t";

const LABEL: Record<Locale, string> = {
  uk: "Відповісти й відгукнутися",
  en: "Answer and apply",
  ru: "Ответить и откликнуться",
  de: "Beantworten und bewerben",
  es: "Responder y postularme",
  fr: "Répondre et postuler",
  pl: "Odpowiedz i aplikuj",
  ptBR: "Responder e candidatar-se",
  zh: "回答并申请",
};

const NOTE: Record<Locale, string> = {
  uk: "Відгук надсилається лише після відповідей на всі запитання.",
  en: "The application is sent only after you answer every question.",
  ru: "Отклик отправляется только после ответов на все вопросы.",
  de: "Die Bewerbung wird erst gesendet, wenn alle Fragen beantwortet sind.",
  es: "La postulación se envía solo después de responder todas las preguntas.",
  fr: "La candidature n'est envoyée qu'après réponse à toutes les questions.",
  pl: "Zgłoszenie zostanie wysłane dopiero po odpowiedzi na wszystkie pytania.",
  ptBR: "A candidatura só é enviada depois de responder todas as perguntas.",
  zh: "回答所有问题后才会发送申请。",
};

export function ApplyQuestionsCta({ postId }: { postId: string }) {
  const lang = useActiveLocale();
  return (
    <div className="mt-3 flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => requestApply(postId)}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      >
        {LABEL[lang]}
      </button>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{NOTE[lang]}</p>
    </div>
  );
}

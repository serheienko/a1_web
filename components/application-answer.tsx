"use client";

// components/application-answer.tsx
//
// 16.10.2026 (Александр: «если внешние, то добавляем две кнопки… симпатичные, прям в эту карточку»).
// Вкладка «Мої відгуки»: человек открыл вакансию на сайте компании, а откликнулся ли -- мы не знаем.
// Спрашиваем прямо в карточке: «Так» -- вакансия остаётся в списке как отклик, «Ні» -- карточка
// плавно уходит из списка. Ответ уходит на app/api/posts/applications.
import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { Locale } from "@/components/t";

const Q: Record<Locale, string> = {
  uk: "Ви відгукнулися на цю вакансію на сайті компанії?",
  en: "Did you apply for this job on the company's site?",
  ru: "Вы откликнулись на эту вакансию на сайте компании?",
  de: "Haben Sie sich auf der Website des Unternehmens beworben?",
  es: "¿Se postuló a esta vacante en el sitio de la empresa?",
  fr: "Avez-vous postulé sur le site de l'entreprise ?",
  pl: "Czy aplikowali Państwo na tę ofertę na stronie firmy?",
  ptBR: "Você se candidatou a esta vaga no site da empresa?",
  zh: "您是否已在公司网站上申请该职位？",
};
const YES: Record<Locale, string> = { uk: "Так", en: "Yes", ru: "Да", de: "Ja", es: "Sí", fr: "Oui", pl: "Tak", ptBR: "Sim", zh: "是" };
const NO: Record<Locale, string> = { uk: "Ні", en: "No", ru: "Нет", de: "Nein", es: "No", fr: "Non", pl: "Nie", ptBR: "Não", zh: "否" };
const ERR: Record<Locale, string> = {
  uk: "Не вдалося зберегти, спробуйте ще раз.",
  en: "Couldn't save, please try again.",
  ru: "Не удалось сохранить, попробуйте ещё раз.",
  de: "Speichern fehlgeschlagen, bitte erneut versuchen.",
  es: "No se pudo guardar, inténtelo de nuevo.",
  fr: "Échec de l'enregistrement, réessayez.",
  pl: "Nie udało się zapisać, spróbuj ponownie.",
  ptBR: "Não foi possível salvar, tente novamente.",
  zh: "保存失败，请重试。",
};

export function ApplicationAnswer({ postId, onAnswered }: { postId: string; onAnswered: (applied: boolean) => void }) {
  const lang = useActiveLocale();
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [err, setErr] = useState(false);

  async function answer(action: "yes" | "no") {
    setBusy(action);
    setErr(false);
    try {
      const r = await authFetch("/api/posts/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, action }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(String(r.status));
      onAnswered(action === "yes");
    } catch {
      setErr(true);
      setBusy(null);
    }
  }

  const btn =
    "min-w-[5.5rem] rounded-full px-5 py-2 text-sm font-semibold transition duration-200 active:scale-95 disabled:opacity-60";
  return (
    <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-accent/5 px-4 py-3 dark:bg-accent/10">
      <span className="mr-auto text-sm font-medium text-neutral-800 dark:text-neutral-200">{Q[lang]}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => answer("yes")}
          className={btn + " bg-accent text-white hover:opacity-90 hover:shadow-md"}
        >
          {busy === "yes" ? "…" : YES[lang]}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => answer("no")}
          className={
            btn +
            " border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          }
        >
          {busy === "no" ? "…" : NO[lang]}
        </button>
      </div>
      {err ? <span className="w-full text-xs text-red-600 dark:text-red-400">{ERR[lang]}</span> : null}
    </div>
  );
}

"use client";

// components/report-modal.tsx
//
// Жалоба на пост или на человека. Александр, 17.09.2026: в приложении
// репорт есть, на сайте не было ни кнопки, ни ручки.
//
// Окно повторяет приложение: одно поле для деталей (необязательное),
// кнопка «Надіслати», после успеха -- тот же текст благодарности, что
// показывает апка (ключи reportSuccessTitle/reportSuccessSubtitle).
// Никакого выбора причины: в апке его тоже нет.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";

const STRINGS = {
  title: {
    uk: "Поскаржитись", en: "Report", ru: "Пожаловаться", de: "Melden", es: "Denunciar",
    fr: "Signaler", pl: "Zgłoś", ptBR: "Denunciar", zh: "举报",
  },
  placeholder: {
    uk: "Будь ласка, введіть будь-які додаткові деталі, що стосуються вашого звіту",
    en: "Please enter any additional details relevant for your report",
    ru: "Пожалуйста, введите любые дополнительные детали, относящиеся к вашему отчету",
    de: "Bitte ergänze weitere Details, die für deine Meldung relevant sind",
    es: "Añade cualquier detalle adicional relevante para tu denuncia",
    fr: "Ajoute tout détail supplémentaire utile à ton signalement",
    pl: "Podaj dodatkowe szczegóły istotne dla Twojego zgłoszenia",
    ptBR: "Informe outros detalhes relevantes para a sua denúncia",
    zh: "请输入与您的报告相关的任何其他详细信息",
  },
  send: {
    uk: "Надіслати", en: "Send", ru: "Отправить", de: "Senden", es: "Enviar", fr: "Envoyer",
    pl: "Wyślij", ptBR: "Enviar", zh: "发送",
  },
  cancel: {
    uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar",
    fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消",
  },
  successTitle: {
    uk: "Дякуємо, що допомагаєте A1 ставати кращим!",
    en: "Thank you for helping A1 become better!",
    ru: "Спасибо, что помогаете A1 стать лучше!",
    de: "Danke, dass du A1 besser machst!",
    es: "¡Gracias por ayudar a que A1 sea mejor!",
    fr: "Merci d'aider A1 à s'améliorer !",
    pl: "Dziękujemy, że pomagasz ulepszać A1!",
    ptBR: "Obrigado por ajudar o A1 a ficar melhor!",
    zh: "感谢您帮助 A1 变得更好！",
  },
  successSubtitle: {
    uk: "Ми перевіримо вашу скаргу якнайшвидше",
    en: "We will check your report ASAP",
    ru: "Мы проверим вашу жалобу как можно скорее",
    de: "Wir prüfen deine Meldung so schnell wie möglich",
    es: "Revisaremos tu informe lo antes posible",
    fr: "Nous examinerons ton signalement au plus vite",
    pl: "Sprawdzimy Twoje zgłoszenie tak szybko, jak to możliwe",
    ptBR: "Vamos analisar seu relato o quanto antes",
    zh: "我们会尽快处理您的举报",
  },
  failed: {
    uk: "Не вдалося. Спробуйте ще раз", en: "Failed — try again",
    ru: "Не удалось. Попробуйте ещё раз", de: "Fehlgeschlagen — erneut versuchen",
    es: "Error — inténtalo de nuevo", fr: "Échec — réessayez",
    pl: "Nie udało się — spróbuj ponownie", ptBR: "Falhou — tente novamente",
    zh: "失败，请重试",
  },
} satisfies Record<string, Record<Locale, string>>;

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

export function ReportModal({
  kind,
  targetId,
  onClose,
}: {
  kind: "post" | "user";
  targetId: string;
  onClose: () => void;
}) {
  const lang = useActiveLocale();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [errored, setErrored] = useState(false);
  const [sent, setSent] = useState(false);

  // Успех сам закрывается -- как всплывашка благодарности в апке.
  useEffect(() => {
    if (!sent) return;
    const handle = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(handle);
  }, [sent, onClose]);

  async function submit() {
    if (sending) return;
    setSending(true);
    setErrored(false);
    try {
      const res = await authFetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: targetId, text: text.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error("report_failed");
      setSent(true);
    } catch {
      setErrored(true);
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      {...backdropDismiss(onClose)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
      >
        {sent ? (
          <>
            <p className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {STRINGS.successTitle[lang]}
            </p>
            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
              {STRINGS.successSubtitle[lang]}
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {STRINGS.title[lang]}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={STRINGS.placeholder[lang]}
              className="mt-3 w-full resize-none rounded-2xl bg-neutral-100 p-3 text-sm text-neutral-900 outline-none ring-accent/40 transition placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
            />
            {errored && (
              <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
                {STRINGS.failed[lang]}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={sending}
                className="w-full rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {STRINGS.send[lang]}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="w-full rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {STRINGS.cancel[lang]}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

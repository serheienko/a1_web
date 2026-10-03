"use client";

// components/edit-contact-modal.tsx
//
// «Змінити контакт» на профиле другого человека (волна 4B), как
// edit_contact_screen.dart: имя, фамилия и личная заметка («Нотатки бачите
// тільки ви»). Заметку видит только владелец контакта.
import { useEffect, useState } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { authFetch } from "@/lib/auth-fetch";
import type { GroupLang } from "@/lib/a1/group-chat";
import { extraText } from "@/lib/a1/chat-extras";

const FIRST: Record<string, string> = { uk: "Ім'я", ru: "Имя", en: "First name", de: "Vorname", es: "Nombre", fr: "Prénom", pl: "Imię", ptBR: "Nome", zh: "名字" };
const LAST: Record<string, string> = { uk: "Прізвище", ru: "Фамилия", en: "Last name", de: "Nachname", es: "Apellido", fr: "Nom", pl: "Nazwisko", ptBR: "Sobrenome", zh: "姓氏" };
const SAVE: Record<string, string> = { uk: "Зберегти", ru: "Сохранить", en: "Save", de: "Speichern", es: "Guardar", fr: "Enregistrer", pl: "Zapisz", ptBR: "Salvar", zh: "保存" };

export function EditContactModal({
  lang,
  userId,
  fallbackName,
  onSaved,
  onClose,
}: {
  lang: GroupLang;
  userId: string;
  /** Имя профиля -- подставляется, пока человека нет в контактах. */
  fallbackName: string;
  onSaved?: () => void;
  onClose: () => void;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/contacts/edit?user=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; contact?: { firstName: string; lastName: string; note: string } | null } | null) => {
        if (cancelled) return;
        const c = d?.ok ? d.contact : null;
        if (c && (c.firstName || c.lastName)) {
          setFirst(c.firstName);
          setLast(c.lastName);
          setNote(c.note);
        } else {
          const parts = fallbackName.trim().split(/\s+/).filter(Boolean);
          setFirst(parts[0] ?? "");
          setLast(parts.slice(1).join(" "));
          setNote(c?.note ?? "");
        }
        setReady(true);
      })
      .catch(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [userId, fallbackName]);
  const input = "w-full bg-transparent px-4 py-3 text-[16px] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div data-testid="edit-contact-modal" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{extraText(lang, "editContactTitle")}</h2>
        <div className="overflow-hidden rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
          <input data-testid="ec-first" value={first} maxLength={64} disabled={!ready} onChange={(e) => setFirst(e.target.value)} placeholder={FIRST[lang] ?? FIRST.en} className={input} />
          <div className="ml-4 h-px bg-black/10 dark:bg-white/10" />
          <input data-testid="ec-last" value={last} maxLength={64} disabled={!ready} onChange={(e) => setLast(e.target.value)} placeholder={LAST[lang] ?? LAST.en} className={input} />
        </div>
        <div className="mt-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
          <textarea data-testid="ec-note" value={note} maxLength={500} rows={3} disabled={!ready} onChange={(e) => setNote(e.target.value)} placeholder={extraText(lang, "contactNotesHint")} className={`${input} resize-none`} />
        </div>
        <p className="mt-1.5 px-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">{extraText(lang, "contactNotesFooter")}</p>
        {failed && <p className="mt-2 text-[13px] text-[#ef392c]">!</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl bg-black/5 text-[15px] font-medium text-neutral-900 hover:bg-black/10 dark:bg-white/10 dark:text-white">
            {extraText(lang, "cancelAction")}
          </button>
          <button
            type="button"
            data-testid="ec-save"
            disabled={!ready || busy}
            onClick={async () => {
              setBusy(true);
              setFailed(false);
              try {
                const r = await authFetch("/api/contacts/edit", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ user: userId, firstName: first.trim(), lastName: last.trim(), note: note.trim() }),
                });
                const d = (await r.json().catch(() => null)) as { ok?: boolean } | null;
                if (d?.ok) {
                  onSaved?.();
                  onClose();
                  return;
                }
                setFailed(true);
              } catch {
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
            className="h-11 flex-1 rounded-xl bg-[#335ef7] text-[15px] font-medium text-white disabled:opacity-40 dark:bg-[#0c8ce9]"
          >
            {SAVE[lang] ?? SAVE.en}
          </button>
        </div>
      </div>
    </div>
  );
}

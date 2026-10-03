"use client";

// components/new-group-modal.tsx
//
// Группы в чатах (волна 1, 2026-10-03, Александр: «сделаем всё то же
// самое на сайте»). Окно «Нова група»: название + выбор участников
// (components/chat/people-picker.tsx), кнопка «Створити». Логика как в
// приложении (create_group_screen): минимум один участник, название
// обязательно; создание -- POST /api/chats/group-create, дальше сразу
// открывается чат группы. Оформление в стиле сайта.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { groupText } from "@/lib/a1/group-chat";
import { PeoplePicker, type Person } from "@/components/chat/people-picker";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function NewGroupModal({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  // Выбранные хранятся вместе с именем/аватаркой, чтобы чип не исчезал,
  // когда поиск меняется и человека уже нет в видимом списке.
  const [picked, setPicked] = useState<Record<string, Person>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  const pickedList = Object.values(picked);
  const canCreate = title.trim().length > 0 && pickedList.length > 0 && !creating;

  function toggle(p: Person) {
    setPicked((cur) => {
      const next = { ...cur };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      return next;
    });
  }

  async function create() {
    if (!canCreate) return;
    setCreating(true);
    setError(false);
    try {
      const res = await authFetch("/api/chats/group-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), userIds: pickedList.map((p) => p.id) }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.chatId === "string") {
        onClose();
        router.push(`/chats/${data.chatId}?title=${encodeURIComponent(title.trim())}&group=1`);
        return;
      }
      throw new Error("create_failed");
    } catch {
      setError(true);
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{groupText(lang, "newGroup")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={groupText(lang, "groupCancel")}
            className="group/close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-200"
          >
            <CloseIcon className="transition-transform duration-200 ease-out group-hover/close:rotate-90 motion-reduce:transition-none" />
          </button>
        </div>

        <input
          type="text"
          value={title}
          maxLength={128}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={groupText(lang, "groupName")}
          aria-label={groupText(lang, "groupName")}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#335ef7] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-[#0c8ce9]"
        />

        <PeoplePicker lang={lang} picked={picked} onToggle={toggle} />

        {error && <p className="text-center text-[13px] text-red-500">{groupText(lang, "groupCreateFailed")}</p>}

        <button
          type="button"
          disabled={!canCreate}
          onClick={() => void create()}
          className="rounded-full bg-[#335ef7] py-2.5 text-[15px] font-semibold text-white transition enabled:hover:opacity-90 disabled:opacity-40 dark:bg-[#009bff]"
        >
          {pickedList.length > 0
            ? `${groupText(lang, "createGroup")} · ${groupText(lang, "groupSelected", { n: pickedList.length })}`
            : groupText(lang, "groupSelectPeople")}
        </button>
      </div>
    </div>
  );
}

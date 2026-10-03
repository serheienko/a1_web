"use client";

// components/new-group-modal.tsx
//
// Группы в чатах (волна 1, 2026-10-03, Александр: «сделаем всё то же
// самое на сайте»). Окно «Нова група»: название + выбор участников из
// контактов и из общего поиска, кнопка «Створити». Логика как в
// приложении (create_group_screen): минимум один участник, название
// обязательно; создание -- POST /api/chats/group-create, дальше сразу
// открывается чат группы. Оформление в стиле сайта, по образцу
// components/new-chat-picker-modal.tsx.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { Locale } from "@/components/t";
import type { Contact } from "@/lib/a1/schemas";
import { authFetch } from "@/lib/auth-fetch";
import { SearchIcon } from "@/components/search-icon";
import type { UserSearchHit } from "@/app/api/users/search/route";
import { groupText } from "@/lib/a1/group-chat";

type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
};

type Person = { id: string; name: string; sub: string | null; avatar: string | null; blur: string | null };

function contactName(contact: Contact, linked: ContactUserSummary | undefined): string {
  const own = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return linked?.fullName?.trim() || own || contact.phone || "—";
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
        on ? "border-[#335ef7] bg-[#335ef7] dark:border-[#0c8ce9] dark:bg-[#0c8ce9]" : "border-neutral-300 dark:border-neutral-600"
      }`}
      aria-hidden="true"
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </span>
  );
}

export function NewGroupModal({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [contactPeople, setContactPeople] = useState<Person[]>([]);
  const [globalPeople, setGlobalPeople] = useState<UserSearchHit[]>([]);
  // Выбранные хранятся вместе с именем/аватаркой, чтобы чип не исчезал,
  // когда поиск меняется и человека уже нет в видимом списке.
  const [picked, setPicked] = useState<Record<string, Person>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/contacts/list")
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) {
          const contacts: Contact[] = data.contacts ?? [];
          const users: Record<string, ContactUserSummary> = data.contactUsers ?? {};
          const out: Person[] = [];
          for (const c of contacts) {
            if (!c.user) continue;
            const u = users[c.user];
            out.push({
              id: c.user,
              name: contactName(c, u),
              sub: c.phone ?? null,
              avatar: u?.avatarUrl ?? null,
              blur: u?.avatarBlurDataUrl ?? null,
            });
          }
          setContactPeople(out);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim().replace(/^@+/, "");
    if (q.length < 2) {
      setGlobalPeople([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { ok?: boolean; users?: UserSearchHit[] }) => {
          if (!cancelled && data?.ok) setGlobalPeople(data.users ?? []);
        })
        .catch(() => {
          if (!cancelled) setGlobalPeople([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const trimmed = query.trim().toLowerCase();
  const shownContacts = useMemo(
    () => (trimmed ? contactPeople.filter((p) => p.name.toLowerCase().includes(trimmed) || (p.sub ?? "").toLowerCase().includes(trimmed)) : contactPeople),
    [contactPeople, trimmed],
  );
  const contactIds = new Set(shownContacts.map((p) => p.id));
  const otherPeople: Person[] = globalPeople
    .filter((u) => !contactIds.has(u.userId))
    .map((u) => ({ id: u.userId, name: u.fullName, sub: u.username ? `@${u.username}` : null, avatar: u.avatarUrl, blur: u.avatarBlurDataUrl ?? null }));

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

  const row = (p: Person) => {
    const on = !!picked[p.id];
    return (
      <button
        type="button"
        key={p.id}
        onClick={() => toggle(p)}
        className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        <CachedAvatar
          src={p.avatar ?? pickDefaultCatAvatar(p.id)}
          blurDataURL={p.blur ?? BLUR_DATA_URL}
          size={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{p.name}</div>
          {p.sub && <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{p.sub}</div>}
        </div>
        <CheckCircle on={on} />
      </button>
    );
  };

  const nothingFound = loaded && shownContacts.length === 0 && otherPeople.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
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

        {pickedList.length > 0 && (
          <div className="flex max-h-20 shrink-0 flex-wrap gap-1.5 overflow-y-auto">
            {pickedList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p)}
                className="flex items-center gap-1.5 rounded-full bg-[#335ef7]/10 py-1 pl-1 pr-2.5 text-[13px] font-medium text-[#335ef7] transition hover:bg-[#335ef7]/20 dark:bg-[#0c8ce9]/20 dark:text-[#0c8ce9]"
              >
                <CachedAvatar
                  src={p.avatar ?? pickDefaultCatAvatar(p.id)}
                  blurDataURL={p.blur ?? BLUR_DATA_URL}
                  size={20}
                  className="h-5 w-5 rounded-full object-cover"
                />
                <span className="max-w-[110px] truncate">{p.name}</span>
                <CloseIcon className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <div className="relative shrink-0">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={groupText(lang, "groupSearch")}
            aria-label={groupText(lang, "groupSearch")}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-[14px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#335ef7] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-[#0c8ce9]"
          />
        </div>

        <div className="h-[min(16rem,36vh)] shrink-0 overflow-y-auto">
          {!loaded && (
            <div className="flex flex-col gap-1 py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5" aria-hidden="true">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          )}
          {nothingFound && (
            <p className="py-6 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
              {trimmed ? groupText(lang, "groupPickerHint") : groupText(lang, "groupNoContacts")}
            </p>
          )}
          <div className="flex flex-col gap-0.5">{shownContacts.map(row)}</div>
          {otherPeople.length > 0 && <div className="flex flex-col gap-0.5 pt-1">{otherPeople.map(row)}</div>}
        </div>

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

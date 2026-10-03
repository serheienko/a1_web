"use client";

// components/chat/people-picker.tsx
//
// Группы (волны 1-2): выбор людей галочками -- чипы выбранных, поиск по
// контактам и по всем людям A1, список. Вынесено из окна «Нова група»,
// чтобы тем же блоком пользоваться и в «Додати учасників».
import { useEffect, useMemo, useState } from "react";
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

export type Person = { id: string; name: string; sub: string | null; avatar: string | null; blur: string | null };

function contactName(contact: Contact, linked: ContactUserSummary | undefined): string {
  const own = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return linked?.fullName?.trim() || own || contact.phone || "—";
}

function XIcon({ className }: { className?: string }) {
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

export function PeoplePicker({
  lang,
  picked,
  onToggle,
  excludeIds,
  listHeight = "h-[min(16rem,36vh)]",
}: {
  lang: Locale;
  picked: Record<string, Person>;
  onToggle: (p: Person) => void;
  /** Уже в группе -- не показываем. */
  excludeIds?: Set<string>;
  listHeight?: string;
}) {
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [contactPeople, setContactPeople] = useState<Person[]>([]);
  const [globalPeople, setGlobalPeople] = useState<UserSearchHit[]>([]);

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
            out.push({ id: c.user, name: contactName(c, u), sub: c.phone ?? null, avatar: u?.avatarUrl ?? null, blur: u?.avatarBlurDataUrl ?? null });
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
  const shownContacts = useMemo(() => {
    const base = contactPeople.filter((p) => !excludeIds?.has(p.id));
    return trimmed ? base.filter((p) => p.name.toLowerCase().includes(trimmed) || (p.sub ?? "").toLowerCase().includes(trimmed)) : base;
  }, [contactPeople, trimmed, excludeIds]);
  const contactIds = new Set(shownContacts.map((p) => p.id));
  const otherPeople: Person[] = globalPeople
    .filter((u) => !contactIds.has(u.userId) && !excludeIds?.has(u.userId))
    .map((u) => ({ id: u.userId, name: u.fullName, sub: u.username ? `@${u.username}` : null, avatar: u.avatarUrl, blur: u.avatarBlurDataUrl ?? null }));
  const pickedList = Object.values(picked);
  const nothingFound = loaded && shownContacts.length === 0 && otherPeople.length === 0;

  const row = (p: Person) => (
    <button
      type="button"
      key={p.id}
      onClick={() => onToggle(p)}
      className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
    >
      <CachedAvatar src={p.avatar ?? pickDefaultCatAvatar(p.id)} blurDataURL={p.blur ?? BLUR_DATA_URL} size={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{p.name}</div>
        {p.sub && <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{p.sub}</div>}
      </div>
      <CheckCircle on={!!picked[p.id]} />
    </button>
  );

  return (
    <>
      {pickedList.length > 0 && (
        <div className="flex max-h-20 shrink-0 flex-wrap gap-1.5 overflow-y-auto">
          {pickedList.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className="flex items-center gap-1.5 rounded-full bg-[#335ef7]/10 py-1 pl-1 pr-2.5 text-[13px] font-medium text-[#335ef7] transition hover:bg-[#335ef7]/20 dark:bg-[#0c8ce9]/20 dark:text-[#0c8ce9]"
            >
              <CachedAvatar src={p.avatar ?? pickDefaultCatAvatar(p.id)} blurDataURL={p.blur ?? BLUR_DATA_URL} size={20} className="h-5 w-5 rounded-full object-cover" />
              <span className="max-w-[110px] truncate">{p.name}</span>
              <XIcon className="h-3 w-3" />
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

      <div className={`${listHeight} shrink-0 overflow-y-auto`}>
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
    </>
  );
}

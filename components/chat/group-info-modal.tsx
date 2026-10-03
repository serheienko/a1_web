"use client";

// components/chat/group-info-modal.tsx
//
// Группы в чатах (волны 1-2, 2026-10-03). Карточка группы по нажатию на
// шапку чата, три вида внутри одного окна:
//   main -- фото, название, описание, плашки «сповіщення» / «закріпити»
//           / «змінити», ссылка-приглашение, участники (с «додати» и
//           «видалити»), «Вийти з групи» и (для создателя) «Видалити групу»;
//   edit -- фото, название, описание, тип Public/Private;
//   add  -- выбор людей для добавления.
// Права как у бэкенда: добавлять и менять может участник, убирать людей
// из группы -- создатель/админ; удаляет группу создатель.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { groupText, membersCountText } from "@/lib/a1/group-chat";
import { peerNameColorIndex, peerNameColorVar } from "@/lib/peer-name-color";
import type { GroupMember } from "@/app/api/chats/group-info/route";
import { PeoplePicker, type Person } from "@/components/chat/people-picker";

export type GroupCardInfo = {
  title: string;
  about: string;
  photo: string;
  isPublic: boolean;
  inviteLink: string | null;
  muted: boolean;
  pinned: boolean;
  myRole: "creator" | "admin" | "member" | null;
  members: GroupMember[];
};

type View = "main" | "edit" | "add";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const res = await authFetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: !!data?.ok, status: res.status, data };
}

const SHARED_LABEL: Partial<Record<Locale, string>> = {
  uk: "Медіа та файли", ru: "Медиа и файлы", en: "Media & files", de: "Medien & Dateien", es: "Multimedia y archivos",
  fr: "Médias et fichiers", pl: "Media i pliki", ptBR: "Mídia e arquivos", zh: "媒体和文件",
};

function Pill({ label, onClick, danger, disabled }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition disabled:opacity-50 ${
        danger ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-black/5 text-neutral-800 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/15"
      }`}
    >
      {label}
    </button>
  );
}

/** Квадратная обрезка по центру до 512 px, JPEG -- хватает для аватарки группы. */
async function squareJpeg(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("load"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ctx");
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("blob");
    return new File([blob], "group.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadPhoto(file: File): Promise<string> {
  const jpeg = await squareJpeg(file);
  const created = await postJson("/api/upload/create", { mimetype: jpeg.type, bytes: jpeg.size });
  const result = created.data?.result as { id?: string; url?: string; fields?: Record<string, string> } | undefined;
  if (!created.ok || !result?.url || !result.id) throw new Error("create");
  const form = new FormData();
  for (const [k, v] of Object.entries(result.fields ?? {})) form.append(k, v);
  form.append("file", jpeg);
  const up = await fetch(result.url, { method: "POST", body: form });
  if (!up.ok) throw new Error("upload");
  const confirmed = await postJson("/api/upload/confirm", { documentId: result.id });
  const ref = (confirmed.data?.media as { fileReference?: string } | undefined)?.fileReference;
  if (!confirmed.ok || !ref) throw new Error("confirm");
  return ref;
}

export function GroupInfoModal({
  lang,
  chatId,
  info,
  myUserId,
  onChanged,
  onOpenShared,
  onClose,
}: {
  lang: Locale;
  chatId: string;
  info: GroupCardInfo;
  myUserId: string | null;
  /** Перечитать данные группы после изменения. */
  onChanged: () => void;
  /** Открыть «Медиа и файлы» этого чата (иконка из шапки теперь живёт в карточке). */
  onOpenShared?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("main");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "leave" | "delete" | { remove: GroupMember }>(null);
  const [link, setLink] = useState<string | null>(info.inviteLink);
  const [copied, setCopied] = useState(false);

  // edit
  const [title, setTitle] = useState(info.title);
  const [about, setAbout] = useState(info.about);
  const [isPublic, setIsPublic] = useState(info.isPublic);
  const [newPhotoRef, setNewPhotoRef] = useState<string | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // add
  const [picked, setPicked] = useState<Record<string, Person>>({});

  const canManage = info.myRole === "creator" || info.myRole === "admin";
  const isCreator = info.myRole === "creator";
  const rank = { creator: 0, admin: 1, member: 2 } as const;
  const sorted = [...info.members].sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name));
  const memberIds = new Set(info.members.map((m) => m.id));
  const L = (k: string, vars?: Record<string, string | number>) => groupText(lang, k, vars);

  function fail(res: { status: number }, fallback: string) {
    setMessage(res.status === 403 ? L("groupNoPermission") : fallback);
  }

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch {
      setMessage(L("groupSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const toggleMute = () =>
    run(async () => {
      const r = await postJson("/api/chats/group-mute", { chat: chatId, mute: !info.muted });
      if (r.ok) onChanged();
      else fail(r, L("groupSaveFailed"));
    });

  const togglePin = () =>
    run(async () => {
      const r = await postJson("/api/chats/set-pinned", { chat: chatId, pinned: !info.pinned });
      if (r.ok) onChanged();
      else setMessage(L("chatPinLimit"));
    });

  const makeLink = (revoke: boolean) =>
    run(async () => {
      const r = await postJson("/api/chats/group-invite", { chat: chatId, revoke });
      if (r.ok && typeof r.data?.link === "string") {
        setLink(r.data.link);
        onChanged();
      } else fail(r, L("groupSaveFailed"));
    });

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* буфер недоступен -- ссылка и так видна на экране */
    }
  }

  const doLeave = () =>
    run(async () => {
      const r = await postJson("/api/chats/group-leave", { chat: chatId });
      if (!r.ok) return fail(r, L("groupSaveFailed"));
      onClose();
      router.push("/chats");
    });

  const doDelete = () =>
    run(async () => {
      const r = await postJson("/api/chats/group-delete", { chat: chatId });
      if (!r.ok) return fail(r, L("groupSaveFailed"));
      onClose();
      router.push("/chats");
    });

  const doRemove = (m: GroupMember) =>
    run(async () => {
      const r = await postJson("/api/chats/group-members", { chat: chatId, remove: [m.id] });
      setConfirm(null);
      if (r.ok) onChanged();
      else fail(r, L("groupSaveFailed"));
    });

  const doAdd = () =>
    run(async () => {
      const ids = Object.keys(picked);
      if (ids.length === 0) return;
      const r = await postJson("/api/chats/group-members", { chat: chatId, add: ids });
      if (!r.ok) return fail(r, L("groupSaveFailed"));
      setPicked({});
      setView("main");
      onChanged();
    });

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    await run(async () => {
      const ref = await uploadPhoto(file);
      setNewPhotoRef(ref);
      setRemovePhoto(false);
      setNewPhotoPreview(URL.createObjectURL(file));
    });
  }

  const doSave = () =>
    run(async () => {
      const body: Record<string, unknown> = { chat: chatId };
      if (title.trim() && title.trim() !== info.title) body.title = title.trim();
      if (about !== info.about) body.about = about;
      if (isPublic !== info.isPublic) body.public = isPublic;
      if (removePhoto) body.removePhoto = true;
      else if (newPhotoRef) body.photoFileReference = newPhotoRef;
      if (Object.keys(body).length === 1) {
        setView("main");
        return;
      }
      const r = await postJson("/api/chats/group-edit", body);
      if (!r.ok) return fail(r, L("groupSaveFailed"));
      setView("main");
      onChanged();
    });

  const shownPhoto = removePhoto ? pickDefaultCatAvatar(chatId) : (newPhotoPreview ?? info.photo);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div className="flex max-h-[88vh] w-full max-w-sm flex-col gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        {view === "main" && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <CachedAvatar src={info.photo} blurDataURL={BLUR_DATA_URL} size={84} className="h-[84px] w-[84px] rounded-full object-cover" />
              <h2 className="max-w-full break-words text-[19px] font-semibold text-neutral-900 dark:text-neutral-50">{info.title || "—"}</h2>
              <div className="text-[14px] text-neutral-500 dark:text-neutral-400">{membersCountText(lang, info.members.length)}</div>
              {info.about && <p className="max-w-full whitespace-pre-line break-words text-[13px] text-neutral-600 dark:text-neutral-300">{info.about}</p>}
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <Pill label={info.muted ? L("groupUnmute") : L("groupMute")} onClick={() => void toggleMute()} disabled={busy} />
                <Pill label={info.pinned ? L("chatUnpin") : L("chatPin")} onClick={() => void togglePin()} disabled={busy} />
                {onOpenShared && <Pill label={SHARED_LABEL[lang] ?? SHARED_LABEL.en!} onClick={onOpenShared} />}
                {canManage && <Pill label={L("editGroup")} onClick={() => setView("edit")} />}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{L("inviteLink")}</div>
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
                {link ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700 dark:text-neutral-200">{link}</span>
                    <button type="button" onClick={() => void copyLink()} className="shrink-0 text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
                      {copied ? L("linkCopied") : L("copyLink")}
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void makeLink(false)} className="text-[13px] font-semibold text-[#335ef7] disabled:opacity-50 dark:text-[#0c8ce9]">
                    {L("inviteLink")}
                  </button>
                )}
              </div>
              {link && canManage && (
                <button type="button" disabled={busy} onClick={() => void makeLink(true)} className="-mt-1.5 mb-3 px-2 text-left text-[12px] text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400" title={L("revokeLinkHint")}>
                  {L("revokeLink")}
                </button>
              )}

              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{L("groupMembers")}</span>
                <button type="button" onClick={() => setView("add")} className="text-[13px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
                  + {L("addMembers")}
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {sorted.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                    <CachedAvatar src={m.photo ?? pickDefaultCatAvatar(m.id)} blurDataURL={BLUR_DATA_URL} size={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium" style={{ color: peerNameColorVar(peerNameColorIndex(m.id)) }}>
                        {m.name || L("groupUnknownUser")}
                        {m.id === myUserId && <span className="text-neutral-400"> · {L("groupYou")}</span>}
                      </div>
                      {m.username && <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">@{m.username}</div>}
                    </div>
                    {m.role === "creator" && (
                      <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-white/10 dark:text-neutral-400">{L("groupOwner")}</span>
                    )}
                    {canManage && m.role !== "creator" && m.id !== myUserId && (
                      <button
                        type="button"
                        aria-label={L("removeMember")}
                        title={L("removeMember")}
                        onClick={() => setConfirm({ remove: m })}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-500/10 hover:text-red-500"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {message && <p className="text-center text-[13px] text-red-500">{message}</p>}

            {confirm === null && (
              <div className="flex flex-col gap-2">
                <Pill label={L("leaveGroup")} danger onClick={() => setConfirm("leave")} />
                {isCreator && <Pill label={L("deleteGroup")} danger onClick={() => setConfirm("delete")} />}
              </div>
            )}
            {confirm !== null && (
              <div className="flex flex-col gap-2">
                <p className="text-center text-[13px] text-neutral-600 dark:text-neutral-300">
                  {confirm === "leave"
                    ? L("leaveGroupConfirm", { title: info.title })
                    : confirm === "delete"
                      ? L("deleteGroupConfirm", { title: info.title })
                      : L("removeMemberConfirm", { name: confirm.remove.name || L("groupUnknownUser") })}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-full bg-black/5 py-2.5 text-[15px] font-semibold text-neutral-800 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-100">
                    {L("groupCancel")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (confirm === "leave" ? void doLeave() : confirm === "delete" ? void doDelete() : void doRemove(confirm.remove))}
                    className="flex-1 rounded-full bg-red-500 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {confirm === "leave" ? L("leaveGroup") : confirm === "delete" ? L("deleteGroup") : L("removeMember")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {view === "edit" && (
          <>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("main")} aria-label={L("groupCancel")} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <h2 className="flex-1 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{L("editGroup")}</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownPhoto} alt="" className="h-[84px] w-[84px] rounded-full object-cover" />
                <div className="flex gap-2">
                  <Pill label={L("groupChangePhoto")} disabled={busy} onClick={() => fileRef.current?.click()} />
                  {(info.photo || newPhotoPreview) && !removePhoto && <Pill label={L("groupRemovePhoto")} danger onClick={() => { setRemovePhoto(true); setNewPhotoRef(null); setNewPhotoPreview(null); }} />}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onPickFile(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              <input
                type="text"
                value={title}
                maxLength={128}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={L("groupName")}
                aria-label={L("groupName")}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#335ef7] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-[#0c8ce9]"
              />
              <textarea
                value={about}
                maxLength={512}
                rows={3}
                onChange={(e) => setAbout(e.target.value)}
                placeholder={L("groupDescription")}
                aria-label={L("groupDescription")}
                className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#335ef7] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-[#0c8ce9]"
              />
              <div>
                <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{L("groupType")}</div>
                <div className="flex gap-2">
                  {([false, true] as const).map((pub) => (
                    <button
                      key={String(pub)}
                      type="button"
                      onClick={() => setIsPublic(pub)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-[14px] font-medium transition ${
                        isPublic === pub ? "border-[#335ef7] bg-[#335ef7]/10 text-[#335ef7] dark:border-[#0c8ce9] dark:text-[#0c8ce9]" : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                      }`}
                    >
                      {pub ? L("groupTypePublic") : L("groupTypePrivate")}
                    </button>
                  ))}
                </div>
                <p className="px-1 pt-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">{isPublic ? L("groupTypePublicHint") : L("groupTypePrivateHint")}</p>
              </div>
            </div>
            {message && <p className="text-center text-[13px] text-red-500">{message}</p>}
            <button type="button" disabled={busy || !title.trim()} onClick={() => void doSave()} className="rounded-full bg-[#335ef7] py-2.5 text-[15px] font-semibold text-white transition enabled:hover:opacity-90 disabled:opacity-40 dark:bg-[#009bff]">
              {L("groupSave")}
            </button>
          </>
        )}

        {view === "add" && (
          <>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("main")} aria-label={L("groupCancel")} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <h2 className="flex-1 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{L("addMembers")}</h2>
            </div>
            <PeoplePicker
              lang={lang}
              picked={picked}
              excludeIds={memberIds}
              onToggle={(p) =>
                setPicked((cur) => {
                  const next = { ...cur };
                  if (next[p.id]) delete next[p.id];
                  else next[p.id] = p;
                  return next;
                })
              }
            />
            {message && <p className="text-center text-[13px] text-red-500">{message}</p>}
            <button
              type="button"
              disabled={busy || Object.keys(picked).length === 0}
              onClick={() => void doAdd()}
              className="rounded-full bg-[#335ef7] py-2.5 text-[15px] font-semibold text-white transition enabled:hover:opacity-90 disabled:opacity-40 dark:bg-[#009bff]"
            >
              {Object.keys(picked).length > 0 ? `${L("addAction")} · ${L("groupSelected", { n: Object.keys(picked).length })}` : L("groupSelectPeople")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

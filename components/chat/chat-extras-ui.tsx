"use client";

// components/chat/chat-extras-ui.tsx
//
// Волна 4 (удобства чатов, 2026-10-03): мелкие куски интерфейса, которые
// приложение получило за последние недели и которых не было на сайте:
//  * SavedAvatar -- аватарка «Збережене» (закладка на сине-зелёном градиенте,
//    как assets/img/saved_messages.png в приложении);
//  * DeletedPlaque -- плашка «Повідомлення видалено» на месте сообщения,
//    удалённого у всех (флаг 1<<8);
//  * CollapsibleBody -- длинный текст, присланный «згорнутим»: 4 строки с
//    затуханием и «Показати повністю», по клику раскрывается;
//  * SendOptionsMenu -- меню у кнопки отправки (правый клик / долгое
//    нажатие): «Надіслати без звуку», «Надіслати згорнутим», «Запланувати».
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GroupLang } from "@/lib/a1/group-chat";
import { extraText } from "@/lib/a1/chat-extras";

export function SavedAvatar({ size = 42, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, background: "linear-gradient(160deg,#2ec4e6 0%,#3d7bf0 100%)" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="#fff">
        <path d="M7 3h10a2 2 0 0 1 2 2v16.2a.5.5 0 0 1-.8.4L12 17l-6.2 4.6a.5.5 0 0 1-.8-.4V5a2 2 0 0 1 2-2Z" />
      </svg>
    </span>
  );
}

export function DeletedPlaque({
  lang,
  mine,
  time,
  onContextMenu,
}: {
  lang: GroupLang;
  mine: boolean;
  time: string;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-testid="deleted-plaque"
      onContextMenu={onContextMenu}
      className={`flex max-w-[78%] items-center gap-2 rounded-[18px] px-3 py-2 text-[15px] ${
        mine
          ? "rounded-tr-[6px] bg-[#dbebff] text-[#6b7a90] dark:bg-[#1d3b66] dark:text-[#9fb4d3]"
          : "rounded-tl-[6px] bg-white text-[#989aa6] dark:bg-[#1a1a1a] dark:text-[#adafbb]"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m5.6 5.6 12.8 12.8" />
      </svg>
      <span className="italic">{extraText(lang, mine ? "messageDeletedByYou" : "messageDeleted")}</span>
      <span className="ml-1 self-end text-[11px] leading-none opacity-80">{time}</span>
    </div>
  );
}

const unfolded = new Set<string>();

/** Сворачивает длинное тело сообщения до ~4 строк, если оно помечено COLLAPSED. */
export function CollapsibleBody({
  collapsed,
  messageId,
  lang,
  children,
}: {
  collapsed: boolean;
  messageId: string;
  lang: GroupLang;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(unfolded.has(messageId));
  const [overflows, setOverflows] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const FOLD_PX = 4.6 * 23; // ~4 строки по 23 px и край пятой, как «partialLine» в приложении
  useLayoutEffect(() => {
    if (!collapsed) return;
    const el = innerRef.current;
    if (el) setOverflows(el.scrollHeight > FOLD_PX + 30);
  }, [collapsed, children, FOLD_PX]);
  if (!collapsed) return <>{children}</>;
  const folded = overflows && !open;
  return (
    <div>
      <div
        ref={innerRef}
        data-testid={folded ? "collapsed-body" : undefined}
        onClick={
          folded
            ? () => {
                unfolded.add(messageId);
                setOpen(true);
              }
            : undefined
        }
        className={folded ? "relative cursor-pointer overflow-hidden" : ""}
        style={
          folded
            ? {
                maxHeight: FOLD_PX,
                WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0.12) 100%)",
                maskImage: "linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0.12) 100%)",
              }
            : undefined
        }
      >
        {children}
      </div>
      {folded && (
        <button
          type="button"
          onClick={() => {
            unfolded.add(messageId);
            setOpen(true);
          }}
          className="mt-1 text-[14px] font-medium underline-offset-2 hover:underline"
        >
          {extraText(lang, "showMore")}
        </button>
      )}
    </div>
  );
}

export function SendOptionsMenu({
  anchorRect,
  lang,
  canCollapse,
  onSilent,
  onCollapsed,
  onSchedule,
  onClose,
}: {
  anchorRect: DOMRect;
  lang: GroupLang;
  canCollapse: boolean;
  onSilent: () => void;
  onCollapsed: () => void;
  onSchedule?: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, anchorRect.right - r.width), window.innerWidth - r.width - 8);
    const top = Math.max(8, anchorRect.top - 8 - r.height);
    setPos({ left, top });
  }, [anchorRect]);
  if (typeof document === "undefined") return null;
  const rows: Array<{ key: string; label: string; icon: ReactNode; onClick: () => void }> = [
    {
      key: "silent",
      label: extraText(lang, "sendWithoutSound"),
      onClick: onSilent,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          <path d="m3 3 18 18" />
        </svg>
      ),
    },
    ...(canCollapse
      ? [
          {
            key: "collapsed",
            label: extraText(lang, "sendCollapsed"),
            onClick: onCollapsed,
            icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h8" />
              </svg>
            ),
          },
        ]
      : []),
    ...(onSchedule
      ? [
          {
            key: "schedule",
            label: extraText(lang, "scheduleMessage"),
            onClick: onSchedule,
            icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            ),
          },
        ]
      : []),
  ];
  return createPortal(
    <div className="fixed inset-0 z-[90]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        ref={ref}
        data-testid="send-options-menu"
        onClick={(e) => e.stopPropagation()}
        className="absolute w-[260px] overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm dark:bg-neutral-800/95"
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
      >
        {rows.map((r, i) => (
          <button
            key={r.key}
            type="button"
            data-testid={`send-option-${r.key}`}
            onClick={() => {
              onClose();
              r.onClick();
            }}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10 ${
              i < rows.length - 1 ? "border-b border-black/5 dark:border-white/10" : ""
            }`}
          >
            {r.icon}
            <span className="flex-1">{r.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

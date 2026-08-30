// lib/use-hover-panel.ts
//
// Aleksandr, 2026-08-30 (about the avatar menu's hover-open/close, then
// asking for the filter button to match it exactly): "у вас (Claude) это
// сделано для левого меню... наводишь на кнопку, не нажимаешь, оно
// появляется. Если ушёл не выбрав, исчезает плавно... Сделай для
// фильтров такой же идентичный эффект при наведении на кнопку как и на
// аватар... Надо переиспользовать, чтобы работало идентично." Extracted
// verbatim out of components/avatar-menu.tsx (which had this inlined
// first, and worked through two real bugs live — see the two numbered
// points below) so a second call site can't drift from it: both
// components/avatar-menu.tsx and components/filters-form.tsx now call
// this one hook, so a future fix to either lands in both automatically.
//
// The two bugs that shaped this, from avatar-menu.tsx's original
// comment, preserved here since they're exactly why the hook looks the
// way it does:
//
// 1) "не исчезает всегда... по горизонтали сверху исчезает, вниз по
//    вертикали не исчезает, зависает" -- caused by a `margin` gap
//    between the trigger and the panel that belongs to neither element,
//    so native mouseenter/mouseleave sometimes never fires crossing it.
//    The caller-side fix is layout (padding instead of margin between
//    trigger and panel, so the hoverable area is one continuous
//    rectangle) — this hook can't fix that part, but see point 2 for
//    what it DOES own.
// 2) "появляется не плавно" -- mounting a panel already at its open
//    opacity/scale gives CSS nothing to transition FROM. `rendered` vs
//    `visible` here are two separate flags for exactly that reason:
//    `rendered` mounts the panel in its closed style first, then a rAF
//    (guaranteed to run only after that closed frame has actually
//    painted) flips `visible`, so the transition is real.
//
// Later, live, twice: "по прежнему не исчезает" — onMouseEnter/
// onMouseLeave alone depend on the browser correctly synthesizing
// enter/leave from mouseover/mouseout's `relatedTarget`, which at least
// one real cursor path (fast/large jump) was found to skip entirely.
// The `mousemove`-on-`document` effect below is a second, independent
// closing mechanism that doesn't depend on enter/leave semantics at
// all — it directly compares the cursor's raw coordinates against the
// trigger's and panel's own geometry every time the mouse moves, so it
// can't silently fail to fire the way a missed browser event can. It
// backstops onMouseEnter/onMouseLeave rather than replacing them (those
// stay cheap and correct in the common case).
//
// `refPairs` (plural) exists because components/filters-form.tsx has
// TWO trigger+panel pairs sharing one `open` boolean — the mobile card's
// filter button/popover and the desktop nav-portaled one, only one of
// which is ever visible per viewport (the other is CSS-`hidden`, but
// still mounted, still has a real — if offscreen/zero-size —
// getBoundingClientRect()). A single ref pair (components/avatar-menu.tsx's
// case) is just an array of one.
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const HOVER_CLOSE_DELAY_MS = 200;
const CLOSE_TRANSITION_MS = 150;

export type HoverPanelRefPair = {
  trigger: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
};

export function useHoverPanel(open: boolean, setOpen: (open: boolean) => void, refPairs: HoverPanelRefPair[]) {
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setRendered(false), CLOSE_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  function handleMouseEnter() {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setOpen(true);
  }

  function handleMouseLeave() {
    hoverCloseTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }

  // Authoritative-geometry backstop — see this file's own header comment
  // for why onMouseEnter/onMouseLeave alone aren't enough.
  useEffect(() => {
    if (!open) return;
    const margin = 4;
    function isInside(rect: DOMRect | undefined, x: number, y: number) {
      if (!rect) return false;
      return x >= rect.left - margin && x <= rect.right + margin && y >= rect.top - margin && y <= rect.bottom + margin;
    }
    function handleDocMouseMove(e: MouseEvent) {
      const insideAny = refPairs.some(
        ({ trigger, panel }) =>
          isInside(trigger.current?.getBoundingClientRect(), e.clientX, e.clientY) ||
          isInside(panel.current?.getBoundingClientRect(), e.clientX, e.clientY),
      );
      if (insideAny) {
        if (hoverCloseTimerRef.current) {
          clearTimeout(hoverCloseTimerRef.current);
          hoverCloseTimerRef.current = null;
        }
      } else if (!hoverCloseTimerRef.current) {
        hoverCloseTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
      }
    }
    document.addEventListener("mousemove", handleDocMouseMove);
    return () => document.removeEventListener("mousemove", handleDocMouseMove);
    // refPairs holds useRef objects, stable across renders even though
    // the array literal wrapping them isn't -- keying on `open` alone
    // (same pattern post-editor.tsx's own schedule-popover effect uses)
    // avoids tearing this listener down/up on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { rendered, visible, handleMouseEnter, handleMouseLeave };
}

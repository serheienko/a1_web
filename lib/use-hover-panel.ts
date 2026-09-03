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
//
// 2026-09-03 (Aleksandr, live screen recording of the signed-out sign-in
// popover: "мне предлагает как бы автовыбор. Я когда на него нажимаю,
// поп-ап сразу исчезает"): a THIRD real bug, same root family as point 1
// above but from the opposite direction — Chrome's native autofill
// suggestion dropdown renders as browser-chrome UI, not page DOM, well
// below the panel's own bottom edge. The instant the cursor crosses into
// it the geometry backstop's mousemove sees coordinates outside every
// trigger/panel rect and arms the close timer — and once the cursor is
// over that native overlay, the page stops receiving mousemove at all
// (same as hovering a native <select> dropdown), so nothing ever cancels
// that timer before it fires and unmounts the form mid-autofill.
// isFocusInsideAny() below is the fix: while a real element inside the
// panel (the email/password input the dropdown is anchored to) holds
// focus, hover-based closing is suppressed entirely — geometry stops
// mattering the moment the visitor is actively typing into (or letting
// autofill fill) a field, which is exactly the case a pure hover panel
// was never meant to fight in the first place.
//
// 2026-09-04 (Aleksandr, screen recording of a specialist card's "•••"
// button: "3 точки по прежнему срабатывают не с первого раза"): a
// FOURTH bug, and this one hits every caller that has both this hook's
// onMouseEnter on the trigger AND its own onClick toggle on it (all
// three do — that combination was always the plan, "hover-intent open/
// close is additive to the existing onClick toggle... which matters
// since mobile has no hover at all", per components/avatar-menu.tsx's
// own older comment). That assumption — mobile has no hover — is the
// bug: iOS Safari DOES synthesize a mouseenter for the first tap on any
// element with a mouseenter/mouseover listener (its documented "two
// taps to click a hover element" workaround), immediately followed by
// the click in the same dispatch burst. On that first tap: mouseenter
// fires handleMouseEnter() -> setOpen(true), then click fires the
// caller's setOpen(v => !v) -> flips it straight back to false, both
// before React ever paints -- so the panel never visibly opens and the
// visitor has to tap a second time (no synthetic mouseenter on THAT
// tap, so the click's toggle runs alone and works). A real mouse click
// is never affected: its hover already opened (and painted) well
// before the click, so the toggle there is a separate, later render,
// not a same-tick collision. isRecentHoverOpen() below is the guard —
// every caller's click handler checks it first and skips the toggle
// when a hover-open just happened (<300ms), since that click IS the
// same tap that already opened the panel.
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const HOVER_CLOSE_DELAY_MS = 200;
const CLOSE_TRANSITION_MS = 150;
const RECENT_HOVER_OPEN_MS = 300;

export type HoverPanelRefPair = {
  trigger: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
};

export function useHoverPanel(open: boolean, setOpen: (open: boolean) => void, refPairs: HoverPanelRefPair[]) {
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // See this file's header, 2026-09-04 entry.
  const lastHoverOpenAtRef = useRef(0);

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
    lastHoverOpenAtRef.current = Date.now();
  }

  // See this file's header, 2026-09-04 entry: lets a caller's click
  // handler tell "this click is the tail end of the tap that just
  // hover-opened the panel" apart from a genuine second click/tap.
  function isRecentHoverOpen(): boolean {
    return Date.now() - lastHoverOpenAtRef.current < RECENT_HOVER_OPEN_MS;
  }

  // See this file's header, 2026-09-03 entry: a focused field inside the
  // panel (the case the native-autofill-dropdown bug needs) pins the
  // panel open regardless of where the cursor physically is.
  function isFocusInsideAny(): boolean {
    if (typeof document === "undefined") return false;
    const active = document.activeElement;
    if (!active) return false;
    return refPairs.some(({ panel }) => panel.current?.contains(active) ?? false);
  }

  function handleMouseLeave() {
    if (isFocusInsideAny()) return;
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
      const insideAny =
        refPairs.some(
          ({ trigger, panel }) =>
            isInside(trigger.current?.getBoundingClientRect(), e.clientX, e.clientY) ||
            isInside(panel.current?.getBoundingClientRect(), e.clientX, e.clientY),
        ) || isFocusInsideAny();
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

  // Safety net for the narrow window where the close timer was already
  // armed (cursor drifted out) a moment before the visitor actually
  // clicked into a field inside the panel -- cancel it the instant focus
  // lands anywhere inside, same as a mouse re-entering does above.
  useEffect(() => {
    if (!open) return;
    function handleFocusIn(e: FocusEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const insideAny = refPairs.some(({ panel }) => panel.current?.contains(target));
      if (insideAny && hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
    }
    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { rendered, visible, handleMouseEnter, handleMouseLeave, isRecentHoverOpen };
}

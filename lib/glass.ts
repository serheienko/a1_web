// lib/glass.ts
//
// 2026-09-03 (Aleksandr, screenshots of the Вакансії/Фахівці toggle and
// the chat search bar: "можем делать такой эффект стеклянности, как бы,
// вот этих кнопок как у Apple?" -- then, once confirmed doable: "давай
// поставим на пошук и ... на вакансии... на главной... поп-ап... в
// профиле... в чат-листе... моя активность тоже"). An explicit
// experiment -- his own framing: "я хочу попробовать, типа как это
// будет выглядеть. Если круто, то оставим. Если не круто, то откатим."
// -- so this is ONE shared class-string constant applied at each of the
// ~8 call sites (see PLAN.md's own entry for the full list) instead of
// the same long className duplicated everywhere: reverting means
// deleting this file and undoing each swap back to its original
// className, not hunting down copies of the recipe.
//
// Explicitly MOBILE-ONLY (he confirmed: "мы сейчас только говорим все
// за мобильную версию, правильно?"). Some call sites (components/
// filters-form.tsx's mobile search+filter block) already only render
// below the sm breakpoint, so GLASS alone is enough there. Everywhere
// else (site-nav.tsx's toggle, the chat/profile/my-activity search
// bars and tab pills, post-owner-menu.tsx's ••• button) renders on
// every viewport, so those call sites append their own `sm:` reset
// back to their original (pre-glass) classes -- GLASS itself carries
// no sm: anything, on purpose, so it stays a plain drop-in at the
// truly-mobile-only sites.
//
// Recipe is the standard "Liquid Glass" material: backdrop-blur +
// backdrop-saturate (frosts and intensifies whatever is actually
// BEHIND the element -- most visible where something scrolls under it,
// like the chat list's avatars behind the search bar, or the vacancy
// cards behind the filters popover; close to invisible-but-still-
// textured where the background behind it is flat, like the toggle
// sitting over plain page background) + a translucent tint (NOT a
// flat color swap -- a solid color with blur but no alpha would just
// look like a slightly different solid fill, no glass read) + a
// hairline border for edge definition + a subtle inset top highlight
// (the light-catching-the-rim look every real glass/metal surface
// has). Dark mode stays a translucent DARK tint (not a light frost
// over dark, which reads as haze and hurts text contrast on the
// bigger surfaces this also goes on, like the filters popover) --
// matches how iOS's own dark-mode vibrancy materials work.
export const GLASS =
  "backdrop-blur-xl backdrop-saturate-150 border " +
  "bg-white/55 border-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] " +
  "dark:bg-neutral-900/55 dark:border-white/10 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]";

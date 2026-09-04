// components/search-icon.tsx
//
// Plain magnifying-glass icon for the desktop nav search box
// (components/filters-form.tsx's portaled-into-site-nav variant) — the
// mobile search box (same file) never had a leading icon and keeps not
// having one, matching filter-icon.tsx/clear-icon.tsx's own small
// inline-SVG convention rather than pulling in an icon package for one
// glyph.
//
// 2026-09-04 (Aleksandr, live test via Claude in Chrome on
// jobs.a1appp.com/chats: the icon was confirmed present in the DOM
// with correct computed styles -- yet invisible on screen, on every
// mobile search bar built from this component, not just chats/page.tsx)
// -- root-caused live, not guessed: app/chats/page.tsx's own search
// input carries `backdrop-blur-xl` below `sm` (the frosted-glass
// mobile search bar). `backdrop-filter != none` makes an element
// establish its own stacking context per spec, EVEN THOUGH its
// `position` stays `static` -- which promotes it into the SAME "z-index:
// 0" painting bucket this icon's own `position: absolute` (z-index:
// auto) sits in (CSS2.1 Appendix E, step 6: stacking contexts and
// positioned descendants at stack level 0 paint together, in DOM tree
// order). The icon is the FIRST child in every caller (rendered right
// before its `<input>`), so once the input joined that same bucket via
// backdrop-filter, being LATER in the DOM meant the input's own
// (visually mid-transparent, but still painted) background started
// winning that tie and fully covering the icon -- confirmed by toggling
// `backdrop-filter: none` live in devtools, which made the icon
// reappear immediately, then confirming the real fix (an explicit
// z-index, no DOM reorder needed) the same way before touching source.
// Fixed once here, in the shared leaf component, rather than per call
// site -- every current usage (app/chats/page.tsx, app/contacts/
// page.tsx, components/chats-flyout.tsx, components/filters-form.tsx,
// the two picker modals) gets it, and anything that gives one of those
// inputs a backdrop-filter later can't reintroduce this. `z-10` alone
// is enough: every caller's own className already sets `absolute`
// (the icon's actual position comes from there), so this never touches
// `position` itself -- only which stacking-context participant wins the
// tie, which is now always this icon.
export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`z-10 ${className ?? ""}`} aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 18l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// components/search-icon.tsx
//
// Plain magnifying-glass icon for the desktop nav search box
// (components/filters-form.tsx's portaled-into-site-nav variant) — the
// mobile search box (same file) never had a leading icon and keeps not
// having one, matching filter-icon.tsx/clear-icon.tsx's own small
// inline-SVG convention rather than pulling in an icon package for one
// glyph.
export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 18l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

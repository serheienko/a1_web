// components/clear-icon.tsx
//
// Aleksandr, 2026-08-27 (screenshot + Figma node-id=24343-44216, the
// report-modal text field's clear button): "Крестик с кружком как тут
// на макете" — a filled circle with a white X, not a bare X glyph.
// Reused for the search box's own clear button (see filters-form.tsx).
export function ClearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

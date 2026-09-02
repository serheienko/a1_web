// lib/account-menu-open.ts
//
// Aleksandr, 2026-09-02, live mobile screenshot of the avatar menu open
// over the Jobs feed: "пусть иконка чаты над созданием поста плавно
// исчезает затуханием, потому что сейчас она оверлапится на модалку в
// мобильной версии... UX wise тоже бессмысленно, потому что сверху есть
// кнопка чатов в самой модалке." -- components/chats-fab.tsx (a fixed
// button mounted as a SIBLING of components/site-nav.tsx in app/
// layout.tsx, not a descendant of it) needs to know when the account
// panel -- components/avatar-menu.tsx signed in, components/settings-
// menu.tsx signed out -- is open, so it can fade itself out instead of
// sitting on top of that panel's own "Chats" row.
//
// A plain module-level external store (subscribe/getSnapshot, read via
// useSyncExternalStore) rather than React Context: Context would need a
// provider wrapping SiteNav AND ChatsFab AND CreatePostFab together,
// which means restructuring app/layout.tsx's JSX just to thread one
// boolean between two otherwise-unrelated sibling trees. A tiny global
// store needs no tree position at all -- both sides just import this
// file, same "no drift between call sites" reasoning lib/use-hover-
// panel.ts's own header already gives for extracting shared behavior
// out of avatar-menu.tsx once before.
let isOpen = false;
const listeners = new Set<() => void>();

export function setAccountMenuOpen(next: boolean) {
  if (next === isOpen) return;
  isOpen = next;
  for (const listener of listeners) listener();
}

export function subscribeAccountMenuOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccountMenuOpenSnapshot(): boolean {
  return isOpen;
}

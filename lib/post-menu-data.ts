// Plain module (no "use client"): server components call this to tag a card for the right-click menu.
/** data-* attributes a card puts on itself to get this menu. */
export function postMenuData(p: {
  id: string;
  href: string;
  title: string;
  text?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
}): Record<string, string> {
  const d: Record<string, string> = {
    "data-post-menu": p.id,
    "data-post-href": p.href,
    "data-post-title": p.title,
  };
  if (p.text) d["data-post-text"] = p.text.slice(0, 2000);
  if (p.authorId) d["data-post-author-id"] = p.authorId;
  if (p.authorName) d["data-post-author-name"] = p.authorName;
  if (p.authorUsername) d["data-post-author-username"] = p.authorUsername;
  if (p.authorAvatar) d["data-post-author-avatar"] = p.authorAvatar;
  return d;
}

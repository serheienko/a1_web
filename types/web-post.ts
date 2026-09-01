// types/web-post.ts
//
// Our own domain type. The UI imports ONLY from here, never from
// lib/a1/schemas.ts — see PLAN.md §2.4 (the anti-corruption layer).
// Anything not listed below cannot leak to the browser: no emails, no
// `flags`, no raw `author._id`. `apply.questions` is the one exception,
// and only its question TEXT (see WebPost.applyQuestions below and
// lib/a1/mappers.ts's own comment on why) -- 2026-08-30, Aleksandr:
// "мы не запилили эту штуку с вопросами. Пока для MVP просто показывай
// их в посте и всё, потом допилим полноценно".

export type WebPostKind = "hiring" | "seeking";

export type WebPostAuthor = {
  // 2026-09-01: added alongside the post-detail "..." menu's "Додати
  // контакт" action (contacts.addContact needs the target user's id,
  // not just their username/name) -- null for the UserHidden/anonymous
  // branch, same as avatarUrl/username above.
  userId: string | null;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
};

export type WebPostLocation = {
  city: string;
  region: string;
  country: string;
  display: string;
  coordinates: [number, number] | null;
};

export type WebPostSalary = {
  min: number | null;
  max: number | null;
  currency: string;
  period: "MONTH" | "YEAR";
};

export type WebPostImage = {
  url: string;
  width: number;
  height: number;
};

export type WebPostLink = {
  title: string;
  url: string;
};

export type WebPost = {
  id: string;
  kind: WebPostKind;
  title: string;
  slug: string;
  contentText: string;
  contentHtml: string;
  publishedAt: Date;
  updatedAt: Date | null;
  author: WebPostAuthor;
  location: WebPostLocation | null;
  isRemote: boolean;
  categories: { id: number; label: string }[];
  tags: string[];
  salary: WebPostSalary | null;
  images: WebPostImage[];
  links: WebPostLink[];
  viewCount: number;
  hasApplyForm: boolean;
  applyQuestions: string[];
};

// types/web-post.ts
//
// Our own domain type. The UI imports ONLY from here, never from
// lib/a1/schemas.ts — see PLAN.md §2.4 (the anti-corruption layer).
// Anything not listed below cannot leak to the browser: no emails, no
// `flags`, no `apply.questions`, no raw `author._id`.

export type WebPostKind = "hiring" | "seeking";

export type WebPostAuthor = {
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
};

// types/web-profile.ts
//
// Our own domain type for a public author profile page (/u/[username]).
// Same rule as types/web-post.ts (PLAN.md §2.4): the UI imports ONLY from
// here, never from lib/a1/schemas.ts. Anything not listed below cannot
// leak to the browser — in particular, `phone`/`email`/`dob` are the ONLY
// three fields gated behind the user's own visibility toggle (see
// lib/a1/user-mappers.ts and lib/a1/user-flags.ts); every other field here
// is safe to show unconditionally once a profile is shown at all.

export type WebProfileLink = {
  title: string;
  url: string;
};

export type WebProfileCompany = {
  name: string;
  description: string | null;
  positionDescription: string | null;
  positionStart: string | null;
  positionEnd: string | null;
  employeesCount: number | null;
  establishedYear: number | null;
  link: WebProfileLink | null;
};

export type WebProfileSkill = {
  value: string;
  level: number;
};

export type WebProfileLanguage = {
  value: string;
  level: number;
};

export type WebProfileLocation = {
  city: string;
  region: string;
  country: string;
  display: string;
};

export type WebProfile = {
  username: string;
  fullName: string;
  avatarUrl: string | null;
  occupation: string;
  expertise: string | null;
  bio: string;
  profileTitle: string | null;
  location: WebProfileLocation | null;
  links: WebProfileLink[];
  companies: WebProfileCompany[];
  education: string[];
  skills: WebProfileSkill[];
  languages: WebProfileLanguage[];
  // null unless the profile owner's own SHOW_* flag permits it — see
  // lib/a1/user-mappers.ts. Never assume non-null means "always safe to
  // display everywhere"; it means the user opted in, full stop.
  phone: string | null;
  email: string | null;
  dob: string | null;
};

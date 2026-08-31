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
  // Raw dataset.companyCategories id — resolve to a label with
  // lib/a1/datasets.ts's fetchCompanyCategories, same as post categories.
  category: number | null;
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
    // [lng, lat], GeoJSON order (confirmed against aone-api-private's
    // LocationService.ts / refreshCoordinates.ts, 2026-08-31) — null for
    // both "no location set" and the backend's own _id===0 "Worldwide"
    // sentinel (which carries no real coordinates), so a null check here
    // is the one place that needs to know about that sentinel at all
    // (lib/a1/user-mappers.ts's mapLocation). Used by
    // components/location-map.tsx to render a small embedded map under a
    // profile's location — Aleksandr, 2026-08-31: "чтобы когда человек
    // указал просто локацию, внизу отображалась карта".
    coordinates: [number, number] | null;
};

export type WebProfileBook = {
  title: string;
  author: string;
};

export type WebProfileTitle = {
  title: string;
};

// Raw dataset ids, same reason as WebProfileCompany.category — resolved
// to labels in app/u/[username]/page.tsx via lib/a1/datasets.ts's
// fetchWorkStylePreferences, not here (keeps this mapper-produced type
// dataset-lookup-free, same split already used for company categories).
export type WebProfileWorkStylePreferences = {
  workEnvironment: number[];
  personalityType: number[];
  workLifeBalance: number[];
  workStyle: number[];
  workAvailability: number[];
  projectType: number[];
  leadershipStyle: number[];
  riskTolerance: number[];
  workloadAndTaskDelegation: number[];
  decisionMakingStyle: number[];
  preferredCollaborationStyle: number[];
  partnershipPreference: number[];
  preferredWorkingEnvironment: number[];
  learningStyle: number[];
};

export type WebProfile = {
  username: string;
  fullName: string;
  avatarUrl: string | null;
  // A media-proxy URL (see lib/a1/mappers.ts buildMediaProxyUrl), same
  // shape as avatarUrl — null when the user hasn't recorded one.
  voiceIntroUrl: string | null;
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
  // Raw dataset.hobbies / dataset.workInterests ids — see
  // WebProfileWorkStylePreferences comment above, same split.
  hobbies: number[];
  workInterests: number[];
  favoriteBooks: WebProfileBook[];
  favoriteMovies: WebProfileTitle[];
  favoriteGames: WebProfileTitle[];
  workStylePreferences: WebProfileWorkStylePreferences;
  // null unless the profile owner's own SHOW_* flag permits it — see
  // lib/a1/user-mappers.ts. Never assume non-null means "always safe to
  // display everywhere"; it means the user opted in, full stop.
  phone: string | null;
  email: string | null;
  dob: string | null;
};

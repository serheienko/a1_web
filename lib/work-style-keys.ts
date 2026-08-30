// lib/work-style-keys.ts
//
// 2026-08-30: pulled out of lib/a1/datasets.ts so client components
// (components/profile-editor.tsx, via components/work-style-labels.ts)
// can import this plain user-field-key -> dataset-key mapping WITHOUT
// pulling lib/a1/datasets.ts's real import chain into a client bundle —
// that file imports lib/a1/client.ts's call(), which imports lib/a1/
// auth.ts (the server-only service-account token cache). components/
// occupation-labels.ts already had to solve exactly this problem for
// OCCUPATION_LABELS; this is the same fix for the work-style key table.
//
// lib/a1/datasets.ts still owns the STRICTER type check (this mapping's
// values must be real keys of WorkStylePreferencesDataset) — it imports
// this file's plain object back and re-exports it through a `satisfies`
// check, so server-side callers (app/u/[username]/page.tsx) get the same
// `WORK_STYLE_DATASET_KEYS` export they always have, unchanged.
//
// One deliberate rename lives in here (not a typo): the *user's own*
// field is `workloadAndTaskDelegation`, but the matching *dataset*
// lookup's key is `workloadTaskDelegation` (no "And") — confirmed
// against the live openapi.json, per lib/a1/datasets.ts's own longer
// comment on this.
export const WORK_STYLE_DATASET_KEYS = {
  workEnvironment: "workEnvironment",
  personalityType: "personalityType",
  workLifeBalance: "workLifeBalance",
  workStyle: "workStyle",
  workAvailability: "workAvailability",
  projectType: "projectType",
  leadershipStyle: "leadershipStyle",
  riskTolerance: "riskTolerance",
  workloadAndTaskDelegation: "workloadTaskDelegation",
  decisionMakingStyle: "decisionMakingStyle",
  preferredCollaborationStyle: "preferredCollaborationStyle",
  partnershipPreference: "partnershipPreference",
  preferredWorkingEnvironment: "preferredWorkingEnvironment",
  learningStyle: "learningStyle",
} as const;

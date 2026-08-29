// app/onboarding/profile/page.tsx
//
// Phase 6 (PLAN.md §6.15): first of the two post-signup onboarding
// steps. Server component so the "Отрасль" dropdown's option list
// (dataset.companyCategories, same no-auth dataset already used by
// lib/a1/datasets.ts's other consumers) is fetched server-side with the
// existing cache()-wrapped fetcher — no new client-facing API route
// needed just to read a public dataset.

import { fetchCompanyCategories } from "@/lib/a1/datasets";
import { ProfileSetupForm } from "./profile-setup-form";

export default async function OnboardingProfilePage() {
  const categories = await fetchCompanyCategories();
  return <ProfileSetupForm categories={categories} />;
}

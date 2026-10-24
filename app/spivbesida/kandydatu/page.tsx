// 24.10.2026: «Співбесіда» -- страница кандидата (см. app/spivbesida/role-page.tsx).
import type { Metadata } from "next";
import { RolePage, roleMetadata } from "../role-page";

export const metadata: Metadata = roleMetadata("candidate");

export default function Page() {
  return <RolePage role="candidate" />;
}

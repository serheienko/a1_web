// lib/cv-roles/roles.ts -- список ролей страниц «пример резюме» и откуда брать вакансии.
import type { RoleDef } from "@/lib/cv-roles/types";

export const CV_ROLES: RoleDef[] = [
  { slug: "software-engineer", source: { kind: "role", role: "backend" }, related: ["backend-developer", "full-stack-developer", "junior-developer"] },
  { slug: "junior-developer", source: null, related: ["frontend-developer", "qa-engineer", "python-developer"] },
  { slug: "frontend-developer", source: { kind: "role", role: "frontend" }, related: ["javascript-react-developer", "full-stack-developer", "ui-ux-designer"] },
  { slug: "backend-developer", source: { kind: "role", role: "backend" }, related: ["java-developer", "python-developer", "nodejs-developer"] },
  { slug: "full-stack-developer", source: { kind: "role", role: "fullstack" }, related: ["frontend-developer", "backend-developer", "nodejs-developer"] },
  { slug: "python-developer", source: { kind: "tech", tech: "Python" }, related: ["data-engineer", "backend-developer", "data-scientist"] },
  { slug: "java-developer", source: { kind: "tech", tech: "Java" }, related: ["backend-developer", "android-developer", "software-engineer"] },
  { slug: "javascript-react-developer", source: { kind: "tech", tech: "React" }, related: ["frontend-developer", "nodejs-developer", "full-stack-developer"] },
  { slug: "nodejs-developer", source: { kind: "tech", tech: "Node.js" }, related: ["backend-developer", "javascript-react-developer", "full-stack-developer"] },
  { slug: "dotnet-developer", source: { kind: "tech", tech: ".NET" }, related: ["backend-developer", "software-engineer", "java-developer"] },
  { slug: "php-developer", source: { kind: "tech", tech: "PHP" }, related: ["backend-developer", "full-stack-developer", "javascript-react-developer"] },
  { slug: "flutter-developer", source: { kind: "tech", tech: "Flutter" }, related: ["ios-developer", "android-developer", "frontend-developer"] },
  { slug: "ios-developer", source: { kind: "tech", tech: "Swift" }, related: ["android-developer", "flutter-developer", "software-engineer"] },
  { slug: "android-developer", source: { kind: "tech", tech: "Kotlin" }, related: ["ios-developer", "flutter-developer", "java-developer"] },
  { slug: "qa-engineer", source: { kind: "role", role: "qa" }, related: ["qa-automation-engineer", "business-analyst", "junior-developer"] },
  { slug: "qa-automation-engineer", source: { kind: "role", role: "qa" }, related: ["qa-engineer", "python-developer", "devops-engineer"] },
  { slug: "devops-engineer", source: { kind: "role", role: "devops" }, related: ["backend-developer", "data-engineer", "software-engineer"] },
  { slug: "data-analyst", source: { kind: "role", role: "data" }, related: ["data-scientist", "business-analyst", "data-engineer"] },
  { slug: "data-scientist", source: { kind: "role", role: "ai" }, related: ["data-analyst", "data-engineer", "python-developer"] },
  { slug: "data-engineer", source: { kind: "role", role: "data" }, related: ["data-analyst", "python-developer", "devops-engineer"] },
  { slug: "product-manager", source: { kind: "role", role: "pm" }, related: ["project-manager", "business-analyst", "ui-ux-designer"] },
  { slug: "project-manager", source: { kind: "role", role: "pm" }, related: ["product-manager", "business-analyst", "it-recruiter"] },
  { slug: "ui-ux-designer", source: { kind: "role", role: "design" }, related: ["product-manager", "frontend-developer", "business-analyst"] },
  { slug: "business-analyst", source: { kind: "role", role: "ba" }, related: ["product-manager", "data-analyst", "project-manager"] },
  { slug: "it-recruiter", source: { kind: "role", role: "recruiter" }, related: ["project-manager", "product-manager", "business-analyst"] },
];

export function findCvRole(slug: string): RoleDef | undefined {
  return CV_ROLES.find((r) => r.slug === slug);
}

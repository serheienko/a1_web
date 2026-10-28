import type { RoleUi } from "@/lib/cv-roles/types";

// Deutsch. Gemeinsame Texte der Seiten „Lebenslauf-Muster nach Rolle“ (28.10.2026).
export const de: RoleUi = {
  breadcrumbExamples: "Lebenslauf-Muster",
  titleTpl: "Lebenslauf {role}: Muster {year} + PDF | A1",
  descriptionTpl:
    "Lebenslauf {role}: Muster {year} mit Skills und Gehältern aus echten A1-Stellen, Beispielprofilen und Tipps. Kostenloser Lebenslauf als PDF.",
  h1Tpl: "Lebenslauf {role}: Muster {year}",
  leadTpl:
    "Was in den Lebenslauf {role} gehört, welche Skills Arbeitgeber verlangen und was sie zahlen, auf Basis echter Stellenanzeigen auf A1. Erstellen Sie so einen Lebenslauf kostenlos als PDF aus Ihrem Profil.",
  ctaCreate: "Lebenslauf kostenlos erstellen",
  ctaDownload: "Meinen Lebenslauf herunterladen",
  ctaFill: "Profil ergänzen",
  signedInHint: "Ihr Lebenslauf entsteht aus Ihrem Profil. Je vollständiger das Profil, desto stärker der Lebenslauf.",
  h2Recruiters: "Worauf Recruiter zuerst achten",
  h2Skills: "Was {n} Stellenanzeigen auf A1 verlangen",
  skillsNote: "Anteil der A1-Stellen für diese Rolle, in denen der Skill genannt wird.",
  skillsFallback: "Wichtige Skills für diese Rolle",
  h2Salary: "Gehälter in A1-Stellenanzeigen",
  salaryNote: "Median der Gehaltsspannen in Stellen mit Gehaltsangabe, USD pro Monat.",
  salaryFrom: "von",
  salaryTo: "bis",
  h2Summaries: "Beispiele für das Kurzprofil",
  levels: { junior: "Junior", middle: "Middle", senior: "Senior" },
  h2Tip: "Tipp für diese Rolle",
  h2Github: "Projekte und GitHub zeigen",
  githubText:
    "Links zu 2-3 echten Projekten überzeugen mehr als eine lange Liste von Technologien: Beschreiben Sie kurz, was Sie selbst umgesetzt haben und mit welchem Ergebnis. Verifizieren Sie GitHub in Ihrem A1-Profil per Anmeldung bei GitHub, dann zeigt Ihr Lebenslauf eine Kachel mit Aktivitätskalender und echter Anzahl an Contributions.",
  h2Mistakes: "Typische Fehler im IT-Lebenslauf",
  mistakes: [
    "Aufgaben statt Ergebnisse. Statt „am Backend gearbeitet“ schreiben Sie, was sich verändert hat: Geschwindigkeit, Nutzerzahlen, weniger Bugs.",
    "Jede Technologie aufzählen, die Sie je angefasst haben. Behalten Sie nur, worüber Sie im Gespräch sicher sprechen können, und zeigen Sie Ihr Niveau.",
    "Ein Lebenslauf für alle Stellen. Übernehmen Sie die Skill-Bezeichnungen aus der Anzeige, damit Recruiter und ATS-Software Sie finden.",
    "Fehlende oder kaputte Links zu Code und Portfolio. Öffnen Sie vor dem Versand jeden Link.",
    "Tippfehler und uneinheitliche Schreibweisen wie „javascript“, „JS“ und „JavaScript“ in einem Dokument. Schreiben Sie Technologien wie in der offiziellen Dokumentation.",
  ],
  h2Faq: "Häufige Fragen",
  faq: [
    {
      q: "Wie lang sollte ein Lebenslauf {role} sein?",
      a: "Für Junior und Middle reicht eine Seite, für Senior sind zwei in Ordnung. Ein Lebenslauf von A1 passt auf eine Seite und wird bei einem großen Profil sauber auf einer zweiten fortgesetzt.",
    },
    {
      q: "Wie schreibe ich einen Lebenslauf {role} ohne Berufserfahrung?",
      a: "Zeigen Sie Studien- und eigene Projekte, Kurse, Hackathons und ehrenamtliche Arbeit. Ein verifiziertes GitHub mit Aktivitätskalender im A1-Lebenslauf zeigt deutlich, dass Sie regelmäßig programmieren.",
    },
    {
      q: "Welche Skills gehören in den Lebenslauf {role}?",
      a: "Die, die in Stellenanzeigen am häufigsten vorkommen: siehe Statistik oben. Das Niveau jedes Skills im A1-Lebenslauf stammt vom Schieberegler in Ihrem Profil, also schätzen Sie sich ehrlich ein.",
    },
    {
      q: "Brauche ich den Lebenslauf {role} auf Englisch?",
      a: "Für internationale Unternehmen und viele Tech-Firmen ja. A1 erkennt die Sprache des Lebenslaufs am Text Ihres Profils: Füllen Sie das Profil auf Englisch aus, dann sind auch die Überschriften auf Englisch.",
    },
  ],
  h2Related: "Ähnliche Berufe",
  h2Jobs: "Aktuelle Stellen: {role}",
  jobsMore: "Alle Stellen",
  hubTitle: "Lebenslauf-Muster nach Beruf",
  hubLead:
    "Worauf Recruiter achten, welche Skills A1-Stellenanzeigen verlangen und was gezahlt wird. Wählen Sie Ihre Rolle.",
};

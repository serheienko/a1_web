import type { RoleUi } from "@/lib/cv-roles/types";

// Français. Textes communs des pages « Exemple de CV par métier » (28.10.2026).
export const fr: RoleUi = {
  breadcrumbExamples: "Exemples de CV",
  titleTpl: "CV {role} : exemple {year} + PDF | A1",
  descriptionTpl:
    "CV {role} : exemple {year} avec compétences et salaires issus des offres A1, profils types et conseils. Créez votre CV gratuit en PDF.",
  h1Tpl: "CV {role} : exemple {year}",
  leadTpl:
    "Que mettre dans un CV {role}, quelles compétences les employeurs demandent et combien ils paient, d'après de vraies offres publiées sur A1. Créez gratuitement le même type de CV en PDF à partir de votre profil.",
  ctaCreate: "Créer mon CV gratuit",
  ctaDownload: "Télécharger mon CV",
  ctaFill: "Compléter mon profil",
  signedInHint: "Votre CV est généré à partir de votre profil. Plus votre profil est complet, plus votre CV est convaincant.",
  h2Recruiters: "Ce que le recruteur regarde en premier",
  h2Skills: "Ce que demandent {n} offres sur A1",
  skillsNote: "Part des offres A1 pour ce métier qui mentionnent la compétence.",
  skillsFallback: "Compétences clés pour ce métier",
  h2Salary: "Salaires dans les offres A1",
  salaryNote: "Médiane des fourchettes dans les offres qui indiquent un salaire, en USD par mois.",
  salaryFrom: "de",
  salaryTo: "à",
  h2Summaries: "Exemples d'accroche",
  levels: { junior: "Junior", middle: "Confirmé", senior: "Senior" },
  h2Tip: "Conseil pour ce métier",
  h2Github: "Mettre en avant vos projets et GitHub",
  githubText:
    "Des liens vers 2 ou 3 vrais projets convainquent davantage qu'une longue liste de technologies : expliquez brièvement ce que vous avez réalisé vous-même et avec quel résultat. Vérifiez GitHub dans votre profil A1 en vous connectant à GitHub, et votre CV affichera une vignette avec votre calendrier d'activité et le nombre réel de contributions.",
  h2Mistakes: "Erreurs fréquentes dans un CV IT",
  mistakes: [
    "Lister des tâches plutôt que des résultats. Au lieu de « travaillé sur le backend », dites ce qui a changé : rapidité, nombre d'utilisateurs, moins de bugs.",
    "Citer toutes les technologies que vous avez un jour effleurées. Gardez celles dont vous pouvez parler en entretien et indiquez votre niveau.",
    "Envoyer le même CV à toutes les offres. Reprenez les intitulés de compétences de l'offre pour être trouvé par le recruteur comme par le logiciel ATS.",
    "Liens vers le code ou le portfolio absents ou cassés. Ouvrez chaque lien avant d'envoyer votre CV.",
    "Fautes de frappe et noms de technologies incohérents, comme « javascript », « JS » et « JavaScript » dans un même document. Écrivez-les comme dans la documentation officielle.",
  ],
  h2Faq: "Questions fréquentes",
  faq: [
    {
      q: "Quelle longueur pour un CV {role} ?",
      a: "Une page suffit pour un profil junior ou confirmé, deux sont acceptables pour un senior. Le CV A1 tient sur une page et se poursuit proprement sur une deuxième si votre profil est très fourni.",
    },
    {
      q: "Comment faire un CV {role} sans expérience ?",
      a: "Montrez vos projets d'études et personnels, formations, hackathons et missions bénévoles. Un GitHub vérifié avec calendrier d'activité sur le CV A1 prouve que vous pratiquez régulièrement.",
    },
    {
      q: "Quelles compétences mettre dans un CV {role} ?",
      a: "Celles qui reviennent le plus dans les offres : voir les statistiques ci-dessus. Le niveau de chaque compétence sur le CV A1 vient du curseur de votre profil, alors évaluez-vous honnêtement.",
    },
    {
      q: "Faut-il un CV {role} en anglais ?",
      a: "Pour les entreprises internationales et les offres à l'étranger, oui. A1 détecte la langue du CV à partir du texte de votre profil : rédigez votre profil en anglais et les titres seront aussi en anglais.",
    },
  ],
  h2Related: "Métiers proches",
  h2Jobs: "Offres récentes : {role}",
  jobsMore: "Toutes les offres",
  hubTitle: "Exemples de CV par métier",
  hubLead:
    "Ce que regardent les recruteurs, les compétences demandées dans les offres A1 et les salaires. Choisissez votre métier.",
};

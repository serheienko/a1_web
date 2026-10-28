import type { CvLandingContent } from "@/lib/cv-landing/types";

// Français. Localisé depuis uk.ts (28.10.2026). Termes principaux : "créer un CV", "CV gratuit".
export const fr: CvLandingContent = {
  title: "Créer un CV gratuit pour l'IT : PDF avec QR | A1",
  description:
    "Créez un CV gratuit pour l'IT avec votre profil A1 : PDF prêt, QR code vers votre profil en ligne, GitHub et Stack Overflow vérifiés. Sans paiement.",
  breadcrumbHome: "A1",
  breadcrumb: "Créer un CV",
  eyebrow: "CV Builder pour l'IT",
  h1: "Créer un CV pour les métiers de l'IT : gratuit, en PDF",
  lead:
    "Remplissez votre profil A1 une seule fois et nous en tirons un beau CV en PDF : photo, expérience, compétences avec niveaux, langues, statistiques GitHub et QR code vers votre profil en ligne. Sans paiement, sans période d'essai, sans carte.",
  badges: ["Gratuit pour toujours", "PDF en quelques secondes", "QR vers votre profil en ligne"],
  ctaCreate: "Créer mon CV gratuit",
  ctaDownload: "Télécharger mon CV",
  ctaFill: "Compléter mon profil",
  signedInHint: "Votre CV est généré à partir de votre profil. Plus votre profil est complet, plus votre CV est convaincant.",
  sampleAlt: "Exemple de CV A1 : photo, compétences, expérience, statistiques GitHub et QR code",

  stepsTitle: "Comment ça marche : 3 étapes",
  steps: [
    {
      title: "Connectez-vous à A1",
      text: "L'inscription prend une minute : e-mail, Google ou Apple. Votre profil A1 est la base de votre CV.",
    },
    {
      title: "Remplissez votre profil",
      text: "Ajoutez votre expérience, votre formation, vos compétences avec niveaux, vos langues et vos liens. Vérifiez GitHub, Dribbble ou Stack Overflow pour afficher des statistiques en direct sur votre CV.",
    },
    {
      title: "Téléchargez le PDF",
      text: "Appuyez sur « Enregistrer le CV » dans votre profil. Vous obtenez un fichier prêt avec QR code, liens cliquables et le design soigné d'A1.",
    },
  ],

  insideTitle: "Ce que contient votre CV",
  insideLead:
    "Nous avons gardé ce qu'un recruteur IT veut voir dans les 10 premières secondes et retiré tout le superflu. Les rubriques vides ne s'affichent pas : s'il manque quelque chose dans votre profil, le CV devient simplement plus compact.",
  inside: [
    {
      title: "QR code vers votre profil en ligne",
      text: "Le recruteur scanne le code sur la version imprimée ou clique dessus dans le PDF et voit votre profil A1 à jour : expérience récente, projets, présentation vocale.",
    },
    {
      title: "Statistiques vérifiées",
      text: "Contributions GitHub avec calendrier d'activité, travaux Dribbble, réputation et badges Stack Overflow. Uniquement depuis les comptes que vous avez vérifiés.",
    },
    {
      title: "Compétences avec niveaux",
      text: "Le niveau de chaque compétence vient du curseur de votre profil. Vos compétences les plus fortes apparaissent en premier.",
    },
    {
      title: "Expérience en frise chronologique",
      text: "Entreprises, années et description du poste s'alignent sur une ligne claire. Le recruteur voit tout de suite combien d'années d'expérience vous avez.",
    },
    {
      title: "Contacts cliquables",
      text: "E-mail, Telegram, site et profil s'ouvrent d'un clic directement depuis le PDF. Le téléphone et l'e-mail n'apparaissent que si vous les avez rendus visibles dans votre profil.",
    },
    {
      title: "Présentation vocale",
      text: "Si votre profil contient un « à propos » enregistré à l'oral, votre CV affiche un bouton « Écoutez-moi ». Le recruteur vous entend avant même l'entretien.",
    },
  ],

  verifiedTitle: "Pourquoi les recruteurs font confiance aux statistiques vérifiées",
  verifiedText: [
    "Tout le monde peut écrire « maîtrise de Git » sur son CV. Seul quelqu'un qui code vraiment peut montrer 260 contributions par an et de vrais dépôts. C'est pourquoi, sur un CV A1, les chiffres GitHub, Dribbble et Stack Overflow n'apparaissent qu'après que vous avez vérifié le compte en vous connectant au service lui-même.",
    "Les chiffres se mettent à jour automatiquement. Inutile de réécrire votre CV chaque fois que vous terminez une tâche ou publiez un nouveau travail : téléchargez simplement le PDF à nouveau et il contiendra les données les plus récentes.",
  ],

  rolesTitle: "Un CV pour chaque métier de l'IT",
  rolesLead:
    "Le générateur de CV fonctionne aussi bien pour les développeurs, testeurs, designers, analystes et managers. Les rubriques qui ne concernent pas votre poste n'apparaissent tout simplement pas.",
  roles: [
    "Software Engineer",
    "Junior Developer",
    "Frontend",
    "Backend",
    "Full-Stack",
    "Python",
    "Java",
    "JavaScript / React",
    "Node.js",
    ".NET / C#",
    "PHP",
    "Flutter",
    "iOS",
    "Android",
    "QA Manual",
    "QA Automation",
    "DevOps",
    "Data Analyst",
    "Data Scientist / ML",
    "Data Engineer",
    "Product Manager",
    "Project Manager",
    "UI/UX Designer",
    "Business Analyst",
    "IT Recruiter",
  ],

  freeTitle: "Un CV vraiment gratuit",
  freeText:
    "Beaucoup de générateurs de CV « gratuits » demandent un paiement au moment du téléchargement ou activent un abonnement payant après la période d'essai. Sur A1, votre CV est gratuit : vous obtenez le PDF complet sans limite et pouvez le télécharger autant de fois que vous le souhaitez.",
  compareHead: ["", "A1", "Générateur classique"],
  compare: [
    ["Téléchargement PDF", "Gratuit", "Souvent payant"],
    ["Période d'essai et abonnement", "Aucun", "Souvent"],
    ["Carte bancaire", "Inutile", "Souvent exigée"],
    ["QR code vers le profil en ligne", "Oui", "Non"],
    ["GitHub et Stack Overflow vérifiés", "Oui", "Non"],
    ["Offres d'emploi à côté du CV", "Oui", "Non"],
  ],

  atsTitle: "Un CV lisible par les humains comme par les logiciels",
  atsText: [
    "Beaucoup d'entreprises font d'abord passer les CV par des logiciels de recrutement (ATS). Le texte du PDF A1 est un vrai texte, pas une image : on peut le sélectionner, le copier et le rechercher, donc ces logiciels voient votre nom, vos compétences et votre expérience.",
    "Pour un lecteur humain, le CV tient sur une page, a des titres clairs et se lit en une minute. Si votre profil est très fourni, le CV passe proprement sur une deuxième page.",
  ],

  langsTitle: "Votre CV en 9 langues",
  langsText: [
    "Les titres du CV existent en ukrainien, anglais, russe, allemand, espagnol, français, polonais, portugais et chinois. Nous détectons la langue à partir du texte de votre profil : si vous l'avez rempli en français, votre CV sera en français.",
    "Nous ne traduisons ni ne modifions votre propre texte (à propos, description des postes) : votre CV affiche exactement ce que vous avez écrit.",
  ],

  jobsTitle: "Du CV à l'emploi",
  jobsText:
    "A1, ce n'est pas qu'un générateur de CV. Vous y trouverez des dizaines de milliers d'offres IT en Ukraine et dans le monde entier, et vous pouvez postuler directement depuis le profil qui sert à créer votre CV.",
  jobsCta: "Voir les offres",

  faqTitle: "Questions fréquentes",
  faq: [
    {
      q: "Le générateur de CV d'A1 est-il vraiment gratuit ?",
      a: "Oui. Le PDF complet est gratuit, sans période d'essai, sans abonnement et sans carte. En bas du CV figurent une petite mention « Créé avec A1 » et un lien vers votre profil.",
    },
    {
      q: "Faut-il s'inscrire ?",
      a: "Oui, il vous faut un profil A1 : c'est à partir de lui que le CV est généré. L'inscription prend une minute, et votre profil sert ensuite à la fois de CV en ligne partageable par lien et de candidature aux offres.",
    },
    {
      q: "À quoi sert le QR code sur le CV ?",
      a: "Il mène à votre profil A1. Le recruteur scanne le code sur le CV imprimé ou clique dessus dans le PDF et voit la version à jour : nouveaux projets, expérience, présentation vocale.",
    },
    {
      q: "Comment les statistiques GitHub, Dribbble et Stack Overflow sont-elles vérifiées ?",
      a: "Vous vous connectez au service lui-même via le bouton « Vérifier » de votre profil. Ensuite, les chiffres sont récupérés et mis à jour automatiquement, et la vignette correspondante apparaît sur votre CV.",
    },
    {
      q: "Mon CV passera-t-il les ATS ?",
      a: "Le texte de notre PDF est un vrai texte, pas une image, donc les logiciels de recrutement le lisent : nom, coordonnées, compétences et expérience. Par sécurité, écrivez vos compétences comme elles apparaissent dans les offres.",
    },
    {
      q: "Puis-je créer mon CV en anglais ?",
      a: "Oui. Nous détectons la langue du CV à partir du texte de votre profil. Rédigez votre « à propos » et votre expérience en anglais, et les titres du CV seront aussi en anglais.",
    },
    {
      q: "Que doit contenir un CV pour l'IT ?",
      a: "Le poste et le niveau, une courte présentation, l'expérience avec des résultats, les compétences clés, les langues et des liens vers votre code ou votre portfolio. Pour un senior, comptent l'ampleur des missions et le leadership ; pour un junior, les projets d'études et personnels.",
    },
    {
      q: "Comment faire un CV sans expérience professionnelle ?",
      a: "Mettez en avant vos projets d'études et personnels, vos formations, vos hackathons et un GitHub vérifié. Le calendrier d'activité du CV A1 montre clairement que vous codez régulièrement.",
    },
    {
      q: "Puis-je masquer mon téléphone ou mon e-mail ?",
      a: "Oui. Le téléphone et l'e-mail n'apparaissent sur le CV que si vous les avez rendus visibles dans les paramètres du profil. Tout ce qui n'est pas dans votre profil ne sera pas non plus sur le CV.",
    },
    {
      q: "Comment mettre à jour mon CV ?",
      a: "Modifiez votre profil et téléchargez de nouveau le PDF. Le CV est recréé à chaque fois à partir des données actuelles, il n'y a donc rien à modifier séparément.",
    },
  ],

  finalTitle: "Votre CV en quelques minutes",
  finalText: "Remplissez votre profil une fois et téléchargez un CV à jour chaque fois que vous en avez besoin.",
};

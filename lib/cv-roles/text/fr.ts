import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const fr: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "Ingénieur logiciel",
    nameInTitle: "ingénieur logiciel",
    recruiters:
      "Les recruteurs regardent d'abord les systèmes que vous avez construits et leur échelle : trafic, volume de données, taille de l'équipe. Ils vérifient que votre stack correspond au poste et que chaque expérience montre une vraie responsabilité, pas une simple liste de tickets. Des chiffres d'impact clairs (latence, disponibilité, coûts) vous font entrer le plus vite dans la short-list.",
    summaries: {
      junior:
        "Ingénieur logiciel avec 1 an d'expérience sur des outils internes en Go et PostgreSQL. J'ai développé un service de reporting qui a remplacé les exports Excel manuels et fait gagner environ 6 heures par semaine à l'équipe finance. J'écris des tests par défaut et je garde mes pull requests courtes et faciles à relire.",
      middle:
        "Ingénieur logiciel avec 4 ans d'expérience en backend et plateforme (Go, Kafka, PostgreSQL, Kubernetes). J'ai conçu un pipeline de commandes événementiel qui traite 2 millions d'événements par jour et réduit le temps de traitement p95 de 900 ms à 180 ms. Je porte mes services de bout en bout, du document de conception à l'astreinte.",
      senior:
        "Ingénieur logiciel senior avec 9 ans d'expérience en systèmes distribués pour des produits SaaS de plus de 3 millions d'utilisateurs. J'ai piloté le découpage d'un monolithe en 14 services, ce qui a fait passer le temps de déploiement de 2 heures à 12 minutes et réduit les incidents de 40 %. J'accompagne 5 ingénieurs et j'anime les revues d'architecture de trois équipes.",
    },
    tip: "Pour chaque poste, ajoutez une ligne avec un chiffre concret : requêtes par seconde, enregistrements traités, latence ou coûts économisés. Sans notion d'échelle, un CV d'ingénieur logiciel ressemble vite à celui d'un junior.",
    skills: ["Go", "Python", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "System Design", "AWS"],
  },
  "junior-developer": {
    name: "Développeur junior",
    nameInTitle: "développeur junior",
    recruiters:
      "Avec peu d'expérience professionnelle, les recruteurs vous jugent sur vos projets : démo en ligne, dépôt GitHub propre et README qui explique ce que vous avez construit. Ils vérifient aussi que votre liste de compétences est honnête et centrée sur une seule stack. Stages, alternance, missions freelance et hackathons comptent : présentez-les comme de vraies expériences.",
    summaries: {
      junior:
        "Développeur junior spécialisé en JavaScript et React, avec un stage de 6 mois. J'ai créé un widget de prise de rendez-vous utilisé par 3 cabinets médicaux, qui a réduit d'environ un tiers les réservations par téléphone. J'apprends vite grâce aux revues de code et je livre de petites modifications testées.",
      middle:
        "Développeur avec 1,5 an d'expérience professionnelle en TypeScript, React et Node.js, prêt à évoluer vers un poste confirmé. J'ai livré plus de 40 fonctionnalités pour un back-office e-commerce et mis en place des tests qui ont fait passer la couverture de 20 % à 65 %. Je prends en charge des tâches de bout en bout, de l'API à l'interface.",
      senior:
        "En reconversion après 6 ans dans la logistique, avec 1 an de développement à temps plein en Python et Django. Chez mon ancien employeur, j'ai automatisé le reporting de l'entrepôt et économisé 10 heures par semaine ; aujourd'hui je développe des API REST avec tests et CI. Ma connaissance du métier m'aide à poser les bonnes questions avant d'écrire du code.",
    },
    tip: "Mettez 2 ou 3 projets terminés en haut de votre CV, chacun avec un lien en ligne, la stack et une phrase sur le problème résolu. Une application déployée vaut mieux que dix clones de tutoriels.",
    skills: ["JavaScript", "TypeScript", "React", "HTML/CSS", "Git", "Node.js", "SQL", "API REST"],
  },
  "frontend-developer": {
    name: "Développeur front-end",
    nameInTitle: "développeur front-end",
    recruiters:
      "Les recruteurs ouvrent votre portfolio ou vos liens en ligne avant de lire le reste : les URL doivent fonctionner. Ils vérifient votre framework (React, Vue ou Angular), TypeScript et votre approche de la performance et de l'accessibilité. Des indicateurs comme les Core Web Vitals, la taille du bundle ou la hausse de conversion font ressortir un CV front-end.",
    summaries: {
      junior:
        "Développeur front-end avec 1 an d'expérience en React et TypeScript. J'ai refait le parcours d'inscription d'une landing page SaaS et fait passer le taux de finalisation de 41 % à 53 %. Je soigne le HTML sémantique, le responsive et la propreté des composants.",
      middle:
        "Développeur front-end avec 4 ans d'expérience en React, Next.js et TypeScript. J'ai migré un site marketing vers le rendu côté serveur et amélioré le LCP de 4,1 s à 1,6 s, ce qui a augmenté le trafic organique de 25 %. J'ai créé une bibliothèque de composants utilisée par 4 équipes produit.",
      senior:
        "Ingénieur front-end senior avec 8 ans d'expérience sur des applications web complexes en React et TypeScript. J'ai piloté la migration d'une base de code de 300 000 lignes vers une architecture micro-frontends et réduit le temps de build de 70 %. Je définis les standards front-end, je relis l'architecture et j'accompagne 6 développeurs.",
    },
    tip: "Ajoutez un lien en ligne à côté de chaque projet et citez un indicateur de performance ou d'UX que vous avez amélioré (LCP, taille du bundle, conversion). Les recruteurs cliquent bien plus souvent sur les liens qu'ils ne lisent les puces.",
    skills: ["React", "TypeScript", "Next.js", "HTML/CSS", "Tailwind CSS", "Redux", "Jest", "Performance web"],
  },
  "backend-developer": {
    name: "Développeur back-end",
    nameInTitle: "développeur back-end",
    recruiters:
      "Les recruteurs comparent d'abord votre langage principal et votre framework avec l'offre, puis cherchent bases de données, files de messages et expérience cloud. Ils veulent voir la charge supportée par vos services et comment vous avez assuré leur fiabilité. La conception d'API, la modélisation des données et la gestion d'incidents sont des signaux forts.",
    summaries: {
      junior:
        "Développeur back-end avec 1 an d'expérience en Java et Spring Boot. J'ai développé des endpoints REST pour un service de rapprochement des paiements et écrit des tests d'intégration avec Testcontainers. J'aime comprendre comment les données circulent dans le système, pas seulement faire fonctionner l'endpoint.",
      middle:
        "Développeur back-end avec 5 ans d'expérience en Node.js, PostgreSQL et Redis. J'ai repensé l'API du catalogue pour tenir 3 000 requêtes par seconde et réduit la charge de la base de 60 % grâce au cache et à l'optimisation des requêtes. Je rédige des documents de conception, je participe aux astreintes et je rends les services observables avec Grafana.",
      senior:
        "Ingénieur back-end senior avec 10 ans d'expérience sur des systèmes à forte charge en Java et Kotlin. J'ai conçu une plateforme de facturation qui traite 40 M$ par mois avec 99,98 % de disponibilité et piloté le passage à l'event sourcing. J'anime les revues de conception et j'ai fait grandir une équipe de 3 à 9 ingénieurs.",
    },
    tip: "Décrivez au moins un service avec ses chiffres : requêtes par seconde, volume de données, disponibilité. Le travail back-end est invisible pour les utilisateurs, seuls les chiffres montrent son poids.",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka", "Docker", "API REST", "Microservices"],
  },
  "full-stack-developer": {
    name: "Développeur full stack",
    nameInTitle: "développeur full stack",
    recruiters:
      "Les recruteurs vérifient que vous êtes vraiment solide des deux côtés, et pas seulement un développeur front-end qui a touché une API une fois. Ils cherchent un duo de stacks clair (par exemple React et Node.js) et des fonctionnalités livrées de bout en bout. L'expérience du déploiement et des bases de données départage souvent deux profils proches.",
    summaries: {
      junior:
        "Développeur full stack avec 1 an d'expérience en React, Node.js et MongoDB. J'ai créé de A à Z un petit CRM pour une agence locale, du schéma de base de données au déploiement sur un VPS. Il gère aujourd'hui plus de 500 leads par mois sans tableur manuel.",
      middle:
        "Développeur full stack avec 4 ans d'expérience en TypeScript, Next.js, NestJS et PostgreSQL. J'ai livré de bout en bout un module de facturation par abonnement, de l'intégration Stripe au tableau de bord client, qui a apporté 18 % de revenus récurrents en plus. J'ai aussi mis en place une CI/CD qui a réduit le temps de mise en production d'une journée à 20 minutes.",
      senior:
        "Ingénieur full stack senior avec 9 ans d'expérience sur des produits SaaS en React, Node.js et AWS. En tant que tech lead, j'ai mené une plateforme B2B du MVP à 120 entreprises clientes en maintenant les coûts d'infrastructure sous 4 % du chiffre d'affaires. J'équilibre vitesse produit et qualité du code et je recrute pour les deux côtés de la stack.",
    },
    tip: "Montrez au moins une fonctionnalité que vous avez portée de bout en bout en nommant chaque couche : base de données, API, interface et déploiement. Cela prouve le profil full stack mieux qu'une longue liste de compétences.",
    skills: ["TypeScript", "React", "Node.js", "Next.js", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Développeur Python",
    nameInTitle: "développeur Python",
    recruiters:
      "Python sert au web, à la data et à l'automatisation : les recruteurs vérifient donc d'abord quel Python vous pratiquez (Django, FastAPI, pipelines de données ou scripts). Ils regardent les tests (pytest), l'expérience en asynchrone et les bases de données utilisées. Des résultats concrets, comme des heures automatisées ou des API plus rapides, montrent votre vrai niveau.",
    summaries: {
      junior:
        "Développeur Python avec 1 an d'expérience en Django et PostgreSQL. J'ai automatisé l'import des grilles tarifaires fournisseurs, ce qui fait gagner 8 heures par semaine à l'équipe commerciale et supprime les erreurs de copier-coller. J'écris des tests avec pytest et je respecte la PEP 8.",
      middle:
        "Développeur Python avec 4 ans d'expérience en API avec FastAPI, SQLAlchemy et Celery. J'ai réécrit en asynchrone un service synchrone trop lent et fait passer le temps de réponse de 1,2 s à 150 ms à charge égale. Je maintiens des tâches de fond qui traitent 5 millions d'enregistrements par jour.",
      senior:
        "Ingénieur Python senior avec 9 ans d'expérience en backend et plateformes de données. J'ai conçu une plateforme Django multi-tenant pour 400 clients professionnels et piloté sa migration vers Kubernetes, avec 35 % d'économies d'hébergement. J'accompagne les développeurs et je porte les standards Python de 3 équipes.",
    },
    tip: "Indiquez dès le titre quel Python vous écrivez : web (Django, FastAPI), data ou automatisation. Un intitulé trop général vous fait correspondre à des offres qui ne vous concernent pas.",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "pytest", "Docker", "Redis"],
  },
  "java-developer": {
    name: "Développeur Java",
    nameInTitle: "développeur Java",
    recruiters:
      "Les recruteurs vérifient votre version de Java et l'écosystème Spring, ainsi que votre expérience des microservices et du messaging. Les secteurs comme la banque, l'assurance ou les télécoms pèsent lourd : nommez le secteur. Ils apprécient aussi le travail sur la performance : tuning de la JVM, optimisation des requêtes et chiffres de charge.",
    summaries: {
      junior:
        "Développeur Java avec 1 an d'expérience en Java 17 et Spring Boot. J'ai développé des services REST pour un SIRH interne et les ai couverts à 80 % avec JUnit et Mockito. J'apprends actuellement Kafka et j'aime résoudre les problèmes de concurrence délicats.",
      middle:
        "Développeur Java avec 5 ans d'expérience en Spring Boot, Hibernate et Kafka dans le secteur bancaire. J'ai créé un service de surveillance des transactions qui contrôle 1,5 million de paiements par jour et réduit de 30 % les fausses alertes de fraude. Un réglage de la JVM a aussi diminué la consommation mémoire d'un quart.",
      senior:
        "Ingénieur Java senior avec 11 ans d'expérience dans la fintech et les télécoms. J'ai piloté la migration d'un module bancaire central d'une ancienne stack EJB vers des microservices Spring Boot, sans interruption pour 2 millions de clients. Je relis l'architecture, je fixe les standards de code et j'encadre une équipe de 8 personnes.",
    },
    tip: "Indiquez la version exacte de Java et le secteur pour chaque poste (par exemple Java 17, banque). Les recruteurs grands comptes filtrent sur les deux, et une version ancienne sans mise à jour soulève des questions.",
    skills: ["Java", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "Microservices", "JUnit", "Maven"],
  },
  "javascript-react-developer": {
    name: "Développeur React",
    nameInTitle: "développeur React",
    recruiters:
      "Les recruteurs évaluent la profondeur de vos connaissances React : hooks, gestion d'état, TypeScript et outils modernes comme Next.js ou React Query. Ils ouvrent vos projets en ligne pour juger le ressenti de l'interface. L'expérience des tests et de l'optimisation des performances distingue un développeur React solide d'un niveau tutoriel.",
    summaries: {
      junior:
        "Développeur React avec 1 an d'expérience en React, TypeScript et React Query. J'ai développé l'historique des commandes et les filtres d'un tableau de bord e-commerce utilisé chaque jour par 200 responsables. Je teste mes composants avec React Testing Library.",
      middle:
        "Développeur React avec 4 ans d'expérience en React, TypeScript, Redux Toolkit et Next.js. J'ai refactorisé un tableau de bord de plus de 60 écrans pour limiter les re-renders et amélioré la réactivité de 45 %. J'ai aussi construit un design system avec Storybook utilisé par 3 équipes.",
      senior:
        "Ingénieur React senior avec 8 ans d'expérience sur de grandes applications monopages et Next.js. J'ai piloté le passage des composants de classe et de Redux aux hooks et aux server components, ce qui a réduit le bundle de 40 % et divisé par deux le temps d'intégration des nouveaux développeurs. J'accompagne 5 développeurs front-end.",
    },
    tip: "Mentionnez vos choix de gestion d'état et de récupération des données (Redux Toolkit, Zustand, React Query) et pourquoi vous les avez faits. Cela montre que vous pensez architecture, pas seulement composants.",
    skills: ["React", "TypeScript", "JavaScript", "Next.js", "Redux Toolkit", "React Query", "Jest", "Storybook"],
  },
  "nodejs-developer": {
    name: "Développeur Node.js",
    nameInTitle: "développeur Node.js",
    recruiters:
      "Les recruteurs regardent le framework (Express, NestJS, Fastify), TypeScript et les bases de données utilisées avec Node.js. Ils vérifient votre maîtrise de l'asynchrone, des files de messages et des fonctions temps réel comme les WebSockets. Des chiffres de charge et de temps de réponse prouvent que vous connaissez Node.js en production.",
    summaries: {
      junior:
        "Développeur Node.js avec 1 an d'expérience en Express, TypeScript et MongoDB. J'ai développé le service de notifications d'une application de livraison qui envoie 20 000 notifications push par jour. J'écris des tests avec Jest et je documente les API dans Swagger.",
      middle:
        "Développeur Node.js avec 4 ans d'expérience en NestJS, PostgreSQL et RabbitMQ. J'ai créé un chat temps réel sur WebSockets pour 15 000 utilisateurs simultanés avec une livraison des messages sous 100 ms. Le passage des services en TypeScript strict a réduit les erreurs d'exécution de 35 %.",
      senior:
        "Ingénieur Node.js senior avec 9 ans d'expérience en API et systèmes événementiels. J'ai conçu le backend d'une marketplace sur NestJS et Kafka qui tient 8 000 requêtes par seconde, et réduit les coûts cloud de 30 %. Je dirige une équipe de 6 personnes et j'anime les revues d'architecture et de sécurité.",
    },
    tip: "Montrez que vous comprenez l'event loop en pratique : citez un goulot d'étranglement que vous avez trouvé (code bloquant, fuite mémoire, requête lente) et comment vous l'avez corrigé.",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "MongoDB", "RabbitMQ", "WebSockets"],
  },
  "dotnet-developer": {
    name: "Développeur .NET",
    nameInTitle: "développeur .NET",
    recruiters:
      "Les recruteurs vérifient que vous travaillez sur un .NET moderne (6, 8 ou plus récent), ASP.NET Core et Entity Framework, et pas uniquement sur l'ancien .NET Framework. Ils regardent l'expérience Azure, SQL Server et le secteur d'activité. Les migrations de code legacy sont un vrai plus.",
    summaries: {
      junior:
        "Développeur .NET junior avec 1 an d'expérience en C#, ASP.NET Core et SQL Server. J'ai développé une API interne de gestion des stocks et écrit des tests xUnit pour ses règles métier. Je me forme actuellement à Azure Service Bus.",
      middle:
        "Développeur .NET avec 5 ans d'expérience en C#, ASP.NET Core, Entity Framework Core et Azure. J'ai migré un système de gestion des sinistres d'un assureur de .NET Framework 4.7 vers .NET 8 et divisé par deux le temps de réponse. J'ai mis en place une CI/CD dans Azure DevOps qui a rendu les mises en production hebdomadaires routinières.",
      senior:
        "Ingénieur .NET senior avec 11 ans d'expérience sur des systèmes d'entreprise et de santé. J'ai conçu une plateforme de données cliniques sur .NET et Azure qui traite 3 millions d'enregistrements par jour sous de fortes contraintes de conformité. Je dirige une équipe de 7 développeurs et je porte l'architecture et la qualité du code.",
    },
    tip: "Précisez toujours la version de .NET utilisée sur chaque projet. Une migration de .NET Framework vers un .NET moderne fait partie des réalisations les plus appréciées pour ce poste.",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework Core", "SQL Server", "Azure", "xUnit", "Azure DevOps"],
  },
  "php-developer": {
    name: "Développeur PHP",
    nameInTitle: "développeur PHP",
    recruiters:
      "Les recruteurs vérifient votre version de PHP et votre framework : Laravel ou Symfony avec PHP 8 est la norme attendue. Ils regardent la propreté de l'architecture, les tests et l'expérience des files d'attente et du cache. Les projets e-commerce et CMS sont fréquents, donc des résultats comme des pages plus rapides ou plus de commandes comptent.",
    summaries: {
      junior:
        "Développeur PHP avec 1 an d'expérience en Laravel 10 et MySQL. J'ai créé le back-office d'une boutique en ligne avec import de produits et statuts de commande, utilisé chaque jour par 12 personnes. J'écris des tests fonctionnels avec PHPUnit.",
      middle:
        "Développeur PHP avec 4 ans d'expérience en Laravel, Symfony, MySQL et Redis. J'ai optimisé le tunnel de commande d'une boutique de 50 000 commandes par mois, réduit le chargement de 3 s à 0,8 s et augmenté la conversion de 12 %. J'ai déplacé les traitements lourds dans des files d'attente et mis en place Docker pour le développement local.",
      senior:
        "Ingénieur PHP senior avec 10 ans d'expérience en e-commerce à fort trafic. J'ai piloté la réécriture d'un monolithe PHP 5 en application Symfony 6 modulaire, avec 85 % de couverture de tests et sans interruption de service. J'accompagne 6 développeurs et j'anime les revues de code et les sessions d'architecture.",
    },
    tip: "Indiquez PHP 8 et la version du framework sur vos projets récents. Les recruteurs écartent souvent les CV qui semblent bloqués sur un vieux PHP, même si vos compétences sont à jour.",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "API REST"],
  },
  "flutter-developer": {
    name: "Développeur Flutter",
    nameInTitle: "développeur Flutter",
    recruiters:
      "Les recruteurs cherchent d'abord des applications publiées avec liens vers les stores, puis votre approche de la gestion d'état (Bloc, Riverpod, Provider). Ils vérifient que vous connaissez assez le natif pour les platform channels, les notifications push et les publications sur les stores. Notes, téléchargements et taux de sessions sans crash sont des preuves solides.",
    summaries: {
      junior:
        "Développeur Flutter avec 1 an d'expérience en Dart, Bloc et Firebase. J'ai publié une application de suivi d'habitudes sur Google Play et l'App Store, avec plus de 5 000 téléchargements et une note de 4,6. J'écris des tests de widgets et je suis la Clean Architecture.",
      middle:
        "Développeur Flutter avec 4 ans d'expérience en applications multiplateformes avec Riverpod, Dio et Firebase. J'ai livré une application fintech iOS et Android depuis une seule base de code, qui compte 200 000 utilisateurs et 99,7 % de sessions sans crash. J'ai mis en place une CI/CD avec Codemagic pour des publications hebdomadaires.",
      senior:
        "Ingénieur Flutter senior avec 7 ans d'expérience mobile, dont 2 ans en natif Kotlin. J'ai piloté la fusion de deux applications natives en une seule base Flutter et réduit de 40 % le délai de livraison des fonctionnalités avec une équipe de 6. Je porte l'architecture, le processus de publication et le profilage des performances.",
    },
    tip: "Placez les liens App Store et Google Play dans l'en-tête de votre CV ou à côté de chaque projet. Pour un poste Flutter, une application publiée avec de vrais utilisateurs est votre meilleur argument.",
    skills: ["Flutter", "Dart", "Bloc", "Riverpod", "Firebase", "API REST", "Codemagic", "Git"],
  },
  "ios-developer": {
    name: "Développeur iOS",
    nameInTitle: "développeur iOS",
    recruiters:
      "Les recruteurs regardent Swift, SwiftUI ou UIKit et les applications en ligne sur l'App Store. Ils vérifient l'architecture (MVVM, TCA, VIPER), la concurrence avec async/await et l'expérience de la validation App Store et des publications. Le taux de sessions sans crash, les notes et les chiffres de performance rendent un CV iOS convaincant.",
    summaries: {
      junior:
        "Développeur iOS avec 1 an d'expérience en Swift et SwiftUI. J'ai créé une application de recettes avec mode hors ligne sur Core Data, disponible sur l'App Store avec une note de 4,7. J'écris des tests unitaires avec XCTest et je suis les Human Interface Guidelines d'Apple.",
      middle:
        "Développeur iOS avec 4 ans d'expérience en Swift, UIKit, SwiftUI et Combine. J'ai refait le tunnel d'achat d'une application de shopping de 300 000 utilisateurs et augmenté la conversion de 9 %, avec plus de 99,8 % de sessions sans crash. J'ai migré le réseau vers async/await et modularisé l'application en Swift packages.",
      senior:
        "Ingénieur iOS senior avec 9 ans d'expérience sur des applications grand public et bancaires. J'ai porté l'architecture d'une application de 2 millions d'utilisateurs mensuels et réduit le démarrage à froid de 2,8 s à 1,1 s. J'accompagne 4 développeurs iOS et je pilote le processus de publication en cycles de 2 semaines.",
    },
    tip: "Ajoutez les liens App Store et un indicateur de stabilité (taux sans crash ou note). Les équipes iOS aiment aussi savoir quelles versions d'iOS vous avez supportées et comment vous avez adopté SwiftUI.",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "async/await", "Xcode"],
  },
  "android-developer": {
    name: "Développeur Android",
    nameInTitle: "développeur Android",
    recruiters:
      "Les recruteurs vérifient Kotlin, Jetpack Compose et l'architecture Android moderne (MVVM, Clean Architecture, Hilt). Ils cherchent des applications sur Google Play et la façon dont vous avez géré la fragmentation des appareils et la performance. Le taux d'ANR, les sessions sans crash et la taille de l'application sont des chiffres qui marquent.",
    summaries: {
      junior:
        "Développeur Android avec 1 an d'expérience en Kotlin, Jetpack Compose et Room. J'ai créé une application de suivi sportif avec synchronisation hors ligne, qui compte plus de 10 000 installations sur Google Play. J'écris des tests unitaires et j'utilise Hilt pour l'injection de dépendances.",
      middle:
        "Développeur Android avec 4 ans d'expérience en Kotlin, Compose, Coroutines et Retrofit. J'ai migré 40 écrans d'une application de livraison de XML vers Compose et réduit le taux d'ANR de 60 %. L'application sert 500 000 utilisateurs par mois avec 99,6 % de sessions sans crash.",
      senior:
        "Ingénieur Android senior avec 9 ans d'expérience, y compris la transition de Java vers Kotlin. J'ai piloté la modularisation d'une application bancaire en 30 modules, divisé le temps de build par deux et permis à 4 équipes de livrer en parallèle. Je porte l'architecture Android et j'accompagne 5 développeurs.",
    },
    tip: "Montrez au moins un projet en Compose et un indicateur de stabilité (taux d'ANR ou sessions sans crash). Dans beaucoup d'offres Android, Compose est désormais obligatoire et non plus un bonus.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "Testeur QA",
    nameInTitle: "testeur QA",
    recruiters:
      "Les recruteurs regardent les types de tests que vous pratiquez (fonctionnels, de non-régression, API, mobile) et vos outils : Jira, TestRail, Postman, DevTools. Ils vérifient que vous rédigez une documentation de test claire et que vous trouvez les bugs importants avant la mise en production. L'expérience de plusieurs plateformes, web et mobile, est un atout ; la certification ISTQB est appréciée.",
    summaries: {
      junior:
        "Testeur QA avec 1 an d'expérience sur des applications web et mobiles. J'ai rédigé plus de 300 cas de test dans TestRail pour une application de livraison de repas et trouvé 2 bugs critiques de paiement avant la mise en production. J'utilise Postman pour les vérifications d'API et Chrome DevTools pour localiser les anomalies.",
      middle:
        "Ingénieur QA avec 4 ans d'expérience en tests manuels et tests d'API sur des produits SaaS. J'ai construit la campagne de non-régression et la checklist de release qui ont réduit les bugs en production de 45 % en deux trimestres. Je teste les API REST dans Postman, je vérifie les données en SQL et je travaille au plus près des développeurs en sprint.",
      senior:
        "Ingénieur QA senior avec 8 ans d'expérience dans la fintech et l'e-commerce. J'ai mis en place le processus qualité d'une équipe de 20 développeurs (stratégie de test, tests basés sur les risques, critères de release) et réduit les incidents critiques de 6 à 1 par trimestre. J'encadre 4 testeurs et je les forme aux bases de l'automatisation.",
    },
    tip: "Plutôt que de lister vos tâches, décrivez l'effet de vos tests : bugs trouvés avant la release, moins d'incidents en production, non-régression plus rapide. Donnez un exemple de bug critique que vous avez détecté.",
    skills: ["Tests manuels", "Conception de tests", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "ISTQB"],
  },
  "qa-automation-engineer": {
    name: "Ingénieur QA automatisation",
    nameInTitle: "ingénieur QA automatisation",
    recruiters:
      "Les recruteurs vérifient le langage et le framework avec lesquels vous automatisez (Java avec Selenium, TypeScript avec Playwright, Python avec pytest) et la façon dont vos tests tournent en CI. Ils regardent la taille et la stabilité de votre suite de tests et le temps qu'elle fait gagner à l'équipe. L'expérience des tests d'API et de performance renforce votre profil.",
    summaries: {
      junior:
        "Ingénieur QA automatisation avec 1 an d'expérience en Playwright et TypeScript. J'ai automatisé 150 tests de non-régression pour une boutique en ligne et les ai intégrés à GitHub Actions, faisant passer la non-régression manuelle de 2 jours à 3 heures. Je teste aussi les API avec Postman et Newman.",
      middle:
        "Ingénieur QA automatisation avec 4 ans d'expérience en Java, Selenium, RestAssured et TestNG. J'ai créé un framework de tests de zéro : 1 200 tests UI et API tournent dans Jenkins à chaque merge, avec moins de 2 % de tests instables. La non-régression avant release prend désormais une nuit au lieu d'une semaine.",
      senior:
        "Ingénieur QA automatisation senior avec 8 ans d'expérience en infrastructure de test. J'ai conçu une plateforme de tests parallèles sur Playwright et Kubernetes qui exécute 4 000 tests en 15 minutes, et introduit les tests de contrat entre 12 services. Je dirige une équipe de 5 personnes et je définis la stratégie qualité avec le management technique.",
    },
    tip: "Chiffrez votre framework : nombre de tests, durée d'exécution, taux d'instabilité et ce qu'il a remplacé. Si votre code professionnel est privé, ajoutez un dépôt public avec un petit framework d'exemple.",
    skills: ["Playwright", "Selenium", "TypeScript", "Java", "RestAssured", "pytest", "CI/CD", "Allure"],
  },
  "devops-engineer": {
    name: "Ingénieur DevOps",
    nameInTitle: "ingénieur DevOps",
    recruiters:
      "Les recruteurs vérifient d'abord votre cloud (AWS, GCP, Azure), Kubernetes, Terraform et vos outils de CI/CD. Ils regardent la taille de l'infrastructure gérée et la façon dont vous avez amélioré la fiabilité, la vitesse ou les coûts. Disponibilité, fréquence de déploiement et économies cloud sont les chiffres qui comptent le plus.",
    summaries: {
      junior:
        "Ingénieur DevOps avec 1 an d'expérience en AWS, Docker et GitHub Actions. J'ai conteneurisé 6 services et mis en place des pipelines CI qui ont réduit le temps de déploiement de 40 à 8 minutes. Je décris l'infrastructure en Terraform et je supervise les services avec Prometheus et Grafana.",
      middle:
        "Ingénieur DevOps avec 4 ans d'expérience sur AWS et Kubernetes pour un produit SaaS de 50 microservices. J'ai migré l'infrastructure vers Terraform et Argo CD, ce qui permet plus de 30 déploiements par jour, et réduit la facture cloud mensuelle de 28 % grâce au rightsizing et aux instances spot. Je participe aux astreintes et aux post-mortems.",
      senior:
        "Ingénieur DevOps/SRE senior avec 10 ans d'expérience dans la construction de plateformes cloud. J'ai conçu une plateforme Kubernetes multi-région sur GCP à 99,99 % de disponibilité et un portail en libre-service utilisé par 120 ingénieurs. Je dirige une équipe plateforme de 5 personnes et je porte les processus d'incidents et de SLO.",
    },
    tip: "Chiffrez l'infrastructure : nombre de services ou de nœuds, déploiements par jour, disponibilité et économies cloud. Une liste d'outils sans échelle ne montre pas ce que vous êtes capable de gérer.",
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Prometheus", "Grafana", "Linux"],
  },
  "data-analyst": {
    name: "Data analyst",
    nameInTitle: "data analyst",
    recruiters:
      "Les recruteurs cherchent un SQL solide, un outil de BI (Power BI, Tableau, Looker) et Python ou Excel pour l'analyse. Surtout, ils veulent voir les décisions que vos analyses ont changées : un indicateur amélioré, de l'argent économisé, une fonctionnalité lancée ou arrêtée. Des tableaux de bord et études de cas dans un portfolio aident beaucoup.",
    summaries: {
      junior:
        "Data analyst avec 1 an d'expérience en SQL, Excel et Power BI. J'ai créé un tableau de bord des ventes pour 15 responsables régionaux qui remplace les rapports manuels hebdomadaires et fait gagner 5 heures par semaine. J'aime transformer des données désordonnées en réponses claires.",
      middle:
        "Data analyst avec 4 ans d'expérience en analyse produit avec SQL, Python et Tableau. Mon analyse de cohortes a montré que les utilisateurs qui sautaient l'onboarding partaient deux fois plus vite ; le nouvel onboarding a réduit le churn à 30 jours de 14 %. Je suis responsable de l'analyse des tests A/B pour 3 équipes produit.",
      senior:
        "Data analyst senior avec 8 ans d'expérience dans l'e-commerce et les marketplaces. J'ai construit le référentiel d'indicateurs et la BI en libre-service sur Looker pour 200 collaborateurs, et mon analyse tarifaire a apporté 1,2 M$ de chiffre d'affaires annuel. J'encadre 3 analystes et j'accompagne la direction dans la planification.",
    },
    tip: "Pour chaque projet, écrivez la question métier, votre méthode et la décision qui en a découlé. Un CV de data analyst est jugé sur l'impact, pas sur le nombre d'outils.",
    skills: ["SQL", "Python", "Power BI", "Tableau", "Excel", "Tests A/B", "Google Analytics", "pandas"],
  },
  "data-scientist": {
    name: "Data scientist",
    nameInTitle: "data scientist",
    recruiters:
      "Les recruteurs vérifient quels modèles vous avez construits et surtout s'ils sont arrivés en production et ont fait bouger un indicateur métier. Ils regardent Python, les bibliothèques de ML, les statistiques et, selon le poste, l'expérience des LLM ou du deep learning. Résultats Kaggle, publications ou contributions open source aident si l'expérience professionnelle est courte.",
    summaries: {
      junior:
        "Data scientist avec 1 an d'expérience en Python, scikit-learn et SQL. J'ai construit un modèle de prédiction du churn pour un client télécom avec un ROC-AUC de 0,82, qui a permis à l'équipe fidélisation de cibler les 10 % de clients les plus à risque. Je suis à l'aise avec le feature engineering et la restitution claire des modèles.",
      middle:
        "Data scientist avec 4 ans d'expérience en modèles de recommandation et de prévision avec Python, PyTorch et Spark. Mon modèle de recommandation a augmenté le taux de clic du fil produit de 18 % en test A/B, et je l'ai déployé avec MLflow et FastAPI. J'ai aussi construit des prévisions de demande qui ont réduit le surstock de 12 %.",
      senior:
        "Data scientist senior avec 9 ans d'expérience en ML pour la fintech et l'e-commerce. J'ai piloté le système de détection de fraude qui bloque 3 M$ de fraude par an avec moins de 0,5 % de faux positifs, et récemment livré un assistant support basé sur un LLM qui traite 40 % des tickets. J'accompagne 4 data scientists et je fixe les standards ML.",
    },
    tip: "Associez toujours un modèle à un résultat métier et à sa méthode de validation (test A/B, backtest). Les recruteurs passent les CV qui ne citent que des scores de précision sans dire ce qui a changé.",
    skills: ["Python", "scikit-learn", "PyTorch", "SQL", "Statistiques", "MLflow", "Spark", "LLM"],
  },
  "data-engineer": {
    name: "Data engineer",
    nameInTitle: "data engineer",
    recruiters:
      "Les recruteurs cherchent des outils de pipeline (Airflow, dbt, Spark, Kafka), un data warehouse cloud (Snowflake, BigQuery, Redshift) et un bon niveau en SQL et Python. Ils vérifient les volumes de données traités et la façon dont vous avez rendu les pipelines fiables et peu coûteux. Les chiffres de qualité des données et de coûts se remarquent.",
    summaries: {
      junior:
        "Data engineer avec 1 an d'expérience en Python, SQL et Airflow. J'ai construit des pipelines ETL qui chargent chaque heure les données de 5 sources marketing dans BigQuery, avec des contrôles de qualité qui détectent tôt les chargements cassés. Je documente chaque modèle dans dbt.",
      middle:
        "Data engineer avec 4 ans d'expérience en pipelines batch et streaming avec Spark, Kafka et Snowflake. J'ai remplacé des jobs ETL nocturnes par des modèles dbt incrémentaux, réduit le traitement de 6 heures à 40 minutes et baissé les coûts du warehouse de 35 %. Nos pipelines traitent 2 To de données par jour.",
      senior:
        "Data engineer senior avec 9 ans d'expérience dans la conception de plateformes de données. J'ai piloté la migration d'un cluster Hadoop sur site vers un lakehouse sur AWS et Databricks pour 300 analystes, avec une fraîcheur des données passée de 24 heures à 15 minutes. Je dirige une équipe de 6 personnes et je porte les standards de gouvernance des données.",
    },
    tip: "Indiquez les volumes (Go ou To par jour, nombre de sources et de tables) et un résultat de fiabilité ou de coûts. Sans échelle, le travail de data engineering est difficile à évaluer.",
    skills: ["Python", "SQL", "Apache Airflow", "dbt", "Spark", "Kafka", "Snowflake", "BigQuery"],
  },
  "product-manager": {
    name: "Product manager",
    nameInTitle: "product manager",
    recruiters:
      "Les recruteurs veulent voir les produits et fonctionnalités dont vous étiez responsable et les indicateurs qu'ils ont fait bouger : activation, rétention, revenus. Ils regardent votre façon de travailler la discovery, les données et les équipes, ainsi que le type de produit (B2B, B2C, marketplace). Des résultats clairs valent mieux qu'une liste de rituels et de processus.",
    summaries: {
      junior:
        "Associate product manager avec 1 an d'expérience sur une application mobile B2C. J'ai mené 12 entretiens utilisateurs et un test A/B sur l'onboarding, qui ont fait passer la rétention à J7 de 22 % à 27 %. Je rédige des spécifications claires et je travaille au quotidien avec le design et les développeurs.",
      middle:
        "Product manager avec 4 ans d'expérience en SaaS B2B. J'étais responsable du module de reporting et j'ai augmenté son usage actif hebdomadaire de 60 %, ce qui a réduit le churn des clients de taille moyenne de 8 %. Je mène la discovery, je priorise avec RICE et je travaille avec 7 développeurs et une designer.",
      senior:
        "Product manager senior avec 9 ans d'expérience dans les marketplaces et la fintech. J'ai mené le lancement d'un nouveau produit de paiement, de l'idée à 5 M$ de revenus annuels en 18 mois. J'encadre 2 product managers, je construis la roadmap avec la direction et je développe une culture produit fondée sur les données.",
    },
    tip: "Formulez chaque réalisation en problème, action et indicateur. Évitez les listes du type gestion du backlog ou animation des sprints : les recruteurs veulent savoir ce qui a changé pour les utilisateurs et l'entreprise.",
    skills: ["Product discovery", "Roadmap", "Tests A/B", "Jira", "Amplitude", "SQL", "Recherche utilisateur", "Figma"],
  },
  "project-manager": {
    name: "Chef de projet IT",
    nameInTitle: "chef de projet IT",
    recruiters:
      "Les recruteurs vérifient la taille des projets (équipe, budget, durée), la méthodologie (Scrum, Kanban, cycle en V) et le type de clients. Ils veulent la preuve que vous livrez dans les délais et le budget et que vous gérez risques et parties prenantes. Les certifications PMP, PRINCE2 ou PSM aident mais ne remplacent pas les résultats.",
    summaries: {
      junior:
        "Chef de projet IT avec 1 an d'expérience sur des projets de développement web pour des clients en prestation. J'ai coordonné une équipe de 6 personnes pour le lancement d'un site e-commerce, livré dans les délais avec un écart budgétaire inférieur à 5 %. Je tiens Jira à jour et j'anime les daily et les démos.",
      middle:
        "Chef de projet avec 5 ans d'expérience sur des projets Scrum et hybrides avec des budgets jusqu'à 800 000 $. J'ai redressé un projet santé en retard, revenu au planning en 2 mois, et conservé le client qui a ensuite prolongé le contrat d'un an. Je gère les risques, les demandes de changement et le reporting auprès de la direction.",
      senior:
        "Delivery manager senior avec 11 ans d'expérience à la tête de portefeuilles de 5 à 8 projets et de plus de 60 personnes. J'ai mis en place un cadre de delivery qui a fait passer les livraisons dans les délais de 60 % à 90 % sur l'ensemble du portefeuille. Je travaille avec des grands comptes en Europe et aux États-Unis et j'accompagne 4 chefs de projet.",
    },
    tip: "Pour chaque projet, indiquez la taille de l'équipe, le budget ou la durée et le résultat (dans les délais, sous le budget, client renouvelé). Les chiffres montrent l'échelle et la fiabilité mieux que les noms de méthodes.",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "Gestion des risques", "Suivi budgétaire", "Gestion des parties prenantes", "MS Project"],
  },
  "ui-ux-designer": {
    name: "Designer UI/UX",
    nameInTitle: "designer UI/UX",
    recruiters:
      "Recruteurs et responsables design ouvrent d'abord votre portfolio, souvent avant de lire le CV. Ils cherchent des études de cas qui montrent la recherche, la démarche et les résultats, pas seulement des écrans finaux. Figma, les design systems et la collaboration avec les développeurs sont attendus ; des indicateurs comme la conversion ou le taux de réussite des tâches vous démarquent.",
    summaries: {
      junior:
        "Designer UI/UX avec 1 an d'expérience en Figma, recherche utilisateur et prototypage. J'ai repensé le parcours de réservation d'une application de fitness, et les tests utilisateurs ont montré une baisse de 35 % du temps de réalisation. Mon portfolio comprend 3 études de cas avec recherche et itérations.",
      middle:
        "Product designer avec 4 ans d'expérience en SaaS B2B et applications mobiles. J'ai refait l'onboarding d'une plateforme d'analytics, ce qui a fait passer l'activation de 30 % à 44 %, et construit un design system Figma de 120 composants utilisé par 2 équipes. Je mène des entretiens et des tests utilisateurs à chaque sprint.",
      senior:
        "Designer UX/UI senior avec 9 ans d'expérience dans la fintech et l'e-commerce. J'ai piloté la refonte d'une application bancaire de 1 million d'utilisateurs, qui a fait passer la note App Store de 3,9 à 4,6 et réduit les appels au support de 20 %. J'encadre 3 designers et je définis le processus design avec la direction produit.",
    },
    tip: "Placez le lien vers votre portfolio tout en haut et montrez dans chaque étude de cas le problème, la démarche et un résultat mesurable. Deux études de cas solides valent mieux que dix jolis écrans.",
    skills: ["Figma", "Recherche utilisateur", "Prototypage", "Design system", "Tests utilisateurs", "Wireframing", "UI design", "Adobe Creative Suite"],
  },
  "business-analyst": {
    name: "Business analyst",
    nameInTitle: "business analyst",
    recruiters:
      "Les recruteurs vérifient comment vous recueillez et documentez les besoins : user stories, BPMN, cas d'utilisation, spécifications. Ils regardent votre expérience sectorielle et votre collaboration avec les métiers et les développeurs. Les exemples où votre analyse a fait gagner du temps ou de l'argent, ou évité des reprises, sont les arguments les plus forts.",
    summaries: {
      junior:
        "Business analyst avec 1 an d'expérience sur un projet CRM pour un assureur. J'ai rédigé plus de 80 user stories avec critères d'acceptation et modélisé 6 processus métier en BPMN, ce qui a réduit d'environ moitié les questions de clarification des développeurs. J'utilise Jira, Confluence et les bases du SQL.",
      middle:
        "Business analyst avec 4 ans d'expérience sur des projets fintech et logistique. J'ai mené l'analyse des besoins d'un système d'octroi de crédit et réduit le temps de traitement manuel de 3 jours à 4 heures. J'anime des ateliers avec les parties prenantes, je rédige les spécifications et je vérifie les données en SQL.",
      senior:
        "Business analyst senior avec 9 ans d'expérience sur des systèmes bancaires et d'entreprise. J'ai piloté l'analyse du remplacement d'un système central couvrant 40 processus et 5 directions, livré sans dérive de périmètre. J'encadre une équipe de 4 analystes et je fixe les standards de recueil des besoins sur l'ensemble des projets.",
    },
    tip: "Montrez vos livrables et leur effet : user stories, diagrammes BPMN, spécifications, et ce qu'ils ont changé (moins de reprises, processus plus rapide). Un extrait anonymisé de votre documentation est un vrai plus.",
    skills: ["Recueil des besoins", "User stories", "BPMN", "UML", "SQL", "Jira", "Confluence", "Gestion des parties prenantes"],
  },
  "it-recruiter": {
    name: "Recruteur IT",
    nameInTitle: "recruteur IT",
    recruiters:
      "Les managers qui recrutent vérifient combien de postes vous avez pourvus, en combien de temps et à quel niveau (de junior à C-level, sur quelles stacks). Ils regardent vos compétences en sourcing sur LinkedIn et GitHub, votre expérience des ATS et votre compréhension des métiers tech. Délai de recrutement, taux d'acceptation des offres et maintien en poste des recrues comptent le plus.",
    summaries: {
      junior:
        "Recruteur IT avec 1 an d'expérience dans le recrutement de développeurs et de testeurs pour une société de services. J'ai pourvu 18 postes avec un délai moyen de 28 jours et constitué un vivier de 400 candidats. Je source sur LinkedIn et je tiens les candidats informés à chaque étape.",
      middle:
        "Recruteur IT avec 4 ans d'expérience en recrutement full cycle pour des éditeurs de logiciels. J'ai pourvu plus de 70 postes techniques, dont des profils Go et DevOps seniors difficiles à trouver, avec un taux d'acceptation des offres de 85 %. J'ai introduit des entretiens structurés qui ont réduit le délai de recrutement de 45 à 30 jours.",
      senior:
        "Recruteur tech senior et talent partner avec 9 ans d'expérience. J'ai fait passer une équipe technique de 40 à 150 personnes en 18 mois, dont 12 recrutements de managers, avec plus de 90 % de maintien en poste la première année. J'encadre 3 recruteurs et je porte la marque employeur et l'analyse des données de recrutement.",
    },
    tip: "Commencez par vos chiffres de recrutement : postes pourvus, délai de recrutement, taux d'acceptation et rôles ou stacks sur lesquels vous êtes spécialisé. Le recrutement se mesure en chiffres, montrez les vôtres.",
    skills: ["Recrutement full cycle", "Sourcing", "LinkedIn Recruiter", "Recherche booléenne", "ATS", "Préqualification technique", "Marque employeur", "Négociation"],
  },
};

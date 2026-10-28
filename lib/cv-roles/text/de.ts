import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const de: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "Software Engineer",
    nameInTitle: "Software Engineer",
    recruiters:
      "Recruiter schauen zuerst, welche Systeme Sie gebaut haben und in welcher Größenordnung: Traffic, Datenmenge, Teamgröße. Sie prüfen, ob Ihr Tech-Stack zur Stelle passt und ob Ihre Stationen echte Verantwortung zeigen statt einer Liste von Tickets. Konkrete Kennzahlen wie Latenz, Verfügbarkeit oder Kosten bringen Sie am schnellsten auf die Shortlist.",
    summaries: {
      junior:
        "Software Engineer mit 1 Jahr Erfahrung in der Entwicklung interner Tools mit Go und PostgreSQL. Ich habe einen Reporting-Service gebaut, der manuelle Excel-Exporte ersetzt und der Buchhaltung rund 6 Stunden pro Woche spart. Tests schreibe ich standardmäßig, und meine Pull Requests halte ich klein und gut reviewbar.",
      middle:
        "Software Engineer mit 4 Jahren Erfahrung in Backend- und Plattformentwicklung (Go, Kafka, PostgreSQL, Kubernetes). Ich habe eine eventbasierte Auftragsverarbeitung mit 2 Mio. Events pro Tag entworfen und die p95-Verarbeitungszeit von 900 ms auf 180 ms gesenkt. Meine Services verantworte ich vom Design-Dokument bis zur Rufbereitschaft.",
      senior:
        "Senior Software Engineer mit 9 Jahren Erfahrung in verteilten Systemen für SaaS-Produkte mit über 3 Mio. Nutzern. Ich habe die Aufteilung eines Monolithen in 14 Services geleitet, wodurch die Deploy-Zeit von 2 Stunden auf 12 Minuten und die Zahl der Incidents um 40 % sank. Ich betreue 5 Engineers als Mentor und leite Architektur-Reviews in drei Teams.",
    },
    tip: "Ergänzen Sie bei jeder Station eine Zeile mit einer harten Zahl: Requests pro Sekunde, verarbeitete Datensätze, eingesparte Latenz oder Kosten. Ein Lebenslauf ohne Größenordnung wirkt schnell wie der eines Juniors.",
    skills: ["Go", "Python", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "System Design", "AWS"],
  },
  "junior-developer": {
    name: "Junior-Entwickler",
    nameInTitle: "Junior-Entwickler",
    recruiters:
      "Bei wenig Berufserfahrung bewerten Recruiter Sie vor allem über Projekte: Gibt es eine Live-Demo, ein sauberes GitHub-Repository und eine README, die erklärt, was Sie gebaut haben? Außerdem prüfen sie, ob Ihre Skill-Liste ehrlich und auf einen Stack fokussiert ist. Praktika, Werkstudentenjobs, Freelance-Aufträge und Hackathons zählen, also führen Sie sie wie echte Stationen auf.",
    summaries: {
      junior:
        "Junior-Entwickler mit Schwerpunkt JavaScript und React und einem 6-monatigen Praktikum. Ich habe ein Buchungs-Widget gebaut, das 3 Arztpraxen nutzen und das ihre telefonischen Buchungen um etwa ein Drittel reduziert hat. Aus Code-Reviews lerne ich schnell und liefere kleine, getestete Änderungen.",
      middle:
        "Entwickler mit 1,5 Jahren Berufserfahrung in TypeScript, React und Node.js, bereit für den Schritt zum Mid-Level. Ich habe über 40 Features für ein E-Commerce-Admin-Panel umgesetzt und eine Testsuite aufgebaut, die die Abdeckung von 20 % auf 65 % erhöht hat. Aufgaben übernehme ich gern komplett, von der API bis zur Oberfläche.",
      senior:
        "Quereinsteiger mit 6 Jahren Erfahrung in der Logistik und 1 Jahr Vollzeit-Entwicklung mit Python und Django. Bei meinem früheren Arbeitgeber habe ich das Lager-Reporting automatisiert und damit 10 Stunden pro Woche eingespart; heute baue ich REST-APIs mit Tests und CI. Mein Fachwissen hilft mir, vor dem Programmieren die richtigen Fragen zu stellen.",
    },
    tip: "Stellen Sie 2 bis 3 fertige Projekte ganz oben dar, jeweils mit Live-Link, Stack und einem Satz zum gelösten Problem. Eine deployte Anwendung überzeugt mehr als zehn nachgebaute Tutorials.",
    skills: ["JavaScript", "TypeScript", "React", "HTML/CSS", "Git", "Node.js", "SQL", "REST API"],
  },
  "frontend-developer": {
    name: "Frontend-Entwickler",
    nameInTitle: "Frontend-Entwickler",
    recruiters:
      "Recruiter öffnen Ihr Portfolio oder Ihre Live-Links oft, bevor sie den Rest lesen, deshalb müssen die URLs funktionieren. Geprüft werden Ihr Framework (React, Vue oder Angular), TypeScript und Ihr Umgang mit Performance und Barrierefreiheit. Kennzahlen wie Core Web Vitals, Bundle-Größe oder Conversion-Steigerung heben einen Frontend-Lebenslauf deutlich hervor.",
    summaries: {
      junior:
        "Frontend-Entwickler mit 1 Jahr Erfahrung in React und TypeScript. Ich habe den Registrierungsprozess einer SaaS-Landingpage neu gebaut und die Abschlussquote von 41 % auf 53 % gesteigert. Mir sind semantisches HTML, responsive Layouts und saubere Komponenten wichtig.",
      middle:
        "Frontend-Entwickler mit 4 Jahren Erfahrung in React, Next.js und TypeScript. Ich habe eine Marketing-Website auf Server-Side Rendering umgestellt und den LCP von 4,1 s auf 1,6 s verbessert, was den organischen Traffic um 25 % erhöht hat. Außerdem habe ich eine Komponentenbibliothek aufgebaut, die 4 Produktteams nutzen.",
      senior:
        "Senior Frontend Engineer mit 8 Jahren Erfahrung in komplexen Webanwendungen mit React und TypeScript. Ich habe die Migration einer Codebasis mit 300.000 Zeilen auf eine Micro-Frontend-Architektur geleitet und die Build-Zeit um 70 % reduziert. Ich definiere Frontend-Standards, prüfe Architekturentscheidungen und betreue 6 Entwickler.",
    },
    tip: "Setzen Sie neben jedes Projekt einen Live-Link und nennen Sie eine verbesserte Performance- oder UX-Kennzahl (LCP, Bundle-Größe, Conversion). Recruiter klicken Links deutlich häufiger an, als sie Stichpunkte lesen.",
    skills: ["React", "TypeScript", "Next.js", "HTML/CSS", "Tailwind CSS", "Redux", "Jest", "Web Performance"],
  },
  "backend-developer": {
    name: "Backend-Entwickler",
    nameInTitle: "Backend-Entwickler",
    recruiters:
      "Recruiter gleichen zuerst Ihre Hauptsprache und Ihr Framework mit der Stelle ab, danach suchen sie nach Datenbanken, Message Queues und Cloud-Erfahrung. Sie wollen sehen, welche Last Ihre Services getragen haben und wie Sie deren Stabilität gesichert haben. API-Design, Datenmodellierung und Verantwortung im Incident-Fall sind starke Signale.",
    summaries: {
      junior:
        "Backend-Entwickler mit 1 Jahr Erfahrung in Java und Spring Boot. Ich habe REST-Endpunkte für einen Zahlungsabgleich-Service entwickelt und Integrationstests mit Testcontainers geschrieben. Mich interessiert, wie Daten durch das System fließen, nicht nur, dass der Endpunkt funktioniert.",
      middle:
        "Backend-Entwickler mit 5 Jahren Erfahrung in Node.js, PostgreSQL und Redis. Ich habe die Katalog-API für 3.000 Requests pro Sekunde neu konzipiert und die Datenbanklast durch Caching und Query-Optimierung um 60 % gesenkt. Ich schreibe Design-Dokumente, übernehme Rufbereitschaft und mache Services mit Grafana beobachtbar.",
      senior:
        "Senior Backend Engineer mit 10 Jahren Erfahrung in Hochlastsystemen mit Java und Kotlin. Ich habe eine Billing-Plattform mit 40 Mio. $ Monatsvolumen und 99,98 % Verfügbarkeit entworfen und die Umstellung auf Event Sourcing geleitet. Ich führe Design-Reviews durch und habe ein Team von 3 auf 9 Engineers aufgebaut.",
    },
    tip: "Beschreiben Sie mindestens einen Service mit Zahlen: Requests pro Sekunde, Datenvolumen, Verfügbarkeit. Backend-Arbeit ist für Nutzer unsichtbar, Zahlen machen ihr Gewicht sichtbar.",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka", "Docker", "REST API", "Microservices"],
  },
  "full-stack-developer": {
    name: "Full-Stack-Entwickler",
    nameInTitle: "Full-Stack-Entwickler",
    recruiters:
      "Recruiter prüfen, ob Sie auf beiden Seiten wirklich stark sind und nicht nur Frontend-Entwickler, der einmal eine API angefasst hat. Sie suchen nach einem klaren Stack-Paar (zum Beispiel React und Node.js) und nach Features, die Sie von Anfang bis Ende umgesetzt haben. Erfahrung mit Deployment und Datenbanken entscheidet oft zwischen zwei ähnlichen Kandidaten.",
    summaries: {
      junior:
        "Full-Stack-Entwickler mit 1 Jahr Erfahrung in React, Node.js und MongoDB. Für eine lokale Agentur habe ich ein kleines CRM komplett selbst gebaut, vom Datenbankschema bis zum Deployment auf einem VPS. Es verwaltet heute über 500 Leads pro Monat ohne manuelle Tabellen.",
      middle:
        "Full-Stack-Entwickler mit 4 Jahren Erfahrung in TypeScript, Next.js, NestJS und PostgreSQL. Ich habe ein Abo-Billing-Modul vollständig umgesetzt, von der Stripe-Integration bis zum Kunden-Dashboard, und damit 18 % mehr wiederkehrenden Umsatz ermöglicht. Zusätzlich habe ich CI/CD eingerichtet, das die Release-Zeit von einem Tag auf 20 Minuten verkürzt hat.",
      senior:
        "Senior Full-Stack Engineer mit 9 Jahren Erfahrung mit SaaS-Produkten auf React, Node.js und AWS. Als Tech Lead habe ich eine B2B-Plattform vom MVP zu 120 zahlenden Unternehmen gebracht und die Infrastrukturkosten unter 4 % des Umsatzes gehalten. Ich verbinde Produktgeschwindigkeit mit Codequalität und stelle für beide Seiten des Stacks ein.",
    },
    tip: "Zeigen Sie mindestens ein Feature, das Sie komplett verantwortet haben, und nennen Sie alle Ebenen: Datenbank, API, UI und Deployment. Das belegt den Full-Stack-Anspruch besser als eine lange Skill-Liste.",
    skills: ["TypeScript", "React", "Node.js", "Next.js", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Python-Entwickler",
    nameInTitle: "Python-Entwickler",
    recruiters:
      "Python wird in Web, Data und Automatisierung eingesetzt, deshalb prüfen Recruiter zuerst, in welchem Bereich Sie arbeiten: Django, FastAPI, Datenpipelines oder Skripting. Sie achten auf Tests (pytest), Erfahrung mit async und die verwendeten Datenbanken. Konkrete Ergebnisse wie eingesparte Stunden oder schnellere APIs zeigen echte Seniorität.",
    summaries: {
      junior:
        "Python-Entwickler mit 1 Jahr Erfahrung in Django und PostgreSQL. Ich habe den Import von Lieferantenpreislisten automatisiert, was dem Vertrieb 8 Stunden pro Woche spart und Kopierfehler beseitigt hat. Ich schreibe Tests mit pytest und halte mich an PEP 8.",
      middle:
        "Python-Entwickler mit 4 Jahren Erfahrung in API-Entwicklung mit FastAPI, SQLAlchemy und Celery. Ich habe einen langsamen synchronen Service asynchron neu geschrieben und die Antwortzeit bei gleicher Last von 1,2 s auf 150 ms gesenkt. Ich betreue Hintergrundjobs, die täglich 5 Mio. Datensätze verarbeiten.",
      senior:
        "Senior Python Engineer mit 9 Jahren Erfahrung in Backend- und Datenplattformen. Ich habe eine mandantenfähige Django-Plattform für 400 Geschäftskunden entworfen und ihren Umzug auf Kubernetes geleitet, wodurch die Hosting-Kosten um 35 % sanken. Ich betreue Entwickler als Mentor und verantworte die Python-Standards in 3 Teams.",
    },
    tip: "Nennen Sie schon in der Überschrift, welches Python Sie schreiben: Web (Django, FastAPI), Data oder Automatisierung. Ein allgemeiner Titel führt zu unpassenden Treffern bei Stellenanzeigen.",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "pytest", "Docker", "Redis"],
  },
  "java-developer": {
    name: "Java-Entwickler",
    nameInTitle: "Java-Entwickler",
    recruiters:
      "Recruiter prüfen Ihre Java-Version und das Spring-Ökosystem sowie Erfahrung mit Microservices und Messaging. Branchen wie Banken, Versicherungen oder Telekommunikation haben Gewicht, nennen Sie die Branche also ausdrücklich. Geschätzt wird auch Performance-Arbeit: JVM-Tuning, Query-Optimierung und Lastzahlen.",
    summaries: {
      junior:
        "Java-Entwickler mit 1 Jahr Erfahrung in Java 17 und Spring Boot. Ich habe REST-Services für ein internes HR-System entwickelt und sie mit JUnit und Mockito zu 80 % abgedeckt. Aktuell lerne ich Kafka und analysiere gern knifflige Nebenläufigkeitsprobleme.",
      middle:
        "Java-Entwickler mit 5 Jahren Erfahrung mit Spring Boot, Hibernate und Kafka im Bankenumfeld. Ich habe einen Service zur Transaktionsüberwachung gebaut, der täglich 1,5 Mio. Zahlungen prüft und Fehlalarme bei Betrugsverdacht um 30 % reduziert hat. Durch JVM-Tuning habe ich zudem den Speicherbedarf um ein Viertel gesenkt.",
      senior:
        "Senior Java Engineer mit 11 Jahren Erfahrung in Fintech und Telekommunikation. Ich habe die Migration eines Kernbanken-Moduls von einem EJB-Altsystem auf Spring-Boot-Microservices ohne Ausfallzeit für 2 Mio. Kunden geleitet. Ich prüfe Architekturen, setze Coding-Standards und betreue ein Team von 8 Personen.",
    },
    tip: "Schreiben Sie zu jeder Station die genaue Java-Version und die Branche (zum Beispiel Java 17, Banking). Recruiter im Enterprise-Umfeld filtern nach beidem, und alte Versionen ohne Updates werfen Fragen auf.",
    skills: ["Java", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "Microservices", "JUnit", "Maven"],
  },
  "javascript-react-developer": {
    name: "React-Entwickler",
    nameInTitle: "React-Entwickler",
    recruiters:
      "Recruiter prüfen, wie tief Ihr React-Wissen geht: Hooks, State Management, TypeScript und moderne Tools wie Next.js oder React Query. Sie öffnen Live-Projekte, um zu sehen, wie sich die Oberfläche anfühlt. Erfahrung mit Tests und Performance-Optimierung unterscheidet solide React-Entwickler von Tutorial-Niveau.",
    summaries: {
      junior:
        "React-Entwickler mit 1 Jahr Erfahrung in React, TypeScript und React Query. Ich habe Bestellhistorie und Filter für ein Shop-Dashboard gebaut, das täglich 200 Manager nutzen. Meine Komponenten teste ich mit React Testing Library.",
      middle:
        "React-Entwickler mit 4 Jahren Erfahrung in React, TypeScript, Redux Toolkit und Next.js. Ich habe ein Dashboard mit über 60 Screens refaktoriert, unnötige Re-Renders beseitigt und die Interaktionsgeschwindigkeit um 45 % verbessert. Außerdem habe ich ein Design System mit Storybook aufgebaut, das 3 Teams nutzen.",
      senior:
        "Senior React Engineer mit 8 Jahren Erfahrung mit großen Single-Page-Apps und Next.js. Ich habe den Wechsel von Klassenkomponenten und Redux zu Hooks und Server Components geleitet, die Bundle-Größe um 40 % verringert und die Einarbeitungszeit neuer Entwickler halbiert. Ich betreue 5 Frontend-Entwickler als Mentor.",
    },
    tip: "Nennen Sie Ihre Entscheidungen zu State Management und Data Fetching (Redux Toolkit, Zustand, React Query) und warum Sie sie getroffen haben. Das zeigt, dass Sie in Architektur denken und nicht nur in Komponenten.",
    skills: ["React", "TypeScript", "JavaScript", "Next.js", "Redux Toolkit", "React Query", "Jest", "Storybook"],
  },
  "nodejs-developer": {
    name: "Node.js-Entwickler",
    nameInTitle: "Node.js-Entwickler",
    recruiters:
      "Recruiter achten auf das Framework (Express, NestJS, Fastify), TypeScript und die Datenbanken, die Sie mit Node.js eingesetzt haben. Sie prüfen Erfahrung mit asynchronen Mustern, Queues und Echtzeit-Funktionen wie WebSockets. Lastzahlen und Antwortzeiten belegen, dass Sie Node.js in Produktion verstehen.",
    summaries: {
      junior:
        "Node.js-Entwickler mit 1 Jahr Erfahrung in Express, TypeScript und MongoDB. Ich habe den Benachrichtigungsdienst einer Liefer-App gebaut, der täglich 20.000 Push-Nachrichten versendet. Ich schreibe Tests mit Jest und dokumentiere APIs in Swagger.",
      middle:
        "Node.js-Entwickler mit 4 Jahren Erfahrung in NestJS, PostgreSQL und RabbitMQ. Ich habe einen Echtzeit-Chat auf WebSocket-Basis für 15.000 gleichzeitige Nutzer gebaut und die Zustellzeit unter 100 ms gehalten. Die Umstellung der Services auf TypeScript Strict Mode hat Laufzeitfehler um 35 % reduziert.",
      senior:
        "Senior Node.js Engineer mit 9 Jahren Erfahrung in APIs und eventgetriebenen Systemen. Ich habe ein Marktplatz-Backend mit NestJS und Kafka für 8.000 Requests pro Sekunde entworfen und die Cloud-Kosten um 30 % gesenkt. Ich leite ein Team von 6 Entwicklern und führe Architektur- und Security-Reviews durch.",
    },
    tip: "Zeigen Sie, dass Sie den Event Loop in der Praxis verstehen: Nennen Sie einen Engpass (blockierender Code, Memory Leak, langsame Query) und wie Sie ihn behoben haben.",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "MongoDB", "RabbitMQ", "WebSockets"],
  },
  "dotnet-developer": {
    name: ".NET-Entwickler",
    nameInTitle: ".NET-Entwickler",
    recruiters:
      "Recruiter prüfen, ob Sie mit modernem .NET (6, 8 oder neuer), ASP.NET Core und Entity Framework arbeiten und nicht nur mit dem alten .NET Framework. Sie achten auf Azure-Erfahrung, SQL-Server-Kenntnisse und Ihre Branche. Migrationen von Legacy-Code sind ein starkes Plus.",
    summaries: {
      junior:
        "Junior .NET-Entwickler mit 1 Jahr Erfahrung in C#, ASP.NET Core und SQL Server. Ich habe eine interne API für Lagerbestände entwickelt und xUnit-Tests für ihre Geschäftsregeln geschrieben. Derzeit arbeite ich mich in Azure Service Bus ein.",
      middle:
        ".NET-Entwickler mit 5 Jahren Erfahrung in C#, ASP.NET Core, Entity Framework Core und Azure. Ich habe ein Schadenmanagement-System einer Versicherung von .NET Framework 4.7 auf .NET 8 migriert und die Antwortzeit halbiert. Mit Azure DevOps habe ich CI/CD aufgesetzt, sodass wöchentliche Releases zur Routine wurden.",
      senior:
        "Senior .NET Engineer mit 11 Jahren Erfahrung in Enterprise- und Gesundheitssystemen. Ich habe eine klinische Datenplattform auf .NET und Azure konzipiert, die unter strengen Compliance-Vorgaben täglich 3 Mio. Datensätze verarbeitet. Ich leite ein Team von 7 Entwicklern und verantworte Architektur und Codequalität.",
    },
    tip: "Geben Sie bei jedem Projekt die .NET-Version an. Eine Migration von .NET Framework auf modernes .NET gehört zu den am meisten geschätzten Erfolgen in dieser Rolle.",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework Core", "SQL Server", "Azure", "xUnit", "Azure DevOps"],
  },
  "php-developer": {
    name: "PHP-Entwickler",
    nameInTitle: "PHP-Entwickler",
    recruiters:
      "Recruiter prüfen PHP-Version und Framework: Laravel oder Symfony mit PHP 8 ist heute die Erwartung. Sie achten auf saubere Architektur, Tests und Erfahrung mit Queues und Caching. E-Commerce- und CMS-Projekte sind häufig, daher zählen Ergebnisse wie schnellere Seiten oder mehr Bestellungen.",
    summaries: {
      junior:
        "PHP-Entwickler mit 1 Jahr Erfahrung in Laravel 10 und MySQL. Ich habe ein Admin-Panel für einen Onlineshop mit Produktimport und Bestellstatus gebaut, das täglich 12 Mitarbeitende nutzen. Feature-Tests schreibe ich mit PHPUnit.",
      middle:
        "PHP-Entwickler mit 4 Jahren Erfahrung in Laravel, Symfony, MySQL und Redis. Ich habe den Checkout eines Shops mit 50.000 Bestellungen pro Monat optimiert, die Ladezeit von 3 s auf 0,8 s gesenkt und die Conversion um 12 % gesteigert. Aufwendige Aufgaben habe ich in Queues verlagert und Docker für die lokale Entwicklung eingerichtet.",
      senior:
        "Senior PHP Engineer mit 10 Jahren Erfahrung im E-Commerce mit hohem Traffic. Ich habe die Neuentwicklung eines PHP-5-Monolithen zu einer modularen Symfony-6-Anwendung mit 85 % Testabdeckung und ohne Ausfallzeit geleitet. Ich betreue 6 Entwickler und leite Code-Reviews und Architektur-Sessions.",
    },
    tip: "Schreiben Sie PHP 8 und die Framework-Version zu aktuellen Projekten. Recruiter sortieren Lebensläufe, die nach veraltetem PHP aussehen, oft aus, auch wenn Ihre Kenntnisse aktuell sind.",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "REST API"],
  },
  "flutter-developer": {
    name: "Flutter-Entwickler",
    nameInTitle: "Flutter-Entwickler",
    recruiters:
      "Recruiter suchen zuerst nach veröffentlichten Apps mit Store-Links, danach nach Ihrem Ansatz für State Management (Bloc, Riverpod, Provider). Sie prüfen, ob Sie die native Seite gut genug kennen für Platform Channels, Push-Benachrichtigungen und Store-Releases. App-Bewertungen, Downloads und Crash-free-Rate sind starke Belege.",
    summaries: {
      junior:
        "Flutter-Entwickler mit 1 Jahr Erfahrung in Dart, Bloc und Firebase. Ich habe eine Habit-Tracker-App entwickelt, die bei Google Play und im App Store über 5.000 Downloads und eine Bewertung von 4,6 hat. Ich schreibe Widget-Tests und arbeite nach Clean Architecture.",
      middle:
        "Flutter-Entwickler mit 4 Jahren Erfahrung in plattformübergreifenden Apps mit Riverpod, Dio und Firebase. Ich habe eine Fintech-App für iOS und Android aus einer Codebasis veröffentlicht, die 200.000 Nutzer erreicht und 99,7 % absturzfreie Sessions hat. Für wöchentliche Releases habe ich CI/CD mit Codemagic eingerichtet.",
      senior:
        "Senior Flutter Engineer mit 7 Jahren Mobile-Erfahrung, davon 2 Jahre nativ mit Kotlin. Ich habe die Zusammenführung zweier nativer Apps in eine Flutter-Codebasis geleitet und die Feature-Lieferzeit mit einem Team von 6 Personen um 40 % verkürzt. Ich verantworte App-Architektur, Release-Prozesse und Performance-Profiling.",
    },
    tip: "Setzen Sie die Links zum App Store und zu Google Play in den Kopf Ihres Lebenslaufs oder direkt zu jedem Projekt. Für Flutter-Stellen ist eine veröffentlichte App mit echten Nutzern Ihr stärkstes Argument.",
    skills: ["Flutter", "Dart", "Bloc", "Riverpod", "Firebase", "REST API", "Codemagic", "Git"],
  },
  "ios-developer": {
    name: "iOS-Entwickler",
    nameInTitle: "iOS-Entwickler",
    recruiters:
      "Recruiter achten auf Swift, SwiftUI oder UIKit und auf Apps, die im App Store live sind. Sie prüfen Architektur (MVVM, TCA, VIPER), Nebenläufigkeit mit async/await und Erfahrung mit App-Review und Releases. Crash-free-Rate, Bewertungen und Performance-Zahlen machen einen iOS-Lebenslauf überzeugend.",
    summaries: {
      junior:
        "iOS-Entwickler mit 1 Jahr Erfahrung in Swift und SwiftUI. Ich habe eine Rezept-App mit Offline-Modus auf Basis von Core Data entwickelt, die im App Store mit 4,7 bewertet ist. Ich schreibe Unit-Tests mit XCTest und orientiere mich an den Human Interface Guidelines von Apple.",
      middle:
        "iOS-Entwickler mit 4 Jahren Erfahrung in Swift, UIKit, SwiftUI und Combine. Ich habe den Checkout einer Shopping-App mit 300.000 Nutzern neu gebaut und die Conversion um 9 % gesteigert, bei über 99,8 % absturzfreien Sessions. Das Networking habe ich auf async/await umgestellt und die App in Swift Packages modularisiert.",
      senior:
        "Senior iOS Engineer mit 9 Jahren Erfahrung in Consumer- und Banking-Apps. Ich habe die Architektur einer App mit 2 Mio. monatlichen Nutzern geleitet und die Kaltstartzeit von 2,8 s auf 1,1 s gesenkt. Ich betreue 4 iOS-Entwickler und verantworte den Release-Prozess im 2-Wochen-Rhythmus.",
    },
    tip: "Fügen Sie App-Store-Links und eine Stabilitätskennzahl (Crash-free-Rate oder Bewertung) hinzu. iOS-Teams interessiert außerdem, welche iOS-Versionen Sie unterstützt haben und wie Sie SwiftUI eingeführt haben.",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "async/await", "Xcode"],
  },
  "android-developer": {
    name: "Android-Entwickler",
    nameInTitle: "Android-Entwickler",
    recruiters:
      "Recruiter prüfen Kotlin, Jetpack Compose und moderne Android-Architektur (MVVM, Clean Architecture, Hilt). Sie suchen nach Apps bei Google Play und danach, wie Sie mit Gerätevielfalt und Performance umgegangen sind. ANR-Rate, absturzfreie Sessions und App-Größe sind Zahlen, die auffallen.",
    summaries: {
      junior:
        "Android-Entwickler mit 1 Jahr Erfahrung in Kotlin, Jetpack Compose und Room. Ich habe eine Fitness-Tracking-App mit Offline-Synchronisierung entwickelt, die bei Google Play über 10.000 Installationen hat. Ich schreibe Unit-Tests und nutze Hilt für Dependency Injection.",
      middle:
        "Android-Entwickler mit 4 Jahren Erfahrung in Kotlin, Compose, Coroutines und Retrofit. Ich habe 40 Screens einer Liefer-App von XML auf Compose migriert und die ANR-Rate um 60 % gesenkt. Die App hat 500.000 monatliche Nutzer und 99,6 % absturzfreie Sessions.",
      senior:
        "Senior Android Engineer mit 9 Jahren Erfahrung, einschließlich des Umstiegs von Java auf Kotlin. Ich habe die Modularisierung einer Banking-App in 30 Feature-Module geleitet, die Build-Zeit halbiert und 4 Teams paralleles Arbeiten ermöglicht. Ich verantworte die Android-Architektur und betreue 5 Entwickler.",
    },
    tip: "Zeigen Sie mindestens ein Compose-Projekt und eine Stabilitätskennzahl (ANR-Rate oder absturzfreie Sessions). In vielen Android-Stellen ist Compose inzwischen Pflicht und kein Bonus mehr.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "Softwaretester (QA Engineer)",
    nameInTitle: "Softwaretester",
    recruiters:
      "Recruiter achten auf die Testarten, die Sie abdecken (funktional, Regression, API, Mobile), und auf Ihre Tools: Jira, TestRail, Postman, DevTools. Sie prüfen, ob Sie verständliche Testdokumentation schreiben und wichtige Fehler vor dem Release finden. Erfahrung mit mehreren Plattformen, etwa Web und Mobile, ist ein Plus; ein ISTQB-Zertifikat wird in Deutschland gern gesehen.",
    summaries: {
      junior:
        "Softwaretester mit 1 Jahr Erfahrung im Testen von Web- und Mobile-Apps. Ich habe über 300 Testfälle in TestRail für eine Essenslieferungs-App geschrieben und 2 kritische Zahlungsfehler vor dem Release gefunden. Für API-Checks nutze ich Postman, zur Fehlereingrenzung die Chrome DevTools.",
      middle:
        "QA Engineer mit 4 Jahren Erfahrung in manuellem Testen und API-Tests für SaaS-Produkte. Ich habe eine Regressionssuite und eine Release-Checkliste aufgebaut, die Produktionsfehler innerhalb von zwei Quartalen um 45 % reduziert haben. Ich teste REST-APIs mit Postman, prüfe Daten per SQL und arbeite in Sprints eng mit den Entwicklern.",
      senior:
        "Senior QA Engineer mit 8 Jahren Erfahrung in Fintech und E-Commerce. Für ein Team von 20 Entwicklern habe ich den QA-Prozess aufgebaut, inklusive Teststrategie, risikobasiertem Testen und Release-Gates, und kritische Incidents von 6 auf 1 pro Quartal gesenkt. Ich leite 4 QA Engineers und führe sie an die Testautomatisierung heran.",
    },
    tip: "Beschreiben Sie statt Aufgaben die Wirkung Ihrer Tests: vor dem Release gefundene Fehler, weniger Produktions-Incidents, schnellere Regression. Nennen Sie ein Beispiel für einen kritischen Bug, den Sie entdeckt haben.",
    skills: ["Manuelles Testen", "Testdesign", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "ISTQB"],
  },
  "qa-automation-engineer": {
    name: "QA Automation Engineer",
    nameInTitle: "QA Automation Engineer",
    recruiters:
      "Recruiter prüfen die Sprache und das Framework, mit denen Sie automatisieren (Java mit Selenium, TypeScript mit Playwright, Python mit pytest), und wie Ihre Tests in CI laufen. Sie achten auf Größe und Stabilität Ihrer Testsuite und darauf, wie viel Zeit sie dem Team spart. Erfahrung mit API- und Lasttests erhöht Ihr Gewicht.",
    summaries: {
      junior:
        "QA Automation Engineer mit 1 Jahr Erfahrung in Playwright und TypeScript. Ich habe 150 Regressionstests für einen Onlineshop automatisiert und in GitHub Actions eingebunden, wodurch die manuelle Regression von 2 Tagen auf 3 Stunden schrumpfte. APIs teste ich zusätzlich mit Postman und Newman.",
      middle:
        "QA Automation Engineer mit 4 Jahren Erfahrung in Java, Selenium, RestAssured und TestNG. Ich habe ein Testframework von Grund auf gebaut: 1.200 UI- und API-Tests laufen bei jedem Merge in Jenkins, mit einer Flakiness unter 2 %. Die Release-Regression dauert jetzt eine Nacht statt einer Woche.",
      senior:
        "Senior QA Automation Engineer mit 8 Jahren Erfahrung im Aufbau von Testinfrastruktur. Ich habe eine parallele Testplattform auf Playwright und Kubernetes entworfen, die 4.000 Tests in 15 Minuten ausführt, und Contract Testing zwischen 12 Services eingeführt. Ich leite ein Team von 5 Personen und definiere die Qualitätsstrategie mit dem Engineering-Management.",
    },
    tip: "Nennen Sie Zahlen zu Ihrem Framework: Anzahl der Tests, Laufzeit, Flakiness und was es ersetzt hat. Ist Ihr Code beim Arbeitgeber privat, verlinken Sie ein öffentliches Repository mit einem kleinen Beispiel-Framework.",
    skills: ["Playwright", "Selenium", "TypeScript", "Java", "RestAssured", "pytest", "CI/CD", "Allure"],
  },
  "devops-engineer": {
    name: "DevOps Engineer",
    nameInTitle: "DevOps Engineer",
    recruiters:
      "Recruiter prüfen zuerst Ihre Cloud (AWS, GCP, Azure), Kubernetes, Terraform und CI/CD-Tools. Sie achten auf die Größe der betreuten Infrastruktur und darauf, wie Sie Zuverlässigkeit, Geschwindigkeit oder Kosten verbessert haben. Verfügbarkeit, Deploy-Frequenz und eingesparte Cloud-Kosten sind die wichtigsten Zahlen.",
    summaries: {
      junior:
        "DevOps Engineer mit 1 Jahr Erfahrung in AWS, Docker und GitHub Actions. Ich habe 6 Services containerisiert und CI-Pipelines aufgesetzt, die die Deploy-Zeit von 40 auf 8 Minuten verkürzt haben. Infrastruktur beschreibe ich mit Terraform, Monitoring läuft über Prometheus und Grafana.",
      middle:
        "DevOps Engineer mit 4 Jahren Erfahrung im Betrieb von AWS und Kubernetes für ein SaaS-Produkt mit 50 Microservices. Ich habe die Infrastruktur auf Terraform und Argo CD umgestellt, was über 30 Deploys pro Tag ermöglicht, und die monatliche Cloud-Rechnung durch Rightsizing und Spot-Instanzen um 28 % gesenkt. Ich übernehme Rufbereitschaft und Incident-Reviews.",
      senior:
        "Senior DevOps/SRE Engineer mit 10 Jahren Erfahrung im Aufbau von Cloud-Plattformen. Ich habe eine Multi-Region-Kubernetes-Plattform auf GCP mit 99,99 % Verfügbarkeit und ein Self-Service-Portal für 120 Entwickler konzipiert. Ich leite ein Plattform-Team von 5 Personen und verantworte Incident- und SLO-Prozesse.",
    },
    tip: "Beziffern Sie die Infrastruktur: Anzahl der Services oder Nodes, Deploys pro Tag, Verfügbarkeit und eingesparte Cloud-Kosten. Eine Tool-Liste ohne Größenordnung zeigt nicht, was Sie stemmen können.",
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Prometheus", "Grafana", "Linux"],
  },
  "data-analyst": {
    name: "Data Analyst",
    nameInTitle: "Data Analyst",
    recruiters:
      "Recruiter suchen nach starkem SQL, einem BI-Tool (Power BI, Tableau, Looker) und Python oder Excel für Analysen. Vor allem wollen sie Entscheidungen sehen, die Ihre Analyse verändert hat: eine verbesserte Kennzahl, eingespartes Geld, ein gestopptes oder gestartetes Feature. Dashboards und Fallstudien in einem Portfolio helfen sehr.",
    summaries: {
      junior:
        "Data Analyst mit 1 Jahr Erfahrung in SQL, Excel und Power BI. Ich habe ein Vertriebs-Dashboard für 15 Regionalleiter gebaut, das wöchentliche manuelle Reports ersetzt und 5 Stunden pro Woche spart. Ich mag es, aus unordentlichen Daten klare Antworten zu machen.",
      middle:
        "Data Analyst mit 4 Jahren Erfahrung in Produktanalyse mit SQL, Python und Tableau. Meine Kohortenanalyse zeigte, dass Nutzer ohne Onboarding doppelt so schnell abwandern; das überarbeitete Onboarding senkte den 30-Tage-Churn um 14 %. Ich verantworte die Auswertung von A/B-Tests für 3 Produktteams.",
      senior:
        "Senior Data Analyst mit 8 Jahren Erfahrung in E-Commerce und Marktplätzen. Ich habe das Kennzahlen-Framework und Self-Service-BI in Looker für 200 Mitarbeitende aufgebaut, und meine Preisanalyse brachte 1,2 Mio. $ zusätzlichen Jahresumsatz. Ich leite 3 Analysten und unterstütze die Geschäftsführung bei der Planung.",
    },
    tip: "Schreiben Sie zu jedem Projekt die Geschäftsfrage, Ihre Methode und die daraus folgende Entscheidung. Ein Data-Analyst-Lebenslauf wird nach Wirkung bewertet, nicht nach der Zahl der Tools.",
    skills: ["SQL", "Python", "Power BI", "Tableau", "Excel", "A/B-Tests", "Google Analytics", "pandas"],
  },
  "data-scientist": {
    name: "Data Scientist",
    nameInTitle: "Data Scientist",
    recruiters:
      "Recruiter prüfen, welche Modelle Sie gebaut haben, und vor allem, ob sie in Produktion gingen und eine Geschäftskennzahl bewegt haben. Sie achten auf Python, ML-Bibliotheken, Statistik und je nach Stelle Erfahrung mit LLMs oder Deep Learning. Kaggle-Ergebnisse, Publikationen oder Open-Source-Beiträge helfen, wenn die Berufserfahrung kurz ist.",
    summaries: {
      junior:
        "Data Scientist mit 1 Jahr Erfahrung in Python, scikit-learn und SQL. Ich habe für einen Telekommunikationskunden ein Churn-Modell mit 0,82 ROC-AUC gebaut, mit dem das Retention-Team gezielt die 10 % der gefährdetsten Kunden ansprechen konnte. Feature Engineering und verständliches Modell-Reporting gehören zu meinen Stärken.",
      middle:
        "Data Scientist mit 4 Jahren Erfahrung in Empfehlungs- und Prognosemodellen mit Python, PyTorch und Spark. Mein Empfehlungsmodell erhöhte die Klickrate im Produkt-Feed im A/B-Test um 18 %; ausgeliefert habe ich es mit MLflow und FastAPI. Außerdem habe ich Nachfrageprognosen entwickelt, die Überbestände um 12 % reduziert haben.",
      senior:
        "Senior Data Scientist mit 9 Jahren Erfahrung in ML für Fintech und E-Commerce. Ich habe ein Betrugserkennungssystem geleitet, das jährlich 3 Mio. $ Betrug verhindert, bei einer False-Positive-Rate unter 0,5 %, und zuletzt einen LLM-basierten Support-Assistenten eingeführt, der 40 % der Tickets bearbeitet. Ich betreue 4 Data Scientists und setze ML-Standards.",
    },
    tip: "Verknüpfen Sie jedes Modell mit einem Geschäftsergebnis und der Art der Validierung (A/B-Test, Backtest). Lebensläufe, die nur Accuracy-Werte nennen, ohne zu sagen, was sich verändert hat, werden übersprungen.",
    skills: ["Python", "scikit-learn", "PyTorch", "SQL", "Statistik", "MLflow", "Spark", "LLM"],
  },
  "data-engineer": {
    name: "Data Engineer",
    nameInTitle: "Data Engineer",
    recruiters:
      "Recruiter suchen nach Pipeline-Tools (Airflow, dbt, Spark, Kafka), einem Cloud-Data-Warehouse (Snowflake, BigQuery, Redshift) sowie starkem SQL und Python. Sie prüfen die verarbeiteten Datenmengen und wie Sie Pipelines zuverlässig und günstig gemacht haben. Zahlen zu Datenqualität und Kosten fallen besonders auf.",
    summaries: {
      junior:
        "Data Engineer mit 1 Jahr Erfahrung in Python, SQL und Airflow. Ich habe ETL-Pipelines gebaut, die stündlich Daten aus 5 Marketingquellen in BigQuery laden, und Datenqualitätsprüfungen ergänzt, die fehlerhafte Ladevorgänge früh erkennen. Jedes Modell dokumentiere ich in dbt.",
      middle:
        "Data Engineer mit 4 Jahren Erfahrung mit Batch- und Streaming-Pipelines auf Spark, Kafka und Snowflake. Ich habe nächtliche ETL-Jobs auf inkrementelle dbt-Modelle umgestellt, die Laufzeit von 6 Stunden auf 40 Minuten verkürzt und die Warehouse-Kosten um 35 % gesenkt. Unsere Pipelines verarbeiten 2 TB Daten pro Tag.",
      senior:
        "Senior Data Engineer mit 9 Jahren Erfahrung in der Konzeption von Datenplattformen. Ich habe den Umzug von einem On-Premise-Hadoop-Cluster in ein Lakehouse auf AWS und Databricks für 300 Analysten geleitet; die Datenaktualität verbesserte sich von 24 Stunden auf 15 Minuten. Ich leite ein Team von 6 Personen und verantworte die Data-Governance-Standards.",
    },
    tip: "Nennen Sie Datenvolumen (GB oder TB pro Tag, Zahl der Quellen und Tabellen) und ein Ergebnis zu Zuverlässigkeit oder Kosten. Ohne Größenordnung ist Data-Engineering-Arbeit schwer einzuschätzen.",
    skills: ["Python", "SQL", "Apache Airflow", "dbt", "Spark", "Kafka", "Snowflake", "BigQuery"],
  },
  "product-manager": {
    name: "Produktmanager",
    nameInTitle: "Produktmanager",
    recruiters:
      "Recruiter wollen Produkte und Features sehen, die Sie verantwortet haben, und die Kennzahlen, die sich dadurch verändert haben: Aktivierung, Retention, Umsatz. Sie prüfen, wie Sie mit Discovery, Daten und Teams arbeiten und in welchem Produkttyp (B2B, B2C, Marktplatz). Klare Ergebnisse schlagen Aufzählungen von Prozessen und Meetings.",
    summaries: {
      junior:
        "Associate Product Manager mit 1 Jahr Erfahrung in einer B2C-Mobile-App. Ich habe 12 Nutzerinterviews und einen A/B-Test zum Onboarding durchgeführt, wodurch die Retention an Tag 7 von 22 % auf 27 % stieg. Ich schreibe klare Spezifikationen und arbeite eng mit Design und Entwicklung zusammen.",
      middle:
        "Produktmanager mit 4 Jahren Erfahrung im B2B-SaaS-Bereich. Ich habe das Reporting-Modul verantwortet und seine wöchentliche aktive Nutzung um 60 % gesteigert, was den Churn bei mittelgroßen Kunden um 8 % senkte. Ich führe Discovery durch, priorisiere mit RICE und arbeite mit 7 Entwicklern und einer Designerin.",
      senior:
        "Senior Produktmanager mit 9 Jahren Erfahrung in Marktplätzen und Fintech. Ich habe ein neues Zahlungsprodukt von der Idee bis zu 5 Mio. $ Jahresumsatz in 18 Monaten gebracht. Ich führe 2 Produktmanager, gestalte die Roadmap mit der Geschäftsführung und baue eine datengetriebene Produktkultur auf.",
    },
    tip: "Formulieren Sie jeden Erfolg als Problem, Maßnahme und Kennzahl. Vermeiden Sie Aufzählungen wie Backlog gepflegt oder Sprints geleitet; Recruiter wollen wissen, was sich für Nutzer und Unternehmen verändert hat.",
    skills: ["Product Discovery", "Roadmapping", "A/B-Tests", "Jira", "Amplitude", "SQL", "User Research", "Figma"],
  },
  "project-manager": {
    name: "IT-Projektmanager",
    nameInTitle: "IT-Projektmanager",
    recruiters:
      "Recruiter prüfen die Projektgröße (Team, Budget, Laufzeit), die Methodik (Scrum, Kanban, Wasserfall) und die Art der Kunden. Sie wollen Belege, dass Sie termin- und budgetgerecht liefern und Risiken sowie Stakeholder im Griff haben. Zertifikate wie PMP, PRINCE2 oder PSM helfen, ersetzen aber keine Ergebnisse.",
    summaries: {
      junior:
        "IT-Projektmanager mit 1 Jahr Erfahrung in Webentwicklungsprojekten für Outsourcing-Kunden. Ich habe ein Team von 6 Personen beim Launch eines Onlineshops koordiniert und das Projekt termingerecht mit weniger als 5 % Budgetabweichung abgeschlossen. Ich halte Jira sauber und moderiere Daily Stand-ups und Demos.",
      middle:
        "Projektmanager mit 5 Jahren Erfahrung in Scrum- und Hybridprojekten mit Budgets bis 800.000 $. Ich habe ein verzögertes Projekt im Gesundheitswesen innerhalb von 2 Monaten wieder in den Zeitplan gebracht und den Kunden gehalten, der den Vertrag anschließend um ein Jahr verlängerte. Ich steuere Risiken, Change Requests und das Reporting an die Geschäftsführung.",
      senior:
        "Senior Projekt- und Delivery-Manager mit 11 Jahren Erfahrung in der Leitung von Portfolios mit 5 bis 8 Projekten und über 60 Personen. Ich habe ein Delivery-Framework eingeführt, das den Anteil termingerechter Releases im Portfolio von 60 % auf 90 % erhöht hat. Ich arbeite mit Enterprise-Kunden in Europa und den USA und betreue 4 Projektmanager.",
    },
    tip: "Nennen Sie zu jedem Projekt Teamgröße, Budget oder Laufzeit und das Ergebnis (termingerecht, unter Budget, Vertrag verlängert). Zahlen zeigen Größenordnung und Verlässlichkeit besser als Methodennamen.",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "Risikomanagement", "Budgetplanung", "Stakeholder-Management", "MS Project"],
  },
  "ui-ux-designer": {
    name: "UI/UX-Designer",
    nameInTitle: "UI/UX-Designer",
    recruiters:
      "Recruiter und Design-Leads öffnen zuerst Ihr Portfolio, oft noch vor dem Lebenslauf. Sie suchen Fallstudien, die Research, Prozess und Ergebnisse zeigen, nicht nur fertige Screens. Figma, Design Systems und Zusammenarbeit mit Entwicklern werden erwartet; Kennzahlen wie Conversion oder Erfolgsquote bei Aufgaben heben Sie hervor.",
    summaries: {
      junior:
        "UI/UX-Designer mit 1 Jahr Erfahrung in Figma, User Research und Prototyping. Ich habe den Buchungsablauf einer Fitness-App neu gestaltet; Usability-Tests zeigten, dass die Bearbeitungszeit um 35 % sank. Mein Portfolio enthält 3 Fallstudien mit Research und Iterationen.",
      middle:
        "Product Designer mit 4 Jahren Erfahrung in B2B-SaaS und Mobile-Apps. Ich habe das Onboarding einer Analytics-Plattform überarbeitet und die Aktivierung von 30 % auf 44 % gesteigert sowie ein Figma-Design-System mit 120 Komponenten für 2 Teams aufgebaut. In jedem Sprint führe ich Interviews und Usability-Tests durch.",
      senior:
        "Senior UX/UI Designer mit 9 Jahren Erfahrung in Fintech und E-Commerce. Ich habe das Redesign einer Banking-App mit 1 Mio. Nutzern geleitet, wodurch die App-Store-Bewertung von 3,9 auf 4,6 stieg und Supportanrufe um 20 % zurückgingen. Ich führe 3 Designer und gestalte den Designprozess gemeinsam mit der Produktleitung.",
    },
    tip: "Setzen Sie den Portfolio-Link ganz nach oben und zeigen Sie in jeder Fallstudie Problem, Prozess und ein messbares Ergebnis. Zwei starke Fallstudien wirken besser als zehn schöne Screens.",
    skills: ["Figma", "User Research", "Prototyping", "Design Systems", "Usability-Tests", "Wireframing", "UI-Design", "Adobe Creative Suite"],
  },
  "business-analyst": {
    name: "Business Analyst",
    nameInTitle: "Business Analyst",
    recruiters:
      "Recruiter prüfen, wie Sie Anforderungen erheben und dokumentieren: User Stories, BPMN, Use Cases, Spezifikationen. Sie achten auf Branchenerfahrung und Ihre Zusammenarbeit mit Fachbereichen und Entwicklern. Beispiele, in denen Ihre Analyse Zeit oder Geld gespart oder Nacharbeit verhindert hat, sind die stärksten Argumente.",
    summaries: {
      junior:
        "Business Analyst mit 1 Jahr Erfahrung in einem CRM-Projekt für eine Versicherung. Ich habe über 80 User Stories mit Akzeptanzkriterien geschrieben und 6 Geschäftsprozesse in BPMN modelliert, wodurch Rückfragen der Entwickler um etwa die Hälfte zurückgingen. Ich arbeite mit Jira, Confluence und SQL-Grundlagen.",
      middle:
        "Business Analyst mit 4 Jahren Erfahrung in Fintech- und Logistikprojekten. Ich habe die Anforderungsanalyse für ein Kreditvergabesystem geleitet und die manuelle Bearbeitungszeit von 3 Tagen auf 4 Stunden verkürzt. Ich moderiere Workshops mit Stakeholdern, schreibe Spezifikationen und prüfe Daten per SQL.",
      senior:
        "Senior Business Analyst mit 9 Jahren Erfahrung in Banken- und Enterprise-Systemen. Ich habe die Analyse für die Ablösung eines Kernsystems mit 40 Prozessen und 5 Abteilungen geleitet, ohne Überschreitung des Projektumfangs. Ich führe ein Team von 4 Analysten und setze projektübergreifende Standards für Anforderungen.",
    },
    tip: "Zeigen Sie Artefakte und ihre Wirkung: User Stories, BPMN-Diagramme, Spezifikationen und was sie bewirkt haben (weniger Nacharbeit, schnellere Prozesse). Ein anonymisiertes Dokumentationsbeispiel ist ein starkes Extra.",
    skills: ["Anforderungsanalyse", "User Stories", "BPMN", "UML", "SQL", "Jira", "Confluence", "Stakeholder-Management"],
  },
  "it-recruiter": {
    name: "IT-Recruiter",
    nameInTitle: "IT-Recruiter",
    recruiters:
      "Hiring Manager prüfen, wie viele Positionen Sie besetzt haben, wie schnell und auf welchem Level (Junior bis C-Level, bestimmte Stacks). Sie achten auf Active-Sourcing-Kompetenz über LinkedIn, XING und GitHub, ATS-Erfahrung und Verständnis für Tech-Rollen. Kennzahlen wie Time-to-Hire, Offer-Acceptance-Rate und Verbleib der Eingestellten zählen am meisten.",
    summaries: {
      junior:
        "IT-Recruiter mit 1 Jahr Erfahrung in der Besetzung von Entwickler- und QA-Stellen für ein Outsourcing-Unternehmen. Ich habe 18 Positionen mit einer durchschnittlichen Time-to-Hire von 28 Tagen besetzt und einen Talentpool von 400 Kandidaten aufgebaut. Ich source über LinkedIn und halte Kandidaten bei jedem Schritt auf dem Laufenden.",
      middle:
        "IT-Recruiter mit 4 Jahren Erfahrung im Full-Cycle-Recruiting für Produktunternehmen. Ich habe über 70 technische Stellen besetzt, darunter schwer zu findende Senior-Go- und DevOps-Profile, mit einer Offer-Acceptance-Rate von 85 %. Durch strukturierte Interviews habe ich die Time-to-Hire von 45 auf 30 Tage gesenkt.",
      senior:
        "Senior Tech Recruiter und Talent Partner mit 9 Jahren Erfahrung. Ich habe ein Engineering-Team in 18 Monaten von 40 auf 150 Personen vergrößert, darunter 12 Führungskräfte, bei einer Verbleibquote im ersten Jahr von über 90 %. Ich leite 3 Recruiter und verantworte Employer Branding und Recruiting-Analytics.",
    },
    tip: "Beginnen Sie mit Ihren Recruiting-Zahlen: besetzte Stellen, Time-to-Hire, Offer-Acceptance und die Rollen oder Stacks, auf die Sie spezialisiert sind. Recruiting wird an Zahlen gemessen, also zeigen Sie Ihre.",
    skills: ["Full-Cycle-Recruiting", "Active Sourcing", "LinkedIn Recruiter", "Boolesche Suche", "ATS", "Technisches Screening", "Employer Branding", "Verhandlungsführung"],
  },
};

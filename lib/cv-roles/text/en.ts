import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const en: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "Software Engineer",
    nameInTitle: "Software Engineer",
    recruiters:
      "Recruiters look for the systems you built and how big they were: traffic, data volume, team size. They check whether your stack matches the job and whether each role shows ownership, not just a list of tickets. Clear impact numbers (latency, uptime, cost) move you to the shortlist fastest.",
    summaries: {
      junior:
        "Software engineer with 1 year of experience building internal tools in Go and PostgreSQL. I wrote a reporting service that replaced manual Excel exports and saved the finance team about 6 hours a week. I write tests by default and keep my pull requests small and easy to review.",
      middle:
        "Software engineer with 4 years in backend and platform work (Go, Kafka, PostgreSQL, Kubernetes). I designed an event-driven order pipeline handling 2M events per day and cut p95 processing time from 900 ms to 180 ms. I own services end to end, from design docs to on-call.",
      senior:
        "Senior software engineer with 9 years of experience designing distributed systems for SaaS products with 3M+ users. I led the split of a monolith into 14 services, which reduced deploy time from 2 hours to 12 minutes and incidents by 40%. I mentor 5 engineers and drive architecture reviews across three teams.",
    },
    tip: "For every job, add one line with a hard number: requests per second, records processed, latency saved or money saved. A Software Engineer resume without scale reads like a junior one.",
    skills: ["Go", "Python", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "System Design", "AWS"],
  },
  "junior-developer": {
    name: "Junior Developer",
    nameInTitle: "Junior Developer",
    recruiters:
      "With little commercial experience, recruiters judge you by projects: is there a live demo, a clean GitHub repo and a README that explains what you built. They also check that your skills list is honest and focused on one stack. Internships, freelance gigs and hackathons count, so list them like real jobs.",
    summaries: {
      junior:
        "Junior developer focused on JavaScript and React, with a 6-month internship behind me. I built a booking widget used by 3 small clinics and cut their phone bookings by about a third. I learn fast from code review and ship small, tested changes.",
      middle:
        "Developer with 1.5 years of commercial experience in TypeScript, React and Node.js, ready to grow into a middle role. I delivered 40+ features for an e-commerce admin panel and wrote the test suite that took coverage from 20% to 65%. I am comfortable picking up tasks end to end, from API to UI.",
      senior:
        "Career changer with 6 years in logistics and 1 year of full-time development in Python and Django. I automated warehouse reporting for my previous employer, saving 10 hours a week, and now build REST APIs with tests and CI. My domain background helps me ask the right questions before writing code.",
    },
    tip: "Pin 2-3 finished projects at the top of your resume with a live link, the stack and one sentence about the problem they solve. One deployed app beats ten tutorial clones.",
    skills: ["JavaScript", "TypeScript", "React", "HTML/CSS", "Git", "Node.js", "SQL", "REST API"],
  },
  "frontend-developer": {
    name: "Frontend Developer",
    nameInTitle: "Frontend Developer",
    recruiters:
      "Recruiters open your portfolio or live links before reading the rest, so working URLs matter. They check your framework (React, Vue or Angular), TypeScript and how you deal with performance and accessibility. Metrics like Core Web Vitals, bundle size or conversion growth make a frontend resume stand out.",
    summaries: {
      junior:
        "Frontend developer with 1 year of experience in React and TypeScript. I rebuilt the signup flow of a SaaS landing page and raised completion from 41% to 53%. I care about semantic HTML, responsive layouts and clean components.",
      middle:
        "Frontend developer with 4 years in React, Next.js and TypeScript. I moved a marketing site to server-side rendering and improved LCP from 4.1 s to 1.6 s, which lifted organic traffic by 25%. I built a shared component library used by 4 product teams.",
      senior:
        "Senior frontend engineer with 8 years of experience building complex web apps in React and TypeScript. I led the migration of a 300k-line codebase to a micro-frontend architecture and cut build time by 70%. I set frontend standards, review architecture and mentor 6 developers.",
    },
    tip: "Add a live link next to every project and mention one performance or UX number you improved (LCP, bundle size, conversion). Recruiters click links far more often than they read bullet points.",
    skills: ["React", "TypeScript", "Next.js", "HTML/CSS", "Tailwind CSS", "Redux", "Jest", "Web Performance"],
  },
  "backend-developer": {
    name: "Backend Developer",
    nameInTitle: "Backend Developer",
    recruiters:
      "Recruiters first match your main language and framework to the job, then look for databases, queues and cloud experience. They want to see the load your services handled and how you kept them reliable. API design, data modeling and incident ownership are strong signals for this role.",
    summaries: {
      junior:
        "Backend developer with 1 year of experience in Java and Spring Boot. I built REST endpoints for a payment reconciliation service and wrote integration tests with Testcontainers. I like understanding how data moves through the system, not just making the endpoint work.",
      middle:
        "Backend developer with 5 years in Node.js, PostgreSQL and Redis. I redesigned the catalog API to serve 3,000 requests per second and cut database load by 60% with caching and query tuning. I write design docs, handle on-call and keep services observable with Grafana.",
      senior:
        "Senior backend engineer with 10 years of experience in high-load systems on Java and Kotlin. I architected a billing platform processing $40M a month with 99.98% uptime and led the move to event sourcing. I run design reviews and grew a team from 3 to 9 engineers.",
    },
    tip: "Describe at least one service with its numbers: requests per second, data size, uptime. Backend work is invisible to users, so numbers are the only way to show its weight.",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka", "Docker", "REST API", "Microservices"],
  },
  "full-stack-developer": {
    name: "Full Stack Developer",
    nameInTitle: "Full Stack Developer",
    recruiters:
      "Recruiters check that you are really strong on both sides, not just a frontend developer who once touched an API. They look for a clear pair of stacks (for example React and Node.js) and features you delivered end to end. Deployment and database experience often decide between two similar candidates.",
    summaries: {
      junior:
        "Full stack developer with 1 year of experience in React, Node.js and MongoDB. I built a small CRM for a local agency from scratch, from database schema to deploy on a VPS. It now handles 500+ leads a month without manual spreadsheets.",
      middle:
        "Full stack developer with 4 years in TypeScript, Next.js, NestJS and PostgreSQL. I shipped a subscription billing module end to end, from Stripe integration to the customer dashboard, which brought in 18% more recurring revenue. I also set up CI/CD that cut release time from a day to 20 minutes.",
      senior:
        "Senior full stack engineer with 9 years of experience building SaaS products on React, Node.js and AWS. As tech lead I took a B2B platform from MVP to 120 paying companies and kept infrastructure costs under 4% of revenue. I balance product speed with code quality and hire for both sides of the stack.",
    },
    tip: "Show at least one feature you owned end to end, and name both sides: database, API, UI and deploy. That proves the full stack claim better than a long skills list.",
    skills: ["TypeScript", "React", "Node.js", "Next.js", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Python Developer",
    nameInTitle: "Python Developer",
    recruiters:
      "Python is used in web, data and automation, so recruiters first check which Python you do: Django, FastAPI, data pipelines or scripting. They look for testing (pytest), async experience and the databases you used. Concrete results like automated hours or faster APIs show real seniority.",
    summaries: {
      junior:
        "Python developer with 1 year of experience in Django and PostgreSQL. I automated the import of supplier price lists, which saved the sales team 8 hours a week and removed copy-paste errors. I write pytest tests and follow PEP 8.",
      middle:
        "Python developer with 4 years building APIs with FastAPI, SQLAlchemy and Celery. I rewrote a slow sync service as async and cut response time from 1.2 s to 150 ms under the same load. I maintain background jobs processing 5M records a day.",
      senior:
        "Senior Python engineer with 9 years of experience in backend and data platforms. I designed a multi-tenant Django platform serving 400 business clients and led its move to Kubernetes, cutting hosting costs by 35%. I mentor developers and own the Python standards across 3 teams.",
    },
    tip: "State which Python you write right in your headline: web (Django, FastAPI), data or automation. A generic Python Developer title gets matched to the wrong vacancies.",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "pytest", "Docker", "Redis"],
  },
  "java-developer": {
    name: "Java Developer",
    nameInTitle: "Java Developer",
    recruiters:
      "Recruiters check the Java version and Spring ecosystem you work with, plus experience with microservices and messaging. Enterprise domains like banking, telecom or insurance carry weight, so name the domain. They also value performance work: JVM tuning, query optimization and load figures.",
    summaries: {
      junior:
        "Java developer with 1 year of experience in Java 17 and Spring Boot. I built REST services for an internal HR system and covered them with JUnit and Mockito tests at 80% coverage. I am learning Kafka and enjoy debugging tricky concurrency issues.",
      middle:
        "Java developer with 5 years in Spring Boot, Hibernate and Kafka in the banking domain. I built a transaction monitoring service that checks 1.5M payments a day and reduced false fraud alerts by 30%. I also tuned JVM settings that cut memory use by a quarter.",
      senior:
        "Senior Java engineer with 11 years of experience in fintech and telecom. I led the migration of a core banking module from a legacy EJB stack to Spring Boot microservices without downtime for 2M customers. I review architecture, set coding standards and mentor a team of 8.",
    },
    tip: "Write the exact Java version and the domain next to each job (for example Java 17, banking). Enterprise recruiters filter by both, and old versions without updates raise questions.",
    skills: ["Java", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "Microservices", "JUnit", "Maven"],
  },
  "javascript-react-developer": {
    name: "React Developer",
    nameInTitle: "React Developer",
    recruiters:
      "Recruiters check your React depth: hooks, state management, TypeScript and modern tools like Next.js or React Query. They open live projects to see how the UI feels. Experience with testing and performance optimization separates a solid React developer from a tutorial-level one.",
    summaries: {
      junior:
        "React developer with 1 year of experience in React, TypeScript and React Query. I built the order history and filters for an online store dashboard used by 200 managers daily. I write components with tests in React Testing Library.",
      middle:
        "React developer with 4 years in React, TypeScript, Redux Toolkit and Next.js. I refactored a dashboard with 60+ screens to reduce re-renders and improved interaction speed by 45%. I built a design system with Storybook that 3 teams now use.",
      senior:
        "Senior React engineer with 8 years of experience in large single-page apps and Next.js. I led the move from class components and Redux to hooks and server components, shrinking the bundle by 40% and onboarding time for new developers by half. I mentor 5 frontend developers.",
    },
    tip: "Mention your state management and data-fetching choices (Redux Toolkit, Zustand, React Query) and why you used them. It shows you think about architecture, not just components.",
    skills: ["React", "TypeScript", "JavaScript", "Next.js", "Redux Toolkit", "React Query", "Jest", "Storybook"],
  },
  "nodejs-developer": {
    name: "Node.js Developer",
    nameInTitle: "Node.js Developer",
    recruiters:
      "Recruiters look for the framework (Express, NestJS, Fastify), TypeScript and the databases you used with Node.js. They check experience with async patterns, queues and real-time features like WebSockets. Load numbers and response times help prove you know how Node.js behaves in production.",
    summaries: {
      junior:
        "Node.js developer with 1 year of experience in Express, TypeScript and MongoDB. I built the notification service for a delivery app that sends 20,000 push messages a day. I write Jest tests and document APIs in Swagger.",
      middle:
        "Node.js developer with 4 years in NestJS, PostgreSQL and RabbitMQ. I built a real-time chat on WebSockets supporting 15,000 concurrent users and kept message delivery under 100 ms. I also moved services to TypeScript strict mode, which cut runtime errors by 35%.",
      senior:
        "Senior Node.js engineer with 9 years of experience building APIs and event-driven systems. I designed a marketplace backend handling 8,000 requests per second on NestJS and Kafka and reduced cloud costs by 30%. I lead a team of 6 and run architecture and security reviews.",
    },
    tip: "Show that you understand the event loop in practice: mention a bottleneck you found (blocking code, memory leak, slow query) and how you fixed it.",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "MongoDB", "RabbitMQ", "WebSockets"],
  },
  "dotnet-developer": {
    name: ".NET Developer",
    nameInTitle: ".NET Developer",
    recruiters:
      "Recruiters check that you work with modern .NET (6, 8 or newer), ASP.NET Core and Entity Framework, not only legacy .NET Framework. They look for Azure experience, SQL Server skills and the domain you worked in. Migrations from legacy code are a strong plus.",
    summaries: {
      junior:
        "Junior .NET developer with 1 year of experience in C#, ASP.NET Core and SQL Server. I built an internal API for warehouse stock and wrote xUnit tests for its business rules. I am currently learning Azure Service Bus.",
      middle:
        ".NET developer with 5 years in C#, ASP.NET Core, Entity Framework Core and Azure. I migrated an insurance claims system from .NET Framework 4.7 to .NET 8 and cut response time by 50%. I set up CI/CD in Azure DevOps that made weekly releases routine.",
      senior:
        "Senior .NET engineer with 11 years of experience in enterprise and healthcare systems. I architected a clinical data platform on .NET and Azure that processes 3M records a day under strict compliance rules. I lead a team of 7 and own architecture decisions and code quality.",
    },
    tip: "Always state the .NET version you used in each project. Showing a migration from .NET Framework to modern .NET is one of the most valued achievements for this role.",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework Core", "SQL Server", "Azure", "xUnit", "Azure DevOps"],
  },
  "php-developer": {
    name: "PHP Developer",
    nameInTitle: "PHP Developer",
    recruiters:
      "Recruiters check your PHP version and framework: Laravel or Symfony with PHP 8 is the standard expectation. They look for clean architecture, testing and experience with queues and caching. E-commerce and CMS projects are common, so results like faster pages or more orders matter.",
    summaries: {
      junior:
        "PHP developer with 1 year of experience in Laravel 10 and MySQL. I built an admin panel for an online shop with product import and order statuses, used daily by 12 managers. I write feature tests with PHPUnit.",
      middle:
        "PHP developer with 4 years in Laravel, Symfony, MySQL and Redis. I optimized checkout in a store with 50,000 monthly orders and cut page load from 3 s to 0.8 s, which raised conversion by 12%. I moved heavy tasks to queues and set up Docker for local development.",
      senior:
        "Senior PHP engineer with 10 years of experience in high-traffic e-commerce. I led the rewrite of a legacy PHP 5 monolith into a modular Symfony 6 app with 85% test coverage and zero downtime. I mentor 6 developers and run code reviews and architecture sessions.",
    },
    tip: "Write PHP 8 and your framework version next to recent projects. Recruiters often filter out resumes that look stuck on old PHP, even if your skills are current.",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "REST API"],
  },
  "flutter-developer": {
    name: "Flutter Developer",
    nameInTitle: "Flutter Developer",
    recruiters:
      "Recruiters first look for published apps with store links, then for your state management approach (Bloc, Riverpod, Provider). They check that you know the native side well enough for platform channels, push notifications and store releases. App ratings, downloads and crash-free rate are strong proof.",
    summaries: {
      junior:
        "Flutter developer with 1 year of experience in Dart, Bloc and Firebase. I built a habit tracker app published on Google Play and the App Store with 5,000+ downloads and a 4.6 rating. I write widget tests and follow clean architecture.",
      middle:
        "Flutter developer with 4 years building cross-platform apps with Riverpod, Dio and Firebase. I shipped a fintech app for iOS and Android from one codebase, reaching 200,000 users and 99.7% crash-free sessions. I set up CI/CD with Codemagic for weekly releases.",
      senior:
        "Senior Flutter engineer with 7 years of mobile experience, including 2 years of native Kotlin. I led the move of two native apps to one Flutter codebase, cutting feature delivery time by 40% with a team of 6. I own app architecture, release processes and performance profiling.",
    },
    tip: "Put App Store and Google Play links in your resume header or next to each project. For Flutter roles, a published app with real users is the strongest argument you can make.",
    skills: ["Flutter", "Dart", "Bloc", "Riverpod", "Firebase", "REST API", "Codemagic", "Git"],
  },
  "ios-developer": {
    name: "iOS Developer",
    nameInTitle: "iOS Developer",
    recruiters:
      "Recruiters look for Swift, SwiftUI or UIKit and apps live on the App Store. They check architecture (MVVM, TCA, VIPER), concurrency with async/await and experience with App Store review and releases. Crash-free rate, ratings and app performance numbers make an iOS resume convincing.",
    summaries: {
      junior:
        "iOS developer with 1 year of experience in Swift and SwiftUI. I built a recipe app with offline mode on Core Data that is live on the App Store with a 4.7 rating. I write unit tests with XCTest and follow Apple Human Interface Guidelines.",
      middle:
        "iOS developer with 4 years in Swift, UIKit, SwiftUI and Combine. I rebuilt the checkout of a shopping app with 300,000 users and raised conversion by 9% while keeping crash-free sessions above 99.8%. I moved networking to async/await and modularized the app into Swift packages.",
      senior:
        "Senior iOS engineer with 9 years of experience in consumer and banking apps. I led the architecture of an app with 2M monthly users and cut cold start time from 2.8 s to 1.1 s. I mentor 4 iOS developers and run the release process with 2-week cycles.",
    },
    tip: "Add App Store links and one stability number (crash-free rate or rating). iOS hiring managers also like to see which iOS versions you supported and how you handled SwiftUI adoption.",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "async/await", "Xcode"],
  },
  "android-developer": {
    name: "Android Developer",
    nameInTitle: "Android Developer",
    recruiters:
      "Recruiters check Kotlin, Jetpack Compose and modern Android architecture (MVVM, Clean Architecture, Hilt). They look for apps on Google Play and how you dealt with fragmentation and performance. ANR rate, crash-free sessions and app size are numbers that stand out.",
    summaries: {
      junior:
        "Android developer with 1 year of experience in Kotlin, Jetpack Compose and Room. I built a fitness tracking app on Google Play with 10,000+ installs and offline sync. I write unit tests and use Hilt for dependency injection.",
      middle:
        "Android developer with 4 years in Kotlin, Compose, Coroutines and Retrofit. I migrated 40 screens of a delivery app from XML to Compose and reduced the ANR rate by 60%. The app serves 500,000 monthly users with 99.6% crash-free sessions.",
      senior:
        "Senior Android engineer with 9 years of experience, including a move from Java to Kotlin. I led the modularization of a banking app into 30 feature modules, cutting build time by half and letting 4 teams ship in parallel. I own the Android architecture and mentor 5 developers.",
    },
    tip: "Show at least one Compose project and one stability metric (ANR rate or crash-free sessions). Many Android vacancies now treat Compose as a must-have, not a bonus.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "QA Engineer",
    nameInTitle: "QA Engineer",
    recruiters:
      "Recruiters look at the types of testing you did (functional, regression, API, mobile) and the tools you use: Jira, TestRail, Postman, DevTools. They check whether you write clear test documentation and catch important bugs before release. Domain and platform experience, like web plus mobile, is a plus.",
    summaries: {
      junior:
        "QA engineer with 1 year of experience testing web and mobile apps. I wrote 300+ test cases in TestRail for a food delivery app and found 2 critical payment bugs before release. I use Postman for API checks and Chrome DevTools to localize issues.",
      middle:
        "QA engineer with 4 years in manual and API testing for SaaS products. I built the regression suite and release checklist that cut production bugs by 45% over two quarters. I test REST APIs in Postman, check data with SQL and work closely with developers in sprints.",
      senior:
        "Senior QA engineer with 8 years of experience in fintech and e-commerce. I set up the QA process for a team of 20 developers, including test strategy, risk-based testing and release gates, and reduced critical incidents from 6 to 1 per quarter. I lead 4 QA engineers and coach them in automation basics.",
    },
    tip: "Instead of listing duties, describe the impact of your testing: bugs found before release, fewer production incidents, faster regression. Give one example of a critical bug you caught.",
    skills: ["Manual Testing", "Test Design", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "Mobile Testing"],
  },
  "qa-automation-engineer": {
    name: "QA Automation Engineer",
    nameInTitle: "QA Automation Engineer",
    recruiters:
      "Recruiters check the language and framework you automate with (Java with Selenium, TypeScript with Playwright, Python with pytest) and how your tests run in CI. They look for the size and stability of your test suite and how much it saved the team. API and performance testing experience adds weight.",
    summaries: {
      junior:
        "QA automation engineer with 1 year of experience in Playwright and TypeScript. I automated 150 regression tests for a web shop and added them to GitHub Actions, cutting manual regression from 2 days to 3 hours. I also test APIs with Postman and Newman.",
      middle:
        "QA automation engineer with 4 years in Java, Selenium, RestAssured and TestNG. I built a test framework from scratch with 1,200 UI and API tests running in Jenkins on every merge, with flakiness under 2%. Release regression went from a week to one night.",
      senior:
        "Senior QA automation engineer with 8 years of experience building test infrastructure. I designed a parallel test platform on Playwright and Kubernetes that runs 4,000 tests in 15 minutes and introduced contract testing between 12 services. I lead a team of 5 and define quality strategy with engineering managers.",
    },
    tip: "Give numbers for your framework: how many tests, how long the run takes, how flaky it is and what it replaced. Link a public repo with a small sample framework if your work code is private.",
    skills: ["Playwright", "Selenium", "TypeScript", "Java", "RestAssured", "pytest", "CI/CD", "Allure"],
  },
  "devops-engineer": {
    name: "DevOps Engineer",
    nameInTitle: "DevOps Engineer",
    recruiters:
      "Recruiters check your cloud (AWS, GCP, Azure), Kubernetes, Terraform and CI/CD tools first. They look for the size of the infrastructure you managed and how you improved reliability, speed or cost. Uptime, deploy frequency and saved cloud spend are the numbers that matter most.",
    summaries: {
      junior:
        "DevOps engineer with 1 year of experience in AWS, Docker and GitHub Actions. I containerized 6 services and set up CI pipelines that cut deploy time from 40 minutes to 8. I write infrastructure in Terraform and monitor services with Prometheus and Grafana.",
      middle:
        "DevOps engineer with 4 years managing AWS and Kubernetes for a SaaS product with 50 microservices. I moved infrastructure to Terraform and Argo CD, enabling 30+ deploys a day, and cut the monthly cloud bill by 28% with rightsizing and spot instances. I also handle on-call and incident reviews.",
      senior:
        "Senior DevOps/SRE engineer with 10 years of experience building cloud platforms. I designed a multi-region Kubernetes platform on GCP with 99.99% availability and a developer self-service portal used by 120 engineers. I lead a platform team of 5 and own the incident and SLO process.",
    },
    tip: "Quantify infrastructure: number of services or nodes, deploys per day, uptime and cloud cost savings. A list of tools without scale does not show what you can handle.",
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Prometheus", "Grafana", "Linux"],
  },
  "data-analyst": {
    name: "Data Analyst",
    nameInTitle: "Data Analyst",
    recruiters:
      "Recruiters look for strong SQL, a BI tool (Power BI, Tableau, Looker) and Python or Excel for analysis. Most of all they want to see decisions your analysis changed: a metric improved, money saved, a feature stopped or launched. Dashboards and case studies in a portfolio help a lot.",
    summaries: {
      junior:
        "Data analyst with 1 year of experience in SQL, Excel and Power BI. I built a sales dashboard for 15 regional managers that replaced weekly manual reports and saved 5 hours a week. I like turning messy data into clear answers.",
      middle:
        "Data analyst with 4 years in product analytics using SQL, Python and Tableau. My cohort analysis showed that users who skipped onboarding churned twice as fast, and the redesigned onboarding cut 30-day churn by 14%. I own A/B test analysis for 3 product teams.",
      senior:
        "Senior data analyst with 8 years of experience in e-commerce and marketplaces. I built the company metric framework and self-service BI in Looker used by 200 employees, and my pricing analysis added $1.2M in yearly revenue. I lead 3 analysts and partner with leadership on planning.",
    },
    tip: "For each project write the business question, your method and the decision it led to. A data analyst resume is judged by impact, not by how many tools you know.",
    skills: ["SQL", "Python", "Power BI", "Tableau", "Excel", "A/B Testing", "Google Analytics", "pandas"],
  },
  "data-scientist": {
    name: "Data Scientist",
    nameInTitle: "Data Scientist",
    recruiters:
      "Recruiters check what models you built and, more importantly, whether they reached production and moved a business metric. They look for Python, ML libraries, statistics and experience with LLMs or deep learning where relevant. Kaggle results, papers or open-source work help when commercial experience is short.",
    summaries: {
      junior:
        "Data scientist with 1 year of experience in Python, scikit-learn and SQL. I built a churn prediction model for a telecom client with 0.82 ROC-AUC, which helped the retention team target the 10% most at-risk customers. I am comfortable with feature engineering and clear model reporting.",
      middle:
        "Data scientist with 4 years in recommendation and forecasting models using Python, PyTorch and Spark. My recommendation model raised click-through in the product feed by 18% in an A/B test, and I deployed it with MLflow and FastAPI. I also built demand forecasts that cut overstock by 12%.",
      senior:
        "Senior data scientist with 9 years of experience in ML for fintech and e-commerce. I led the fraud detection system that blocks $3M in fraud a year with a false positive rate under 0.5%, and recently shipped an LLM-based support assistant handling 40% of tickets. I mentor 4 data scientists and set ML standards.",
    },
    tip: "Always pair a model with a business result and how it was validated (A/B test, backtest). Recruiters skip resumes that list only accuracy numbers without saying what changed.",
    skills: ["Python", "scikit-learn", "PyTorch", "SQL", "Statistics", "MLflow", "Spark", "LLM"],
  },
  "data-engineer": {
    name: "Data Engineer",
    nameInTitle: "Data Engineer",
    recruiters:
      "Recruiters look for pipeline tools (Airflow, dbt, Spark, Kafka), a cloud data warehouse (Snowflake, BigQuery, Redshift) and strong SQL and Python. They check the data volumes you handled and how you made pipelines reliable and cheap. Data quality and cost numbers stand out.",
    summaries: {
      junior:
        "Data engineer with 1 year of experience in Python, SQL and Airflow. I built ETL pipelines that load data from 5 marketing sources into BigQuery every hour and added data quality checks that catch broken loads early. I document every model in dbt.",
      middle:
        "Data engineer with 4 years building batch and streaming pipelines with Spark, Kafka and Snowflake. I moved nightly ETL jobs to incremental dbt models and cut processing time from 6 hours to 40 minutes and warehouse costs by 35%. Our pipelines handle 2 TB of data a day.",
      senior:
        "Senior data engineer with 9 years of experience designing data platforms. I led the move from an on-premise Hadoop cluster to a lakehouse on AWS and Databricks for 300 analysts, with data freshness going from 24 hours to 15 minutes. I lead a team of 6 and own data governance standards.",
    },
    tip: "State data volumes (GB or TB per day, number of sources, number of tables) and one reliability or cost result. Without scale, data engineering work is hard to evaluate.",
    skills: ["Python", "SQL", "Apache Airflow", "dbt", "Spark", "Kafka", "Snowflake", "BigQuery"],
  },
  "product-manager": {
    name: "Product Manager",
    nameInTitle: "Product Manager",
    recruiters:
      "Recruiters want to see products and features you owned and the metrics they moved: activation, retention, revenue. They check how you work with discovery, data and teams, and the product type (B2B, B2C, marketplace). Clear outcomes beat lists of processes and ceremonies.",
    summaries: {
      junior:
        "Associate product manager with 1 year of experience in a B2C mobile app. I ran 12 user interviews and an A/B test on the onboarding flow, which raised day-7 retention from 22% to 27%. I write clear specs and work closely with designers and engineers.",
      middle:
        "Product manager with 4 years in B2B SaaS. I owned the reporting module and grew its weekly active usage by 60%, which cut churn among mid-size customers by 8%. I run discovery, prioritize with RICE and work with a team of 7 engineers and a designer.",
      senior:
        "Senior product manager with 9 years of experience in marketplaces and fintech. I led the launch of a new payments product from idea to $5M in yearly revenue within 18 months. I manage 2 product managers, set the roadmap with leadership and build a data-driven product culture.",
    },
    tip: "Write each achievement as problem, action and metric. Avoid lists like managed the backlog and ran sprints; recruiters want to know what changed for users and the business.",
    skills: ["Product Discovery", "Roadmapping", "A/B Testing", "Jira", "Amplitude", "SQL", "User Research", "Figma"],
  },
  "project-manager": {
    name: "Project Manager",
    nameInTitle: "Project Manager",
    recruiters:
      "Recruiters check project size (team, budget, duration), methodology (Scrum, Kanban, Waterfall) and the client type you worked with. They want proof that you deliver on time and on budget and handle risks and stakeholders. Certifications like PMP or PSM help but do not replace results.",
    summaries: {
      junior:
        "IT project manager with 1 year of experience on web development projects for outsourcing clients. I coordinated a team of 6 on an e-commerce launch and delivered it on schedule with a budget variance under 5%. I keep Jira clean and run daily stand-ups and demos.",
      middle:
        "Project manager with 5 years running Scrum and hybrid projects with budgets up to $800,000. I recovered a delayed healthcare project, brought it back on schedule within 2 months and kept the client, who then extended the contract by a year. I manage risks, change requests and reporting to C-level stakeholders.",
      senior:
        "Senior project/delivery manager with 11 years of experience leading portfolios of 5-8 projects and 60+ people. I introduced a delivery framework that raised on-time releases from 60% to 90% across the portfolio. I work with enterprise clients in the US and Europe and mentor 4 project managers.",
    },
    tip: "For each project give team size, budget or duration and the result (on time, under budget, client renewed). Numbers show scale and reliability better than methodology names.",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "Risk Management", "Budgeting", "Stakeholder Management", "MS Project"],
  },
  "ui-ux-designer": {
    name: "UI/UX Designer",
    nameInTitle: "UI/UX Designer",
    recruiters:
      "Recruiters and design leads open your portfolio first, often before reading the resume. They look for case studies that show research, process and results, not just final screens. Figma skills, design systems and work with developers are expected; metrics like conversion or task success make you stand out.",
    summaries: {
      junior:
        "UI/UX designer with 1 year of experience in Figma, user research and prototyping. I redesigned the booking flow of a fitness app, and usability tests showed task time dropped by 35%. My portfolio includes 3 case studies with research and iterations.",
      middle:
        "Product designer with 4 years in B2B SaaS and mobile apps. I redesigned the onboarding of an analytics platform, which raised activation from 30% to 44%, and built a Figma design system with 120 components used by 2 teams. I run interviews and usability tests every sprint.",
      senior:
        "Senior UX/UI designer with 9 years of experience in fintech and e-commerce. I led the redesign of a banking app with 1M users that raised the App Store rating from 3.9 to 4.6 and cut support calls by 20%. I manage 3 designers and set the design process with product leadership.",
    },
    tip: "Put your portfolio link at the very top and make each case study show the problem, process and a measurable result. Two strong case studies are better than ten pretty screens.",
    skills: ["Figma", "User Research", "Prototyping", "Design Systems", "Usability Testing", "Wireframing", "UI Design", "Adobe Creative Suite"],
  },
  "business-analyst": {
    name: "Business Analyst",
    nameInTitle: "Business Analyst",
    recruiters:
      "Recruiters check how you gather and document requirements: user stories, BPMN, use cases, specifications. They look for domain experience and how you work with stakeholders and developers. Examples where your analysis saved time or money, or reduced rework, are the strongest arguments.",
    summaries: {
      junior:
        "Business analyst with 1 year of experience on an insurance CRM project. I wrote 80+ user stories with acceptance criteria and mapped 6 business processes in BPMN, which cut clarification questions from developers by about half. I use Jira, Confluence and basic SQL.",
      middle:
        "Business analyst with 4 years in fintech and logistics projects. I led requirements for a loan origination system and reduced manual processing time from 3 days to 4 hours. I run workshops with stakeholders, write specifications and check data with SQL.",
      senior:
        "Senior business analyst with 9 years of experience in banking and enterprise systems. I led analysis for a core system replacement covering 40 processes and 5 departments, delivered without scope overruns. I lead a team of 4 analysts and set requirements standards across projects.",
    },
    tip: "Show artifacts and their effect: user stories, BPMN diagrams, specs, and what they changed (less rework, faster process). An anonymized sample of your documentation is a strong extra.",
    skills: ["Requirements Elicitation", "User Stories", "BPMN", "UML", "SQL", "Jira", "Confluence", "Stakeholder Management"],
  },
  "it-recruiter": {
    name: "IT Recruiter",
    nameInTitle: "IT Recruiter",
    recruiters:
      "Hiring managers check how many positions you closed, how fast and at what level (junior to C-level, specific stacks). They look for sourcing skills on LinkedIn and GitHub, ATS experience and an understanding of tech roles. Numbers like time to hire, offer acceptance rate and retention of hires matter most.",
    summaries: {
      junior:
        "IT recruiter with 1 year of experience hiring developers and QA engineers for an outsourcing company. I closed 18 positions with an average time to hire of 28 days and built a talent pool of 400 candidates. I source on LinkedIn and Djinni and keep candidates informed at every step.",
      middle:
        "IT recruiter with 4 years of full-cycle hiring for product companies. I closed 70+ technical roles, including hard-to-fill senior Go and DevOps positions, with an offer acceptance rate of 85%. I introduced structured interviews that cut time to hire from 45 to 30 days.",
      senior:
        "Senior tech recruiter and talent partner with 9 years of experience. I scaled an engineering team from 40 to 150 people in 18 months, including 12 leadership hires, while keeping first-year retention above 90%. I lead 3 recruiters and own employer branding and hiring analytics.",
    },
    tip: "Lead with your hiring numbers: positions closed, time to hire, offer acceptance and the roles or stacks you specialize in. Recruiting is a numbers game, so show yours.",
    skills: ["Full-cycle Recruitment", "Sourcing", "LinkedIn Recruiter", "Boolean Search", "ATS", "Technical Screening", "Employer Branding", "Negotiation"],
  },
};

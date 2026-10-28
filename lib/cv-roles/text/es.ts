import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const es: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "Ingeniero de software",
    nameInTitle: "ingeniero de software",
    recruiters:
      "Los reclutadores buscan primero el stack principal y los años de experiencia comercial con él. Después revisan qué sistemas construyó usted, a qué escala y con qué resultados medibles: latencia, carga, número de usuarios. También valoran señales de buenas prácticas como code review, tests y diseño de sistemas.",
    summaries: {
      junior:
        "Soy ingeniero de software junior con un año de experiencia en Python y Go. Desarrollé un servicio de notificaciones que procesa 50 000 mensajes al día y cubrí con tests el 80 % de su código. Me interesan los sistemas distribuidos y aprendo rápido en code review.",
      middle:
        "Ingeniero de software con 4 años de experiencia en backend con Java y Kotlin. Rediseñé el servicio de pagos de un marketplace y reduje la latencia p95 de 900 a 250 ms. Participo en el diseño de APIs y acompaño a dos desarrolladores junior.",
      senior:
        "Ingeniero de software sénior con 9 años en sistemas de alta carga. Lideré la migración de un monolito a 14 microservicios con Kubernetes, lo que redujo el tiempo de despliegue de 2 horas a 10 minutos. Defino la arquitectura, los estándares de calidad y contrato a ingenieros del equipo.",
    },
    tip: "Para cada proyecto indique el problema, su decisión técnica y la cifra del resultado. «Optimicé consultas SQL y bajé el tiempo de respuesta un 60 %» dice mucho más que «trabajé con bases de datos».",
    skills: ["Java", "Python", "Go", "PostgreSQL", "Docker", "Kubernetes", "System Design", "CI/CD"],
  },
  "junior-developer": {
    name: "Desarrollador junior",
    nameInTitle: "desarrollador junior",
    recruiters:
      "En un perfil junior el reclutador mira primero los proyectos propios y el enlace a GitHub, porque sustituyen la experiencia comercial. Luego revisa el stack, el nivel de inglés y si usted completó prácticas, cursos o un bootcamp con proyecto final.",
    summaries: {
      junior:
        "Desarrollador junior con formación en Ingeniería Informática y 6 meses de prácticas en un equipo web. Construí una app de gestión de tareas con React y Node.js que usan 120 personas. Busco un equipo donde crecer con mentoría y code review.",
      middle:
        "Desarrollador con un año y medio de experiencia comercial en JavaScript y TypeScript. Implementé 30 funcionalidades en un panel de administración y reduje los errores en producción un 25 % gracias a tests unitarios. Estoy listo para asumir tareas de mayor responsabilidad.",
      senior:
        "Desarrollador con 2 años de experiencia que ya trabaja de forma autónoma en frontend y backend. Lideré la integración de una pasarela de pagos de principio a fin y formé a dos becarios del equipo. Mi objetivo es consolidarme como desarrollador middle en un producto con usuarios reales.",
    },
    tip: "Ponga 2 o 3 proyectos con demo en vivo y repositorio limpio, con README que explique qué hace la app y cómo se ejecuta. Un proyecto terminado vale más que diez tutoriales copiados.",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "Git", "SQL", "HTML/CSS", "REST API"],
  },
  "frontend-developer": {
    name: "Desarrollador frontend",
    nameInTitle: "desarrollador frontend",
    recruiters:
      "Los reclutadores comprueban primero el framework (React, Vue o Angular) y TypeScript. Después buscan un portafolio o enlaces a interfaces reales y métricas de rendimiento como Core Web Vitals. También valoran la experiencia con accesibilidad y design systems.",
    summaries: {
      junior:
        "Desarrollador frontend junior con experiencia en React y TypeScript. Maqueté 15 pantallas responsivas a partir de diseños en Figma para una tienda online y conseguí 95 puntos en Lighthouse. Me gusta cuidar los detalles de la interfaz.",
      middle:
        "Desarrollador frontend con 4 años de experiencia en React, Next.js y TypeScript. Reduje el LCP de la página de producto de 4,1 a 1,8 s, lo que aumentó la conversión un 12 %. Mantengo una biblioteca de componentes que usan tres equipos.",
      senior:
        "Desarrollador frontend sénior con 8 años de experiencia. Diseñé la arquitectura micro-frontend de una plataforma SaaS con 200 000 usuarios y creé el design system de la empresa. Defino estándares de calidad, accesibilidad WCAG y rendimiento para 12 desarrolladores.",
    },
    tip: "Incluya enlaces a interfaces en producción o a un portafolio con capturas, y mencione mejoras de rendimiento con cifras de Lighthouse o Core Web Vitals.",
    skills: ["React", "TypeScript", "Next.js", "HTML/CSS", "Redux", "Tailwind CSS", "Jest", "Webpack/Vite"],
  },
  "backend-developer": {
    name: "Desarrollador backend",
    nameInTitle: "desarrollador backend",
    recruiters:
      "El reclutador busca primero el lenguaje principal, las bases de datos y la experiencia con APIs. Luego revisa la escala de los sistemas (peticiones por segundo, volumen de datos) y si usted trabajó con colas, caché y microservicios.",
    summaries: {
      junior:
        "Desarrollador backend junior con experiencia en Python y Django. Desarrollé una API REST para una app de reservas con 20 endpoints y PostgreSQL, cubierta con tests al 75 %. Quiero profundizar en arquitectura y rendimiento.",
      middle:
        "Desarrollador backend con 5 años de experiencia en Node.js y Go. Diseñé un servicio de procesamiento de pedidos que soporta 3000 peticiones por segundo y reduje los costes de infraestructura un 30 % con caché en Redis.",
      senior:
        "Desarrollador backend sénior con 10 años de experiencia en sistemas distribuidos. Lideré el diseño de una plataforma de eventos con Kafka que procesa 2 millones de mensajes por hora con disponibilidad del 99,95 %. Defino la arquitectura y hago mentoring a 6 ingenieros.",
    },
    tip: "Indique cifras de carga y fiabilidad: RPS, volumen de datos, uptime, tiempos de respuesta. Son el lenguaje que entienden los responsables técnicos.",
    skills: ["Node.js", "Python", "Go", "PostgreSQL", "Redis", "Kafka", "Docker", "REST/gRPC"],
  },
  "full-stack-developer": {
    name: "Desarrollador full stack",
    nameInTitle: "desarrollador full stack",
    recruiters:
      "Los reclutadores comprueban que usted domina de verdad ambos lados: un framework de frontend y uno de backend, más bases de datos. Después buscan funcionalidades que llevó de principio a fin, desde la interfaz hasta el despliegue.",
    summaries: {
      junior:
        "Desarrollador full stack junior con React, Node.js y MongoDB. Construí de principio a fin una plataforma de reservas para un gimnasio con pagos online y 300 usuarios activos. Me motiva entender el producto completo.",
      middle:
        "Desarrollador full stack con 4 años de experiencia en Next.js, NestJS y PostgreSQL. Lancé un módulo de suscripciones que genera el 20 % de los ingresos del producto y automaticé los despliegues con GitHub Actions.",
      senior:
        "Desarrollador full stack sénior con 9 años de experiencia. Diseñé y construí un CRM B2B desde cero hasta 5000 clientes de pago, incluida la infraestructura en AWS. Lidero un equipo de 5 personas y tomo decisiones de arquitectura en frontend y backend.",
    },
    tip: "Describa al menos una funcionalidad completa, de la base de datos a la interfaz, con su impacto en el negocio. Así demuestra que es full stack de verdad y no solo en el título.",
    skills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Desarrollador Python",
    nameInTitle: "desarrollador Python",
    recruiters:
      "El reclutador mira primero los frameworks (Django, FastAPI, Flask) y el área: web, datos o automatización. Después revisa la experiencia con bases de datos, tareas asíncronas y tests con pytest.",
    summaries: {
      junior:
        "Desarrollador Python junior con experiencia en FastAPI y PostgreSQL. Automaticé la generación de informes para el equipo de ventas con scripts que ahorran 10 horas a la semana. Escribo código limpio con tipado y tests en pytest.",
      middle:
        "Desarrollador Python con 4 años de experiencia en Django y Celery. Desarrollé el backend de una plataforma de e-learning con 80 000 estudiantes y reduje el tiempo de las tareas en segundo plano un 50 % optimizando consultas.",
      senior:
        "Desarrollador Python sénior con 9 años de experiencia en sistemas de alta carga y datos. Diseñé una plataforma asíncrona con FastAPI que atiende 5000 peticiones por segundo. Defino las buenas prácticas del equipo y reviso la arquitectura de nuevos servicios.",
    },
    tip: "Aclare en qué dirección de Python trabaja (web, datos, ML o automatización): es un lenguaje muy amplio y el reclutador necesita entender su perfil en segundos.",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "Redis", "pytest", "Docker"],
  },
  "java-developer": {
    name: "Desarrollador Java",
    nameInTitle: "desarrollador Java",
    recruiters:
      "Los reclutadores buscan primero la versión de Java y Spring Boot, además de la experiencia con microservicios. Luego revisan bases de datos, mensajería (Kafka, RabbitMQ) y el dominio: banca, e-commerce o telecomunicaciones.",
    summaries: {
      junior:
        "Desarrollador Java junior con experiencia en Java 17 y Spring Boot. Implementé un microservicio de gestión de usuarios con autenticación JWT y tests en JUnit con cobertura del 85 %. Quiero crecer en sistemas empresariales.",
      middle:
        "Desarrollador Java con 5 años de experiencia en Spring Boot, Hibernate y Kafka. Desarrollé el módulo de transacciones de un banco digital que procesa 1 millón de operaciones al día y reduje los incidentes en producción un 40 %.",
      senior:
        "Desarrollador Java sénior con 11 años de experiencia en sistemas financieros. Lideré la migración de una plataforma monolítica a microservicios en Kubernetes con cero tiempo de inactividad. Soy responsable técnico de un equipo de 8 ingenieros.",
    },
    tip: "Indique versiones concretas (Java 17/21, Spring Boot 3) y el dominio de negocio. En Java la experiencia sectorial, por ejemplo en fintech, pesa mucho.",
    skills: ["Java", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "Microservices", "JUnit", "Kubernetes"],
  },
  "javascript-react-developer": {
    name: "Desarrollador React",
    nameInTitle: "desarrollador React",
    recruiters:
      "El reclutador comprueba primero React con TypeScript y la gestión de estado (Redux, Zustand, React Query). Después busca proyectos reales, rendimiento de la interfaz y experiencia con Next.js o SSR.",
    summaries: {
      junior:
        "Desarrollador React junior con TypeScript y React Query. Creé un panel de analítica con gráficos interactivos y filtros que usa un equipo de 40 personas. Escribo tests con React Testing Library.",
      middle:
        "Desarrollador React con 4 años de experiencia en Next.js y Redux Toolkit. Migré una aplicación grande a TypeScript estricto y reduje los errores en producción un 35 %. Optimicé el renderizado y bajé el tiempo de carga un 40 %.",
      senior:
        "Desarrollador React sénior con 8 años de experiencia. Diseñé la arquitectura frontend de una plataforma fintech con 300 000 usuarios y un design system de 80 componentes. Lidero las decisiones técnicas del frontend y hago mentoring a 5 desarrolladores.",
    },
    tip: "Muestre una app React en vivo con código público y explique en el README sus decisiones: gestión de estado, estructura de carpetas, tests. Es lo primero que abre un líder técnico.",
    skills: ["React", "TypeScript", "Next.js", "Redux Toolkit", "React Query", "React Testing Library", "Tailwind CSS", "Vite"],
  },
  "nodejs-developer": {
    name: "Desarrollador Node.js",
    nameInTitle: "desarrollador Node.js",
    recruiters:
      "Los reclutadores buscan primero Node.js con TypeScript y frameworks como NestJS o Express. Luego revisan bases de datos, colas, trabajo con APIs externas y la escala de los servicios que usted mantuvo.",
    summaries: {
      junior:
        "Desarrollador Node.js junior con Express, TypeScript y MongoDB. Desarrollé una API para una app móvil de entregas con 25 endpoints y documentación en Swagger. Me interesan la arquitectura limpia y los tests.",
      middle:
        "Desarrollador Node.js con 4 años de experiencia en NestJS, PostgreSQL y RabbitMQ. Construí un servicio de integraciones con 12 APIs de terceros que sincroniza 500 000 registros al día y reduje los fallos de sincronización un 70 %.",
      senior:
        "Desarrollador Node.js sénior con 9 años de experiencia en backend de alta carga. Diseñé una plataforma de mensajería en tiempo real con WebSocket que mantiene 100 000 conexiones simultáneas. Defino la arquitectura y los estándares de código del equipo.",
    },
    tip: "Destaque la experiencia con procesos asíncronos, colas e integraciones: es donde Node.js aporta más valor y lo que más preguntan en las entrevistas.",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "MongoDB", "RabbitMQ", "Docker"],
  },
  "dotnet-developer": {
    name: "Desarrollador .NET",
    nameInTitle: "desarrollador .NET",
    recruiters:
      "El reclutador mira primero C#, la versión de .NET y ASP.NET Core. Después revisa Entity Framework, SQL Server, la experiencia con Azure y el tipo de sistemas: empresariales, financieros o SaaS.",
    summaries: {
      junior:
        "Desarrollador .NET junior con C#, ASP.NET Core y Entity Framework. Desarrollé una API para un sistema de inventario con SQL Server y tests en xUnit. Quiero especializarme en servicios en la nube con Azure.",
      middle:
        "Desarrollador .NET con 5 años de experiencia en ASP.NET Core y Azure. Migré una aplicación heredada de .NET Framework a .NET 8 y reduje el consumo de memoria un 45 %. Implementé CI/CD con Azure DevOps para cuatro servicios.",
      senior:
        "Desarrollador .NET sénior con 12 años de experiencia en soluciones empresariales. Diseñé la arquitectura de una plataforma de seguros basada en microservicios en Azure que atiende a 2 millones de clientes. Lidero un equipo de 7 desarrolladores.",
    },
    tip: "Mencione si trabajó con migraciones de .NET Framework a .NET moderno: es una tarea muy demandada y demuestra que conoce ambos mundos.",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework", "SQL Server", "Azure", "xUnit", "Azure DevOps"],
  },
  "php-developer": {
    name: "Desarrollador PHP",
    nameInTitle: "desarrollador PHP",
    recruiters:
      "Los reclutadores comprueban primero la versión de PHP y el framework: Laravel o Symfony. Luego buscan experiencia con MySQL, colas, tests y proyectos concretos como e-commerce o CMS.",
    summaries: {
      junior:
        "Desarrollador PHP junior con Laravel y MySQL. Desarrollé el panel de administración de una tienda online con gestión de pedidos y exportación a Excel. Escribo tests con PHPUnit y sigo los estándares PSR.",
      middle:
        "Desarrollador PHP con 5 años de experiencia en Laravel y Vue.js. Optimicé un e-commerce con 50 000 productos y reduje el tiempo de carga del catálogo de 3 a 0,8 s con caché y índices. Integré cinco pasarelas de pago.",
      senior:
        "Desarrollador PHP sénior con 10 años de experiencia en Symfony y Laravel. Lideré la modernización de una plataforma heredada de PHP 5 a PHP 8.3 sin interrumpir el servicio para 400 000 usuarios. Defino la arquitectura y reviso el código del equipo.",
    },
    tip: "Indique la versión de PHP con la que trabaja actualmente. PHP 8 con Laravel o Symfony da una imagen muy distinta a proyectos heredados sin framework.",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "Vue.js"],
  },
  "flutter-developer": {
    name: "Desarrollador Flutter",
    nameInTitle: "desarrollador Flutter",
    recruiters:
      "El reclutador busca primero apps publicadas en App Store y Google Play con enlaces. Después revisa la gestión de estado (Bloc, Riverpod, Provider), la arquitectura y la experiencia con integraciones nativas.",
    summaries: {
      junior:
        "Desarrollador Flutter junior con Dart, Bloc y Firebase. Publiqué en Google Play una app de hábitos con 5000 descargas y valoración de 4,6. Me interesa la arquitectura limpia y la animación de interfaces.",
      middle:
        "Desarrollador Flutter con 4 años de experiencia y 6 apps publicadas en ambas tiendas. Desarrollé una app de delivery con 200 000 usuarios y reduje los cierres inesperados al 0,2 % con Crashlytics y tests de widgets.",
      senior:
        "Desarrollador Flutter sénior con 7 años en desarrollo móvil, incluidos 2 en nativo. Diseñé la arquitectura modular de una app bancaria con 1 millón de usuarios y escribí plugins propios con Swift y Kotlin. Lidero un equipo móvil de 5 personas.",
    },
    tip: "Añada enlaces directos a sus apps en las tiendas con número de descargas y valoración. Para Flutter es la prueba más convincente.",
    skills: ["Flutter", "Dart", "Bloc", "Riverpod", "Firebase", "REST API", "Clean Architecture", "CI/CD (Codemagic)"],
  },
  "ios-developer": {
    name: "Desarrollador iOS",
    nameInTitle: "desarrollador iOS",
    recruiters:
      "Los reclutadores buscan primero Swift, SwiftUI o UIKit y apps publicadas en el App Store. Luego revisan arquitectura (MVVM, TCA), concurrencia con async/await y métricas como la tasa de sesiones sin fallos.",
    summaries: {
      junior:
        "Desarrollador iOS junior con Swift y SwiftUI. Publiqué en el App Store una app de recetas con 3000 usuarios y modo offline con Core Data. Sigo las Human Interface Guidelines de Apple.",
      middle:
        "Desarrollador iOS con 5 años de experiencia en Swift, UIKit y SwiftUI. Migré una app de 150 000 usuarios a SwiftUI y async/await, y subí la tasa de sesiones sin fallos al 99,8 %. Automaticé las builds con Fastlane.",
      senior:
        "Desarrollador iOS sénior con 10 años de experiencia. Diseñé la arquitectura modular de una app de salud con 2 millones de usuarios y reduje el tiempo de arranque un 50 %. Lidero el equipo iOS y defino los estándares de calidad.",
    },
    tip: "Incluya el enlace al App Store y cifras de calidad: crash-free rate, valoración, tiempo de arranque. Los equipos iOS miden mucho estos indicadores.",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "MVVM", "Fastlane"],
  },
  "android-developer": {
    name: "Desarrollador Android",
    nameInTitle: "desarrollador Android",
    recruiters:
      "El reclutador comprueba primero Kotlin, Jetpack Compose y apps en Google Play. Después busca arquitectura (MVVM, Clean Architecture), coroutines, inyección de dependencias y métricas de estabilidad.",
    summaries: {
      junior:
        "Desarrollador Android junior con Kotlin y Jetpack Compose. Publiqué en Google Play una app de finanzas personales con 4000 descargas y sincronización con Room y Retrofit. Escribo tests unitarios con JUnit.",
      middle:
        "Desarrollador Android con 5 años de experiencia en Kotlin, Coroutines y Hilt. Migré la interfaz de una app de transporte con 300 000 usuarios a Jetpack Compose y reduje los ANR un 60 %.",
      senior:
        "Desarrollador Android sénior con 10 años de experiencia. Diseñé la arquitectura multimódulo de una app de comercio con 3 millones de instalaciones y reduje el tamaño del APK un 35 %. Lidero un equipo de 6 desarrolladores Android.",
    },
    tip: "Mencione métricas de Android Vitals (crash rate, ANR) y el tamaño de la app. Demuestran que usted piensa en la calidad, no solo en las funcionalidades.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "Ingeniero QA",
    nameInTitle: "ingeniero QA",
    recruiters:
      "Los reclutadores buscan primero los tipos de pruebas que usted domina (funcionales, regresión, API, móvil) y las herramientas: Jira, TestRail, Postman. Luego valoran la documentación de pruebas y los resultados medibles, como menos errores en producción.",
    summaries: {
      junior:
        "Ingeniero QA junior con experiencia en pruebas manuales de aplicaciones web y móviles. Redacté 300 casos de prueba en TestRail y reporté 150 errores en Jira para una app de reservas. Pruebo APIs con Postman y conozco SQL básico.",
      middle:
        "Ingeniero QA con 4 años de experiencia en pruebas de productos fintech. Construí el proceso de pruebas de regresión que redujo los errores críticos en producción un 50 %. Pruebo APIs, bases de datos y apps móviles.",
      senior:
        "Ingeniero QA sénior con 8 años de experiencia. Diseñé la estrategia de calidad para 4 equipos de producto e implementé métricas de calidad que acortaron el ciclo de release de 4 a 2 semanas. Formo a ingenieros QA y defino los procesos.",
    },
    tip: "Cuantifique su impacto: número de casos de prueba, errores encontrados antes del release, reducción de incidencias en producción.",
    skills: ["Pruebas manuales", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "Pruebas de API", "Pruebas móviles"],
  },
  "qa-automation-engineer": {
    name: "Ingeniero de automatización QA",
    nameInTitle: "ingeniero de automatización QA",
    recruiters:
      "El reclutador mira primero el lenguaje y el framework de automatización: Selenium, Playwright, Cypress o Appium. Después revisa la integración con CI/CD y cuánto acortó usted la regresión gracias a la automatización.",
    summaries: {
      junior:
        "Ingeniero de automatización QA junior con Java y Selenium WebDriver. Automaticé 120 pruebas de regresión de una tienda online y las integré en Jenkins. Aplico el patrón Page Object.",
      middle:
        "Ingeniero de automatización QA con 4 años de experiencia en Playwright y TypeScript. Creé desde cero un framework de pruebas end-to-end con 800 tests que redujo la regresión de 3 días a 40 minutos en GitHub Actions.",
      senior:
        "Ingeniero de automatización QA sénior con 9 años de experiencia. Diseñé la estrategia de automatización para web, móvil y API en 5 equipos, con una cobertura del 85 % de los escenarios críticos. Lidero a 4 ingenieros de automatización.",
    },
    tip: "Indique cuánto tiempo ahorró la automatización y el porcentaje de pruebas estables. Un framework con muchos tests inestables no impresiona a nadie.",
    skills: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript", "REST Assured", "Appium", "Jenkins/GitHub Actions"],
  },
  "devops-engineer": {
    name: "Ingeniero DevOps",
    nameInTitle: "ingeniero DevOps",
    recruiters:
      "Los reclutadores buscan primero la nube (AWS, GCP, Azure), Kubernetes y la infraestructura como código con Terraform. Luego revisan CI/CD, monitorización y resultados medibles: uptime, frecuencia de despliegues, ahorro de costes.",
    summaries: {
      junior:
        "Ingeniero DevOps junior con Docker, GitHub Actions y AWS. Configuré pipelines de CI/CD para 6 servicios y reduje el tiempo de despliegue de 40 a 8 minutos. Tengo la certificación AWS Cloud Practitioner.",
      middle:
        "Ingeniero DevOps con 5 años de experiencia en Kubernetes, Terraform y AWS. Migré la infraestructura de un SaaS a EKS con Terraform y reduje la factura de la nube un 35 %. Implementé monitorización con Prometheus y Grafana.",
      senior:
        "Ingeniero DevOps sénior con 10 años de experiencia en plataformas en la nube. Construí una plataforma interna para 40 equipos con despliegues diarios y disponibilidad del 99,99 %. Defino la estrategia de infraestructura y seguridad.",
    },
    tip: "Hable de dinero y fiabilidad: cuánto ahorró en la nube, qué uptime garantizó, cuánto bajó el tiempo de despliegue. Son las cifras que más pesan en DevOps.",
    skills: ["Kubernetes", "Terraform", "AWS", "Docker", "GitHub Actions", "Prometheus", "Grafana", "Linux"],
  },
  "data-analyst": {
    name: "Analista de datos",
    nameInTitle: "analista de datos",
    recruiters:
      "El reclutador comprueba primero SQL y la herramienta de BI: Tableau, Power BI o Looker. Después busca ejemplos de análisis que llevaron a decisiones de negocio y experiencia con Python o pruebas A/B.",
    summaries: {
      junior:
        "Analista de datos junior con SQL, Python (pandas) y Power BI. Construí un dashboard de ventas para 12 tiendas que sustituyó informes manuales en Excel y ahorra 8 horas a la semana al equipo.",
      middle:
        "Analista de datos con 4 años de experiencia en e-commerce. Analicé el embudo de compra y propuse cambios en el checkout que aumentaron la conversión un 9 %. Diseño y evalúo pruebas A/B y mantengo 20 dashboards en Tableau.",
      senior:
        "Analista de datos sénior con 8 años de experiencia. Construí el sistema de métricas de producto para una app con 2 millones de usuarios y lidero un equipo de 4 analistas. Mis análisis de retención guiaron la hoja de ruta de dos trimestres.",
    },
    tip: "Para cada análisis indique la decisión de negocio que provocó y su efecto en cifras. El reclutador busca impacto, no solo dashboards bonitos.",
    skills: ["SQL", "Python", "pandas", "Tableau", "Power BI", "Excel", "Pruebas A/B", "Estadística"],
  },
  "data-scientist": {
    name: "Científico de datos",
    nameInTitle: "científico de datos",
    recruiters:
      "Los reclutadores buscan primero Python, las bibliotecas de ML y los tipos de modelos que usted llevó a producción. Luego revisan métricas de calidad del modelo y, sobre todo, su impacto en el negocio.",
    summaries: {
      junior:
        "Científico de datos junior con Python, scikit-learn y PyTorch. Entrené un modelo de clasificación de reseñas con un F1 de 0,89 y lo publiqué como API con FastAPI. Tengo un máster en matemáticas aplicadas.",
      middle:
        "Científico de datos con 4 años de experiencia en modelos de recomendación. Desarrollé un recomendador para un marketplace que aumentó el valor medio del pedido un 11 %. Despliego modelos en producción con MLflow y Docker.",
      senior:
        "Científico de datos sénior con 9 años de experiencia en ML y LLM. Lideré la creación de un sistema de detección de fraude que redujo las pérdidas un 40 % y un asistente basado en RAG para el soporte al cliente. Dirijo un equipo de 5 especialistas en ML.",
    },
    tip: "No se limite a la métrica del modelo (accuracy, F1): explique qué cambió en el negocio gracias a él. Un modelo en producción vale más que diez notebooks.",
    skills: ["Python", "scikit-learn", "PyTorch", "pandas", "SQL", "MLflow", "LLM/RAG", "Estadística"],
  },
  "data-engineer": {
    name: "Ingeniero de datos",
    nameInTitle: "ingeniero de datos",
    recruiters:
      "El reclutador mira primero SQL, Python, las herramientas de orquestación (Airflow, dbt) y el almacén de datos: Snowflake, BigQuery o Redshift. Después revisa volúmenes de datos y fiabilidad de los pipelines.",
    summaries: {
      junior:
        "Ingeniero de datos junior con SQL, Python y Airflow. Construí pipelines ETL que cargan datos de 5 fuentes en PostgreSQL cada hora. Me interesan el modelado de datos y la calidad de los datos.",
      middle:
        "Ingeniero de datos con 4 años de experiencia en Spark, Airflow y BigQuery. Migré 200 pipelines a dbt y reduje el tiempo de actualización del almacén de 6 horas a 45 minutos. Implementé pruebas de calidad de datos.",
      senior:
        "Ingeniero de datos sénior con 9 años de experiencia. Diseñé la plataforma de datos de una empresa de logística que procesa 5 TB al día con Kafka, Spark y Snowflake. Lidero un equipo de 6 ingenieros y defino la arquitectura del data lakehouse.",
    },
    tip: "Indique volúmenes (GB o TB al día), número de pipelines y tiempos de actualización. En ingeniería de datos la escala es lo primero que se valora.",
    skills: ["SQL", "Python", "Apache Spark", "Airflow", "dbt", "Snowflake", "BigQuery", "Kafka"],
  },
  "product-manager": {
    name: "Product Manager",
    nameInTitle: "Product Manager",
    recruiters:
      "Los reclutadores buscan primero los productos que usted gestionó y las métricas que movió: retención, conversión, ingresos. Luego revisan el trabajo con usuarios, las pruebas A/B y la colaboración con desarrollo y diseño.",
    summaries: {
      junior:
        "Product Manager junior con experiencia como analista en una app de fitness. Lancé la función de retos semanales a partir de 25 entrevistas con usuarios y aumenté la retención al día 30 en 6 puntos.",
      middle:
        "Product Manager con 5 años de experiencia en productos B2C. Rediseñé el onboarding de una app de finanzas y la activación subió del 32 al 48 %. Gestiono el backlog de un equipo de 8 personas y priorizo con datos.",
      senior:
        "Product Manager sénior con 10 años de experiencia en SaaS B2B. Lideré una línea de producto que creció de 1 a 6 millones de dólares de ingresos anuales recurrentes en 3 años. Defino la visión, la estrategia y gestiono a 3 product managers.",
    },
    tip: "Cada logro debe tener una métrica de producto antes y después. «Lancé la función X» sin resultado no dice nada a un reclutador de producto.",
    skills: ["Product Discovery", "Pruebas A/B", "Amplitude", "SQL", "Jira", "Roadmapping", "Entrevistas con usuarios", "Unit economics"],
  },
  "project-manager": {
    name: "Project Manager IT",
    nameInTitle: "Project Manager IT",
    recruiters:
      "El reclutador comprueba primero el tamaño de los equipos y proyectos que usted gestionó, la metodología (Scrum, Kanban) y si entregó en plazo y presupuesto. También valora la comunicación con clientes y la gestión de riesgos.",
    summaries: {
      junior:
        "Project Manager junior con experiencia como coordinador en una agencia de desarrollo. Gestioné 4 proyectos web con equipos de 5 personas y los entregué a tiempo. Trabajo con Jira, Confluence y Scrum.",
      middle:
        "Project Manager con 5 años de experiencia en outsourcing. Gestioné en paralelo 3 proyectos con un presupuesto total de 1,2 millones de dólares y equipos distribuidos de 25 personas. Reduje los retrasos en las entregas un 30 % con una mejor gestión de riesgos.",
      senior:
        "Project Manager sénior con 11 años de experiencia. Dirigí la implantación de un ERP en 8 países con un equipo de 60 personas y un presupuesto de 5 millones. Construí la oficina de proyectos (PMO) y formé a 6 project managers.",
    },
    tip: "Indique siempre la escala: tamaño del equipo, presupuesto, duración, número de stakeholders, y si cumplió plazos. Son los primeros datos que busca el reclutador.",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "Gestión de riesgos", "Gestión del presupuesto", "Gestión de stakeholders", "PMP"],
  },
  "ui-ux-designer": {
    name: "Diseñador UI/UX",
    nameInTitle: "diseñador UI/UX",
    recruiters:
      "Los reclutadores abren primero el portafolio: sin él el CV casi no se lee. Después buscan casos con el proceso completo (investigación, prototipos, pruebas) y el resultado en métricas, además del dominio de Figma y design systems.",
    summaries: {
      junior:
        "Diseñador UI/UX junior con Figma y experiencia en prototipado. Rediseñé el flujo de registro de una app de citas médicas tras 8 pruebas de usabilidad y reduje los abandonos un 20 %. Mi portafolio incluye 4 casos completos.",
      middle:
        "Diseñador UI/UX con 4 años de experiencia en productos SaaS. Creé un design system de 120 componentes en Figma que aceleró el desarrollo de interfaces un 30 %. Realizo investigación con usuarios y pruebas de usabilidad cada sprint.",
      senior:
        "Diseñador UI/UX sénior con 9 años de experiencia. Lideré el rediseño de una app bancaria con 1,5 millones de usuarios que subió la valoración de 3,9 a 4,7. Dirijo un equipo de 4 diseñadores y defino la estrategia de experiencia de usuario.",
    },
    tip: "Ponga el enlace al portafolio en la primera línea del CV. En cada caso muestre el problema, el proceso y el resultado con cifras, no solo pantallas bonitas.",
    skills: ["Figma", "Prototipado", "Investigación de usuarios", "Pruebas de usabilidad", "Design systems", "Wireframing", "Diseño de interacción", "Accesibilidad"],
  },
  "business-analyst": {
    name: "Analista de negocio",
    nameInTitle: "analista de negocio",
    recruiters:
      "El reclutador busca primero la experiencia en recogida y documentación de requisitos: historias de usuario, BPMN, UML. Después revisa el dominio (fintech, logística, e-commerce), SQL y la comunicación con stakeholders.",
    summaries: {
      junior:
        "Analista de negocio junior con experiencia en documentación de requisitos y BPMN. Describí 60 historias de usuario con criterios de aceptación para un sistema de gestión de almacenes. Uso SQL para comprobar datos.",
      middle:
        "Analista de negocio con 5 años de experiencia en fintech. Analicé y rediseñé el proceso de aprobación de créditos y reduje el tiempo de respuesta al cliente de 3 días a 4 horas. Trabajo con Jira, Confluence y diagramas BPMN.",
      senior:
        "Analista de negocio sénior con 10 años de experiencia en sistemas empresariales. Dirigí el análisis de una plataforma logística para 12 países y coordiné los requisitos de 30 stakeholders. Lidero un equipo de 4 analistas y defino los estándares de documentación.",
    },
    tip: "Muestre cómo su análisis cambió un proceso con cifras: tiempo ahorrado, errores evitados, coste reducido. Mencione también el dominio, porque pesa mucho en esta profesión.",
    skills: ["Gestión de requisitos", "Historias de usuario", "BPMN", "UML", "SQL", "Jira", "Confluence", "Análisis de procesos"],
  },
  "it-recruiter": {
    name: "Reclutador IT",
    nameInTitle: "reclutador IT",
    recruiters:
      "En un CV de reclutador IT se mira primero qué perfiles técnicos cubrió usted y cuántas vacantes cerró al año. Después se valoran métricas como el time-to-hire, las herramientas de sourcing y la comprensión de tecnologías.",
    summaries: {
      junior:
        "Reclutador IT junior con un año de experiencia en una agencia de selección. Cerré 18 vacantes de desarrolladores y QA con sourcing en LinkedIn y GitHub. Entiendo la diferencia entre stacks y hago el primer filtro técnico.",
      middle:
        "Reclutador IT con 4 años de experiencia in-house en una empresa de producto. Cerré 45 vacantes al año, incluidas posiciones sénior de backend y DevOps, y reduje el time-to-hire de 45 a 28 días.",
      senior:
        "Reclutador IT sénior con 8 años de experiencia. Construí desde cero el proceso de selección de una startup que creció de 30 a 200 personas en 2 años. Gestiono el employer branding y lidero a 3 reclutadores.",
    },
    tip: "Hable con cifras de selección: vacantes cerradas, time-to-hire, tasa de aceptación de ofertas, roles cubiertos. Son sus resultados de negocio.",
    skills: ["Sourcing", "LinkedIn Recruiter", "Boolean search", "ATS", "Entrevista técnica inicial", "Employer branding", "Métricas de selección", "Negociación"],
  },
};

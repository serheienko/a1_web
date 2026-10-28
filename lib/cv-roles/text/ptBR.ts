import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const ptBR: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "Engenheiro de software",
    nameInTitle: "engenheiro de software",
    recruiters:
      "Os recrutadores olham primeiro a stack principal e os anos de experiência comercial com ela. Depois avaliam quais sistemas você construiu, em que escala e com quais resultados mensuráveis: latência, carga, número de usuários. Também contam sinais de boas práticas, como code review, testes e system design.",
    summaries: {
      junior:
        "Sou engenheiro de software júnior com um ano de experiência em Python e Go. Desenvolvi um serviço de notificações que processa 50 mil mensagens por dia e cobri 80% do código com testes. Tenho interesse em sistemas distribuídos e aprendo rápido com code review.",
      middle:
        "Engenheiro de software com 4 anos de experiência em backend com Java e Kotlin. Redesenhei o serviço de pagamentos de um marketplace e reduzi a latência p95 de 900 para 250 ms. Participo do design de APIs e acompanho dois desenvolvedores júnior.",
      senior:
        "Engenheiro de software sênior com 9 anos em sistemas de alta carga. Liderei a migração de um monólito para 14 microsserviços em Kubernetes, reduzindo o tempo de deploy de 2 horas para 10 minutos. Defino a arquitetura, os padrões de qualidade e participo das contratações do time.",
    },
    tip: "Para cada projeto, descreva o problema, a sua decisão técnica e o número do resultado. «Otimizei consultas SQL e reduzi o tempo de resposta em 60%» diz muito mais do que «trabalhei com bancos de dados».",
    skills: ["Java", "Python", "Go", "PostgreSQL", "Docker", "Kubernetes", "System Design", "CI/CD"],
  },
  "junior-developer": {
    name: "Desenvolvedor júnior",
    nameInTitle: "desenvolvedor júnior",
    recruiters:
      "Num currículo júnior, o recrutador olha primeiro os projetos próprios e o link do GitHub, porque eles substituem a experiência comercial. Depois verifica a stack, o nível de inglês e se você fez estágio, cursos ou bootcamp com projeto final.",
    summaries: {
      junior:
        "Desenvolvedor júnior formado em Ciência da Computação, com 6 meses de estágio em um time web. Construí um app de gestão de tarefas com React e Node.js usado por 120 pessoas. Busco um time onde possa crescer com mentoria e code review.",
      middle:
        "Desenvolvedor com um ano e meio de experiência comercial em JavaScript e TypeScript. Implementei 30 funcionalidades em um painel administrativo e reduzi os erros em produção em 25% com testes unitários. Estou pronto para assumir tarefas de maior responsabilidade.",
      senior:
        "Desenvolvedor com 2 anos de experiência que já trabalha de forma autônoma no frontend e no backend. Conduzi a integração de um gateway de pagamento de ponta a ponta e treinei dois estagiários do time. Meu objetivo é me consolidar como desenvolvedor pleno em um produto com usuários reais.",
    },
    tip: "Inclua 2 ou 3 projetos com demo online e repositório organizado, com README explicando o que o app faz e como rodar. Um projeto terminado vale mais que dez tutoriais copiados.",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "Git", "SQL", "HTML/CSS", "REST API"],
  },
  "frontend-developer": {
    name: "Desenvolvedor frontend",
    nameInTitle: "desenvolvedor frontend",
    recruiters:
      "Os recrutadores verificam primeiro o framework (React, Vue ou Angular) e TypeScript. Depois procuram um portfólio ou links para interfaces reais e métricas de performance como Core Web Vitals. Experiência com acessibilidade e design systems também pesa.",
    summaries: {
      junior:
        "Desenvolvedor frontend júnior com React e TypeScript. Implementei 15 telas responsivas a partir de layouts no Figma para uma loja online e alcancei 95 pontos no Lighthouse. Gosto de cuidar dos detalhes da interface.",
      middle:
        "Desenvolvedor frontend com 4 anos de experiência em React, Next.js e TypeScript. Reduzi o LCP da página de produto de 4,1 para 1,8 s, o que aumentou a conversão em 12%. Mantenho uma biblioteca de componentes usada por três times.",
      senior:
        "Desenvolvedor frontend sênior com 8 anos de experiência. Projetei a arquitetura micro-frontend de uma plataforma SaaS com 200 mil usuários e criei o design system da empresa. Defino padrões de qualidade, acessibilidade WCAG e performance para 12 desenvolvedores.",
    },
    tip: "Coloque links para interfaces em produção ou um portfólio com capturas de tela, e cite melhorias de performance com números do Lighthouse ou Core Web Vitals.",
    skills: ["React", "TypeScript", "Next.js", "HTML/CSS", "Redux", "Tailwind CSS", "Jest", "Webpack/Vite"],
  },
  "backend-developer": {
    name: "Desenvolvedor backend",
    nameInTitle: "desenvolvedor backend",
    recruiters:
      "O recrutador procura primeiro a linguagem principal, os bancos de dados e a experiência com APIs. Depois avalia a escala dos sistemas (requisições por segundo, volume de dados) e se você trabalhou com filas, cache e microsserviços.",
    summaries: {
      junior:
        "Desenvolvedor backend júnior com Python e Django. Desenvolvi uma API REST para um app de reservas com 20 endpoints e PostgreSQL, com 75% de cobertura de testes. Quero me aprofundar em arquitetura e performance.",
      middle:
        "Desenvolvedor backend com 5 anos de experiência em Node.js e Go. Projetei um serviço de processamento de pedidos que suporta 3 mil requisições por segundo e reduzi os custos de infraestrutura em 30% com cache no Redis.",
      senior:
        "Desenvolvedor backend sênior com 10 anos de experiência em sistemas distribuídos. Liderei o design de uma plataforma de eventos com Kafka que processa 2 milhões de mensagens por hora com 99,95% de disponibilidade. Defino a arquitetura e faço mentoria de 6 engenheiros.",
    },
    tip: "Mostre números de carga e confiabilidade: RPS, volume de dados, uptime, tempo de resposta. É a linguagem que os líderes técnicos entendem.",
    skills: ["Node.js", "Python", "Go", "PostgreSQL", "Redis", "Kafka", "Docker", "REST/gRPC"],
  },
  "full-stack-developer": {
    name: "Desenvolvedor full stack",
    nameInTitle: "desenvolvedor full stack",
    recruiters:
      "Os recrutadores conferem se você realmente domina os dois lados: um framework de frontend, um de backend e bancos de dados. Depois procuram funcionalidades que você entregou de ponta a ponta, da interface ao deploy.",
    summaries: {
      junior:
        "Desenvolvedor full stack júnior com React, Node.js e MongoDB. Construí de ponta a ponta uma plataforma de agendamento para uma academia, com pagamentos online e 300 usuários ativos. Gosto de entender o produto como um todo.",
      middle:
        "Desenvolvedor full stack com 4 anos de experiência em Next.js, NestJS e PostgreSQL. Lancei um módulo de assinaturas que gera 20% da receita do produto e automatizei os deploys com GitHub Actions.",
      senior:
        "Desenvolvedor full stack sênior com 9 anos de experiência. Projetei e construí um CRM B2B do zero até 5 mil clientes pagantes, incluindo a infraestrutura na AWS. Lidero um time de 5 pessoas e tomo decisões de arquitetura no frontend e no backend.",
    },
    tip: "Descreva pelo menos uma funcionalidade completa, do banco de dados à interface, com o impacto no negócio. Assim você prova que é full stack de verdade, não só no título.",
    skills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Desenvolvedor Python",
    nameInTitle: "desenvolvedor Python",
    recruiters:
      "O recrutador olha primeiro os frameworks (Django, FastAPI, Flask) e a área: web, dados ou automação. Depois avalia a experiência com bancos de dados, tarefas assíncronas e testes com pytest.",
    summaries: {
      junior:
        "Desenvolvedor Python júnior com FastAPI e PostgreSQL. Automatizei a geração de relatórios do time de vendas com scripts que economizam 10 horas por semana. Escrevo código limpo, com tipagem e testes em pytest.",
      middle:
        "Desenvolvedor Python com 4 anos de experiência em Django e Celery. Desenvolvi o backend de uma plataforma de ensino online com 80 mil alunos e reduzi o tempo das tarefas em background em 50% otimizando consultas.",
      senior:
        "Desenvolvedor Python sênior com 9 anos de experiência em sistemas de alta carga e dados. Projetei uma plataforma assíncrona com FastAPI que atende 5 mil requisições por segundo. Defino as boas práticas do time e reviso a arquitetura de novos serviços.",
    },
    tip: "Deixe claro em qual direção de Python você atua (web, dados, ML ou automação): a linguagem é muito ampla e o recrutador precisa entender seu perfil em segundos.",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "Redis", "pytest", "Docker"],
  },
  "java-developer": {
    name: "Desenvolvedor Java",
    nameInTitle: "desenvolvedor Java",
    recruiters:
      "Os recrutadores procuram primeiro a versão do Java, Spring Boot e experiência com microsserviços. Depois verificam bancos de dados, mensageria (Kafka, RabbitMQ) e o domínio: bancos, e-commerce ou telecom.",
    summaries: {
      junior:
        "Desenvolvedor Java júnior com Java 17 e Spring Boot. Implementei um microsserviço de gestão de usuários com autenticação JWT e testes em JUnit com 85% de cobertura. Quero crescer em sistemas corporativos.",
      middle:
        "Desenvolvedor Java com 5 anos de experiência em Spring Boot, Hibernate e Kafka. Desenvolvi o módulo de transações de um banco digital que processa 1 milhão de operações por dia e reduzi os incidentes em produção em 40%.",
      senior:
        "Desenvolvedor Java sênior com 11 anos de experiência em sistemas financeiros. Liderei a migração de uma plataforma monolítica para microsserviços em Kubernetes sem downtime. Sou responsável técnico por um time de 8 engenheiros.",
    },
    tip: "Cite versões concretas (Java 17/21, Spring Boot 3) e o domínio de negócio. Em Java, a experiência no setor, por exemplo em fintech, pesa muito.",
    skills: ["Java", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "Microsserviços", "JUnit", "Kubernetes"],
  },
  "javascript-react-developer": {
    name: "Desenvolvedor React",
    nameInTitle: "desenvolvedor React",
    recruiters:
      "O recrutador verifica primeiro React com TypeScript e o gerenciamento de estado (Redux, Zustand, React Query). Depois procura projetos reais, performance da interface e experiência com Next.js ou SSR.",
    summaries: {
      junior:
        "Desenvolvedor React júnior com TypeScript e React Query. Criei um painel de analytics com gráficos interativos e filtros usado por um time de 40 pessoas. Escrevo testes com React Testing Library.",
      middle:
        "Desenvolvedor React com 4 anos de experiência em Next.js e Redux Toolkit. Migrei uma aplicação grande para TypeScript estrito e reduzi os erros em produção em 35%. Otimizei a renderização e diminuí o tempo de carregamento em 40%.",
      senior:
        "Desenvolvedor React sênior com 8 anos de experiência. Projetei a arquitetura frontend de uma plataforma fintech com 300 mil usuários e um design system de 80 componentes. Lidero as decisões técnicas do frontend e faço mentoria de 5 desenvolvedores.",
    },
    tip: "Mostre um app React online com código público e explique no README suas escolhas: gerenciamento de estado, estrutura de pastas, testes. É a primeira coisa que um tech lead abre.",
    skills: ["React", "TypeScript", "Next.js", "Redux Toolkit", "React Query", "React Testing Library", "Tailwind CSS", "Vite"],
  },
  "nodejs-developer": {
    name: "Desenvolvedor Node.js",
    nameInTitle: "desenvolvedor Node.js",
    recruiters:
      "Os recrutadores procuram primeiro Node.js com TypeScript e frameworks como NestJS ou Express. Depois avaliam bancos de dados, filas, integração com APIs externas e a escala dos serviços que você manteve.",
    summaries: {
      junior:
        "Desenvolvedor Node.js júnior com Express, TypeScript e MongoDB. Desenvolvi uma API para um app de entregas com 25 endpoints e documentação em Swagger. Tenho interesse em arquitetura limpa e testes.",
      middle:
        "Desenvolvedor Node.js com 4 anos de experiência em NestJS, PostgreSQL e RabbitMQ. Construí um serviço de integrações com 12 APIs de terceiros que sincroniza 500 mil registros por dia e reduzi as falhas de sincronização em 70%.",
      senior:
        "Desenvolvedor Node.js sênior com 9 anos de experiência em backend de alta carga. Projetei uma plataforma de mensagens em tempo real com WebSocket que mantém 100 mil conexões simultâneas. Defino a arquitetura e os padrões de código do time.",
    },
    tip: "Destaque a experiência com processamento assíncrono, filas e integrações: é onde o Node.js mais agrega valor e o que mais aparece nas entrevistas.",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "MongoDB", "RabbitMQ", "Docker"],
  },
  "dotnet-developer": {
    name: "Desenvolvedor .NET",
    nameInTitle: "desenvolvedor .NET",
    recruiters:
      "O recrutador olha primeiro C#, a versão do .NET e ASP.NET Core. Depois verifica Entity Framework, SQL Server, experiência com Azure e o tipo de sistema: corporativo, financeiro ou SaaS.",
    summaries: {
      junior:
        "Desenvolvedor .NET júnior com C#, ASP.NET Core e Entity Framework. Desenvolvi uma API para um sistema de estoque com SQL Server e testes em xUnit. Quero me especializar em serviços em nuvem com Azure.",
      middle:
        "Desenvolvedor .NET com 5 anos de experiência em ASP.NET Core e Azure. Migrei uma aplicação legada do .NET Framework para o .NET 8 e reduzi o consumo de memória em 45%. Implementei CI/CD com Azure DevOps para quatro serviços.",
      senior:
        "Desenvolvedor .NET sênior com 12 anos de experiência em soluções corporativas. Projetei a arquitetura de uma plataforma de seguros baseada em microsserviços no Azure que atende 2 milhões de clientes. Lidero um time de 7 desenvolvedores.",
    },
    tip: "Mencione se você trabalhou com migrações do .NET Framework para o .NET moderno: é uma tarefa muito procurada e mostra que você conhece os dois mundos.",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework", "SQL Server", "Azure", "xUnit", "Azure DevOps"],
  },
  "php-developer": {
    name: "Desenvolvedor PHP",
    nameInTitle: "desenvolvedor PHP",
    recruiters:
      "Os recrutadores verificam primeiro a versão do PHP e o framework: Laravel ou Symfony. Depois procuram experiência com MySQL, filas, testes e projetos concretos como e-commerce ou CMS.",
    summaries: {
      junior:
        "Desenvolvedor PHP júnior com Laravel e MySQL. Desenvolvi o painel administrativo de uma loja online com gestão de pedidos e exportação para Excel. Escrevo testes com PHPUnit e sigo os padrões PSR.",
      middle:
        "Desenvolvedor PHP com 5 anos de experiência em Laravel e Vue.js. Otimizei um e-commerce com 50 mil produtos e reduzi o carregamento do catálogo de 3 para 0,8 s com cache e índices. Integrei cinco gateways de pagamento, incluindo Pix.",
      senior:
        "Desenvolvedor PHP sênior com 10 anos de experiência em Symfony e Laravel. Liderei a modernização de uma plataforma legada do PHP 5 para o PHP 8.3 sem interromper o serviço para 400 mil usuários. Defino a arquitetura e reviso o código do time.",
    },
    tip: "Informe a versão do PHP com que você trabalha hoje. PHP 8 com Laravel ou Symfony passa uma imagem muito diferente de projetos legados sem framework.",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "Vue.js"],
  },
  "flutter-developer": {
    name: "Desenvolvedor Flutter",
    nameInTitle: "desenvolvedor Flutter",
    recruiters:
      "O recrutador procura primeiro apps publicados na App Store e no Google Play, com links. Depois avalia o gerenciamento de estado (Bloc, Riverpod, Provider), a arquitetura e a experiência com integrações nativas.",
    summaries: {
      junior:
        "Desenvolvedor Flutter júnior com Dart, Bloc e Firebase. Publiquei no Google Play um app de hábitos com 5 mil downloads e nota 4,6. Tenho interesse em arquitetura limpa e animações de interface.",
      middle:
        "Desenvolvedor Flutter com 4 anos de experiência e 6 apps publicados nas duas lojas. Desenvolvi um app de delivery com 200 mil usuários e reduzi os crashes para 0,2% com Crashlytics e testes de widgets.",
      senior:
        "Desenvolvedor Flutter sênior com 7 anos em desenvolvimento mobile, incluindo 2 em nativo. Projetei a arquitetura modular de um app bancário com 1 milhão de usuários e escrevi plugins próprios em Swift e Kotlin. Lidero um time mobile de 5 pessoas.",
    },
    tip: "Adicione links diretos para seus apps nas lojas, com número de downloads e nota. Para Flutter, é a prova mais convincente.",
    skills: ["Flutter", "Dart", "Bloc", "Riverpod", "Firebase", "REST API", "Clean Architecture", "CI/CD (Codemagic)"],
  },
  "ios-developer": {
    name: "Desenvolvedor iOS",
    nameInTitle: "desenvolvedor iOS",
    recruiters:
      "Os recrutadores procuram primeiro Swift, SwiftUI ou UIKit e apps publicados na App Store. Depois avaliam arquitetura (MVVM, TCA), concorrência com async/await e métricas como a taxa de sessões sem crash.",
    summaries: {
      junior:
        "Desenvolvedor iOS júnior com Swift e SwiftUI. Publiquei na App Store um app de receitas com 3 mil usuários e modo offline com Core Data. Sigo as Human Interface Guidelines da Apple.",
      middle:
        "Desenvolvedor iOS com 5 anos de experiência em Swift, UIKit e SwiftUI. Migrei um app de 150 mil usuários para SwiftUI e async/await e elevei a taxa de sessões sem crash para 99,8%. Automatizei os builds com Fastlane.",
      senior:
        "Desenvolvedor iOS sênior com 10 anos de experiência. Projetei a arquitetura modular de um app de saúde com 2 milhões de usuários e reduzi o tempo de inicialização em 50%. Lidero o time iOS e defino os padrões de qualidade.",
    },
    tip: "Inclua o link da App Store e números de qualidade: crash-free rate, nota, tempo de inicialização. Times iOS acompanham muito esses indicadores.",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "MVVM", "Fastlane"],
  },
  "android-developer": {
    name: "Desenvolvedor Android",
    nameInTitle: "desenvolvedor Android",
    recruiters:
      "O recrutador verifica primeiro Kotlin, Jetpack Compose e apps no Google Play. Depois procura arquitetura (MVVM, Clean Architecture), coroutines, injeção de dependência e métricas de estabilidade.",
    summaries: {
      junior:
        "Desenvolvedor Android júnior com Kotlin e Jetpack Compose. Publiquei no Google Play um app de finanças pessoais com 4 mil downloads e sincronização com Room e Retrofit. Escrevo testes unitários com JUnit.",
      middle:
        "Desenvolvedor Android com 5 anos de experiência em Kotlin, Coroutines e Hilt. Migrei a interface de um app de mobilidade com 300 mil usuários para Jetpack Compose e reduzi os ANRs em 60%.",
      senior:
        "Desenvolvedor Android sênior com 10 anos de experiência. Projetei a arquitetura multimódulo de um app de varejo com 3 milhões de instalações e reduzi o tamanho do APK em 35%. Lidero um time de 6 desenvolvedores Android.",
    },
    tip: "Cite métricas do Android Vitals (crash rate, ANR) e o tamanho do app. Elas mostram que você pensa em qualidade, não só em funcionalidades.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "Analista de QA",
    nameInTitle: "analista de QA",
    recruiters:
      "Os recrutadores procuram primeiro os tipos de teste que você domina (funcional, regressão, API, mobile) e as ferramentas: Jira, TestRail, Postman. Depois valorizam documentação de testes e resultados mensuráveis, como menos bugs em produção.",
    summaries: {
      junior:
        "Analista de QA júnior com experiência em testes manuais de aplicações web e mobile. Escrevi 300 casos de teste no TestRail e reportei 150 bugs no Jira para um app de reservas. Testo APIs com Postman e conheço SQL básico.",
      middle:
        "Analista de QA com 4 anos de experiência em testes de produtos fintech. Estruturei o processo de testes de regressão que reduziu os bugs críticos em produção em 50%. Testo APIs, bancos de dados e apps mobile.",
      senior:
        "Analista de QA sênior com 8 anos de experiência. Desenhei a estratégia de qualidade para 4 times de produto e implantei métricas que encurtaram o ciclo de release de 4 para 2 semanas. Treino analistas de QA e defino os processos.",
    },
    tip: "Quantifique seu impacto: número de casos de teste, bugs encontrados antes do release, redução de incidentes em produção.",
    skills: ["Testes manuais", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "Testes de API", "Testes mobile"],
  },
  "qa-automation-engineer": {
    name: "QA Automation",
    nameInTitle: "QA Automation",
    recruiters:
      "O recrutador olha primeiro a linguagem e o framework de automação: Selenium, Playwright, Cypress ou Appium. Depois verifica a integração com CI/CD e quanto você encurtou a regressão com automação.",
    summaries: {
      junior:
        "QA Automation júnior com Java e Selenium WebDriver. Automatizei 120 testes de regressão de uma loja online e os integrei ao Jenkins. Aplico o padrão Page Object.",
      middle:
        "QA Automation com 4 anos de experiência em Playwright e TypeScript. Criei do zero um framework de testes end-to-end com 800 testes que reduziu a regressão de 3 dias para 40 minutos no GitHub Actions.",
      senior:
        "QA Automation sênior com 9 anos de experiência. Desenhei a estratégia de automação para web, mobile e API em 5 times, com 85% de cobertura dos cenários críticos. Lidero 4 engenheiros de automação.",
    },
    tip: "Mostre quanto tempo a automação economizou e o percentual de testes estáveis. Um framework cheio de testes instáveis não impressiona ninguém.",
    skills: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript", "REST Assured", "Appium", "Jenkins/GitHub Actions"],
  },
  "devops-engineer": {
    name: "Engenheiro DevOps",
    nameInTitle: "engenheiro DevOps",
    recruiters:
      "Os recrutadores procuram primeiro a nuvem (AWS, GCP, Azure), Kubernetes e infraestrutura como código com Terraform. Depois avaliam CI/CD, monitoramento e resultados mensuráveis: uptime, frequência de deploys, economia de custos.",
    summaries: {
      junior:
        "Engenheiro DevOps júnior com Docker, GitHub Actions e AWS. Configurei pipelines de CI/CD para 6 serviços e reduzi o tempo de deploy de 40 para 8 minutos. Tenho a certificação AWS Cloud Practitioner.",
      middle:
        "Engenheiro DevOps com 5 anos de experiência em Kubernetes, Terraform e AWS. Migrei a infraestrutura de um SaaS para EKS com Terraform e reduzi a conta de nuvem em 35%. Implantei monitoramento com Prometheus e Grafana.",
      senior:
        "Engenheiro DevOps sênior com 10 anos de experiência em plataformas de nuvem. Construí uma plataforma interna para 40 times com deploys diários e 99,99% de disponibilidade. Defino a estratégia de infraestrutura e segurança.",
    },
    tip: "Fale de dinheiro e confiabilidade: quanto você economizou na nuvem, qual uptime garantiu, quanto reduziu o tempo de deploy. São os números que mais pesam em DevOps.",
    skills: ["Kubernetes", "Terraform", "AWS", "Docker", "GitHub Actions", "Prometheus", "Grafana", "Linux"],
  },
  "data-analyst": {
    name: "Analista de dados",
    nameInTitle: "analista de dados",
    recruiters:
      "O recrutador verifica primeiro SQL e a ferramenta de BI: Tableau, Power BI ou Looker. Depois procura exemplos de análises que levaram a decisões de negócio e experiência com Python ou testes A/B.",
    summaries: {
      junior:
        "Analista de dados júnior com SQL, Python (pandas) e Power BI. Construí um dashboard de vendas para 12 lojas que substituiu relatórios manuais no Excel e economiza 8 horas por semana do time.",
      middle:
        "Analista de dados com 4 anos de experiência em e-commerce. Analisei o funil de compra e propus mudanças no checkout que aumentaram a conversão em 9%. Desenho e avalio testes A/B e mantenho 20 dashboards no Tableau.",
      senior:
        "Analista de dados sênior com 8 anos de experiência. Construí o sistema de métricas de produto para um app com 2 milhões de usuários e lidero um time de 4 analistas. Minhas análises de retenção orientaram o roadmap de dois trimestres.",
    },
    tip: "Para cada análise, indique a decisão de negócio que ela gerou e o efeito em números. O recrutador busca impacto, não só dashboards bonitos.",
    skills: ["SQL", "Python", "pandas", "Tableau", "Power BI", "Excel", "Testes A/B", "Estatística"],
  },
  "data-scientist": {
    name: "Cientista de dados",
    nameInTitle: "cientista de dados",
    recruiters:
      "Os recrutadores procuram primeiro Python, as bibliotecas de ML e os tipos de modelos que você colocou em produção. Depois avaliam as métricas de qualidade do modelo e, principalmente, o impacto no negócio.",
    summaries: {
      junior:
        "Cientista de dados júnior com Python, scikit-learn e PyTorch. Treinei um modelo de classificação de avaliações com F1 de 0,89 e o publiquei como API com FastAPI. Tenho mestrado em matemática aplicada.",
      middle:
        "Cientista de dados com 4 anos de experiência em sistemas de recomendação. Desenvolvi um recomendador para um marketplace que aumentou o ticket médio em 11%. Coloco modelos em produção com MLflow e Docker.",
      senior:
        "Cientista de dados sênior com 9 anos de experiência em ML e LLMs. Liderei a criação de um sistema antifraude que reduziu as perdas em 40% e de um assistente baseado em RAG para o atendimento ao cliente. Dirijo um time de 5 especialistas em ML.",
    },
    tip: "Não pare na métrica do modelo (accuracy, F1): explique o que mudou no negócio graças a ele. Um modelo em produção vale mais que dez notebooks.",
    skills: ["Python", "scikit-learn", "PyTorch", "pandas", "SQL", "MLflow", "LLM/RAG", "Estatística"],
  },
  "data-engineer": {
    name: "Engenheiro de dados",
    nameInTitle: "engenheiro de dados",
    recruiters:
      "O recrutador olha primeiro SQL, Python, ferramentas de orquestração (Airflow, dbt) e o data warehouse: Snowflake, BigQuery ou Redshift. Depois avalia volumes de dados e a confiabilidade dos pipelines.",
    summaries: {
      junior:
        "Engenheiro de dados júnior com SQL, Python e Airflow. Construí pipelines ETL que carregam dados de 5 fontes no PostgreSQL a cada hora. Tenho interesse em modelagem e qualidade de dados.",
      middle:
        "Engenheiro de dados com 4 anos de experiência em Spark, Airflow e BigQuery. Migrei 200 pipelines para dbt e reduzi o tempo de atualização do warehouse de 6 horas para 45 minutos. Implantei testes de qualidade de dados.",
      senior:
        "Engenheiro de dados sênior com 9 anos de experiência. Projetei a plataforma de dados de uma empresa de logística que processa 5 TB por dia com Kafka, Spark e Snowflake. Lidero um time de 6 engenheiros e defino a arquitetura do data lakehouse.",
    },
    tip: "Informe volumes (GB ou TB por dia), número de pipelines e tempos de atualização. Em engenharia de dados, a escala é o primeiro ponto avaliado.",
    skills: ["SQL", "Python", "Apache Spark", "Airflow", "dbt", "Snowflake", "BigQuery", "Kafka"],
  },
  "product-manager": {
    name: "Product Manager",
    nameInTitle: "Product Manager",
    recruiters:
      "Os recrutadores procuram primeiro os produtos que você gerenciou e as métricas que moveu: retenção, conversão, receita. Depois avaliam o trabalho com usuários, testes A/B e a colaboração com desenvolvimento e design.",
    summaries: {
      junior:
        "Product Manager júnior com experiência anterior como analista em um app de fitness. Lancei a funcionalidade de desafios semanais a partir de 25 entrevistas com usuários e aumentei a retenção no dia 30 em 6 pontos.",
      middle:
        "Product Manager com 5 anos de experiência em produtos B2C. Redesenhei o onboarding de um app de finanças e a ativação subiu de 32% para 48%. Gerencio o backlog de um time de 8 pessoas e priorizo com base em dados.",
      senior:
        "Product Manager sênior com 10 anos de experiência em SaaS B2B. Liderei uma linha de produto que cresceu de 1 para 6 milhões de dólares de receita recorrente anual em 3 anos. Defino a visão e a estratégia e gerencio 3 product managers.",
    },
    tip: "Cada conquista precisa de uma métrica de produto antes e depois. «Lancei a funcionalidade X» sem resultado não diz nada a um recrutador de produto.",
    skills: ["Product Discovery", "Testes A/B", "Amplitude", "SQL", "Jira", "Roadmap", "Entrevistas com usuários", "Unit economics"],
  },
  "project-manager": {
    name: "Gerente de projetos de TI",
    nameInTitle: "gerente de projetos de TI",
    recruiters:
      "O recrutador verifica primeiro o tamanho dos times e projetos que você gerenciou, a metodologia (Scrum, Kanban) e se entregou no prazo e no orçamento. Comunicação com clientes e gestão de riscos também contam.",
    summaries: {
      junior:
        "Gerente de projetos júnior com experiência como coordenador em uma software house. Gerenciei 4 projetos web com times de 5 pessoas e entreguei todos no prazo. Trabalho com Jira, Confluence e Scrum.",
      middle:
        "Gerente de projetos com 5 anos de experiência em outsourcing. Gerenciei em paralelo 3 projetos com orçamento total de 1,2 milhão de dólares e times distribuídos de 25 pessoas. Reduzi os atrasos nas entregas em 30% com uma gestão de riscos mais próxima.",
      senior:
        "Gerente de projetos sênior com 11 anos de experiência. Conduzi a implantação de um ERP em 8 países com um time de 60 pessoas e orçamento de 5 milhões. Estruturei o PMO da empresa e treinei 6 gerentes de projeto.",
    },
    tip: "Sempre informe a escala: tamanho do time, orçamento, duração, número de stakeholders, e se os prazos foram cumpridos. São os primeiros dados que o recrutador procura.",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "Gestão de riscos", "Gestão de orçamento", "Gestão de stakeholders", "PMP"],
  },
  "ui-ux-designer": {
    name: "Designer UI/UX",
    nameInTitle: "designer UI/UX",
    recruiters:
      "Os recrutadores abrem primeiro o portfólio: sem ele o currículo quase não é lido. Depois procuram cases com o processo completo (pesquisa, protótipos, testes) e o resultado em métricas, além do domínio de Figma e design systems.",
    summaries: {
      junior:
        "Designer UI/UX júnior com Figma e experiência em prototipagem. Redesenhei o fluxo de cadastro de um app de agendamento médico após 8 testes de usabilidade e reduzi os abandonos em 20%. Meu portfólio tem 4 cases completos.",
      middle:
        "Designer UI/UX com 4 anos de experiência em produtos SaaS. Criei um design system com 120 componentes no Figma que acelerou o desenvolvimento de interfaces em 30%. Conduzo pesquisas com usuários e testes de usabilidade a cada sprint.",
      senior:
        "Designer UI/UX sênior com 9 anos de experiência. Liderei o redesign de um app bancário com 1,5 milhão de usuários que elevou a nota de 3,9 para 4,7. Dirijo um time de 4 designers e defino a estratégia de experiência do usuário.",
    },
    tip: "Coloque o link do portfólio na primeira linha do currículo. Em cada case, mostre o problema, o processo e o resultado com números, não só telas bonitas.",
    skills: ["Figma", "Prototipagem", "Pesquisa com usuários", "Testes de usabilidade", "Design systems", "Wireframes", "Design de interação", "Acessibilidade"],
  },
  "business-analyst": {
    name: "Analista de negócios",
    nameInTitle: "analista de negócios",
    recruiters:
      "O recrutador procura primeiro experiência em levantamento e documentação de requisitos: histórias de usuário, BPMN, UML. Depois avalia o domínio (fintech, logística, e-commerce), SQL e a comunicação com stakeholders.",
    summaries: {
      junior:
        "Analista de negócios júnior com experiência em documentação de requisitos e BPMN. Escrevi 60 histórias de usuário com critérios de aceitação para um sistema de gestão de armazéns. Uso SQL para validar dados.",
      middle:
        "Analista de negócios com 5 anos de experiência em fintech. Analisei e redesenhei o processo de aprovação de crédito e reduzi o tempo de resposta ao cliente de 3 dias para 4 horas. Trabalho com Jira, Confluence e diagramas BPMN.",
      senior:
        "Analista de negócios sênior com 10 anos de experiência em sistemas corporativos. Conduzi a análise de uma plataforma logística para 12 países e alinhei os requisitos de 30 stakeholders. Lidero um time de 4 analistas e defino os padrões de documentação.",
    },
    tip: "Mostre como sua análise mudou um processo, com números: tempo economizado, erros evitados, custo reduzido. Cite também o domínio, porque ele pesa muito nessa profissão.",
    skills: ["Levantamento de requisitos", "Histórias de usuário", "BPMN", "UML", "SQL", "Jira", "Confluence", "Análise de processos"],
  },
  "it-recruiter": {
    name: "Recrutador de TI",
    nameInTitle: "recrutador de TI",
    recruiters:
      "Num currículo de recrutador de TI, olha-se primeiro quais perfis técnicos você contratou e quantas vagas fechou por ano. Depois contam métricas como time-to-hire, ferramentas de sourcing e o entendimento de tecnologias.",
    summaries: {
      junior:
        "Recrutador de TI júnior com um ano de experiência em uma consultoria de recrutamento. Fechei 18 vagas de desenvolvedores e QA com sourcing no LinkedIn e no GitHub. Entendo a diferença entre stacks e faço a triagem técnica inicial.",
      middle:
        "Recrutador de TI com 4 anos de experiência in-house em uma empresa de produto. Fechei 45 vagas por ano, incluindo posições sênior de backend e DevOps, e reduzi o time-to-hire de 45 para 28 dias.",
      senior:
        "Recrutador de TI sênior com 8 anos de experiência. Estruturei do zero o processo seletivo de uma startup que cresceu de 30 para 200 pessoas em 2 anos. Cuido do employer branding e lidero 3 recrutadores.",
    },
    tip: "Fale com números de recrutamento: vagas fechadas, time-to-hire, taxa de aceite de propostas, perfis contratados. Esses são os seus resultados de negócio.",
    skills: ["Sourcing", "LinkedIn Recruiter", "Busca booleana", "ATS", "Triagem técnica", "Employer branding", "Métricas de recrutamento", "Negociação"],
  },
};

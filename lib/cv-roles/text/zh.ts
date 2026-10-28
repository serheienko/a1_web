import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const zh: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "软件工程师",
    nameInTitle: "软件工程师",
    recruiters:
      "招聘方首先看您的主要技术栈以及相应的商业项目年限。接着会关注您做过哪些系统、规模多大、有哪些可量化的结果，例如延迟、并发量和用户数。代码评审、测试和系统设计等工程实践也是重要加分项。",
    summaries: {
      junior:
        "我是一名初级软件工程师，有 1 年 Python 和 Go 开发经验。我开发的消息通知服务每天处理 5 万条消息，单元测试覆盖率达到 80%。我对分布式系统很感兴趣，并能在代码评审中快速成长。",
      middle:
        "软件工程师，4 年 Java 和 Kotlin 后端开发经验。我重构了某电商平台的支付服务，将 p95 延迟从 900 毫秒降到 250 毫秒。我参与 API 设计，并指导两名初级开发。",
      senior:
        "高级软件工程师，9 年高并发系统经验。我主导将单体应用拆分为 14 个运行在 Kubernetes 上的微服务，部署时间从 2 小时缩短到 10 分钟。我负责架构设计、质量标准制定，并参与团队招聘。",
    },
    tip: "每个项目都写清楚问题、您的技术方案和量化结果。「优化 SQL 查询，响应时间降低 60%」远比「负责数据库相关工作」更有说服力。",
    skills: ["Java", "Python", "Go", "PostgreSQL", "Docker", "Kubernetes", "系统设计", "CI/CD"],
  },
  "junior-developer": {
    name: "初级开发工程师",
    nameInTitle: "初级开发工程师",
    recruiters:
      "对于初级岗位，招聘方首先看个人项目和 GitHub 链接，因为它们可以弥补商业经验的不足。然后会看技术栈、英语水平，以及您是否有实习经历、培训课程或带毕业项目的训练营经历。",
    summaries: {
      junior:
        "计算机专业毕业的初级开发工程师，有 6 个月 Web 团队实习经验。我用 React 和 Node.js 开发了一个任务管理应用，目前有 120 人在使用。希望加入有导师带教和代码评审的团队。",
      middle:
        "有一年半 JavaScript 和 TypeScript 商业开发经验。我在后台管理系统中实现了 30 个功能，并通过单元测试将线上错误减少了 25%。已经准备好承担更多责任。",
      senior:
        "2 年开发经验，已能独立完成前后端任务。我从头到尾负责了支付网关的接入，并带教了团队的两名实习生。目标是在拥有真实用户的产品中成长为中级开发工程师。",
    },
    tip: "放 2 到 3 个带在线演示的项目，仓库结构清晰，README 说明应用的功能和运行方法。一个完整的项目胜过十个照搬的教程。",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "Git", "SQL", "HTML/CSS", "REST API"],
  },
  "frontend-developer": {
    name: "前端开发工程师",
    nameInTitle: "前端开发",
    recruiters:
      "招聘方首先确认您使用的框架（React、Vue 或 Angular）和 TypeScript 水平。然后会找作品集或线上页面链接，以及 Core Web Vitals 等性能指标。无障碍和设计系统经验也很受重视。",
    summaries: {
      junior:
        "初级前端开发工程师，熟悉 React 和 TypeScript。我根据 Figma 设计稿为一个电商网站实现了 15 个响应式页面，Lighthouse 评分达到 95 分。我很注重界面细节。",
      middle:
        "前端开发工程师，4 年 React、Next.js 和 TypeScript 经验。我将商品详情页的 LCP 从 4.1 秒优化到 1.8 秒，转化率提升 12%。我维护的组件库被三个团队使用。",
      senior:
        "高级前端开发工程师，8 年经验。我为一个拥有 20 万用户的 SaaS 平台设计了微前端架构，并搭建了公司的设计系统。我为 12 名开发制定质量、WCAG 无障碍和性能标准。",
    },
    tip: "附上线上页面链接或带截图的作品集，并用 Lighthouse 或 Core Web Vitals 的数据说明您做过的性能优化。",
    skills: ["React", "TypeScript", "Next.js", "HTML/CSS", "Redux", "Tailwind CSS", "Jest", "Webpack/Vite"],
  },
  "backend-developer": {
    name: "后端开发工程师",
    nameInTitle: "后端开发",
    recruiters:
      "招聘方首先看主要编程语言、数据库和 API 开发经验。接着关注系统规模（每秒请求数、数据量），以及您是否用过消息队列、缓存和微服务。",
    summaries: {
      junior:
        "初级后端开发工程师，熟悉 Python 和 Django。我为一个预订应用开发了包含 20 个接口的 REST API，使用 PostgreSQL，测试覆盖率 75%。希望在架构和性能方面继续深入。",
      middle:
        "后端开发工程师，5 年 Node.js 和 Go 经验。我设计的订单处理服务可支撑每秒 3000 次请求，并通过 Redis 缓存将基础设施成本降低 30%。",
      senior:
        "高级后端开发工程师，10 年分布式系统经验。我主导设计了基于 Kafka 的事件平台，每小时处理 200 万条消息，可用性达 99.95%。我负责架构决策并指导 6 名工程师。",
    },
    tip: "写出负载和可靠性数据：RPS、数据量、可用性、响应时间。这是技术负责人最容易看懂的语言。",
    skills: ["Node.js", "Python", "Go", "PostgreSQL", "Redis", "Kafka", "Docker", "REST/gRPC"],
  },
  "full-stack-developer": {
    name: "全栈开发工程师",
    nameInTitle: "全栈开发",
    recruiters:
      "招聘方会确认您是否真正掌握前后端：一个前端框架、一个后端框架以及数据库。然后寻找您从界面到部署完整交付过的功能。",
    summaries: {
      junior:
        "初级全栈开发工程师，熟悉 React、Node.js 和 MongoDB。我独立开发了一个健身房预约平台，支持在线支付，拥有 300 名活跃用户。我喜欢从整体上理解产品。",
      middle:
        "全栈开发工程师，4 年 Next.js、NestJS 和 PostgreSQL 经验。我上线的订阅模块贡献了产品 20% 的收入，并用 GitHub Actions 实现了自动化部署。",
      senior:
        "高级全栈开发工程师，9 年经验。我从零设计并开发了一套 B2B CRM，发展到 5000 家付费客户，包括 AWS 上的基础设施。我带领 5 人团队，负责前后端架构决策。",
    },
    tip: "至少描述一个从数据库到界面完整实现的功能，并写出它对业务的影响。这样才能证明您是真正的全栈，而不只是头衔。",
    skills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Python 开发工程师",
    nameInTitle: "Python开发",
    recruiters:
      "招聘方首先看您使用的框架（Django、FastAPI、Flask）以及方向：Web、数据还是自动化。然后关注数据库、异步任务和 pytest 测试经验。",
    summaries: {
      junior:
        "初级 Python 开发工程师，熟悉 FastAPI 和 PostgreSQL。我编写脚本自动生成销售团队的报表，每周节省 10 个小时。我的代码有类型标注，并用 pytest 编写测试。",
      middle:
        "Python 开发工程师，4 年 Django 和 Celery 经验。我开发了一个拥有 8 万名学员的在线教育平台后端，通过优化查询将后台任务耗时缩短 50%。",
      senior:
        "高级 Python 开发工程师，9 年高并发和数据系统经验。我设计的 FastAPI 异步平台可处理每秒 5000 次请求。我制定团队的开发规范，并评审新服务的架构。",
    },
    tip: "明确写出您的 Python 方向（Web、数据、机器学习或自动化）。Python 应用面很广，招聘方需要在几秒内看懂您的定位。",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "Redis", "pytest", "Docker"],
  },
  "java-developer": {
    name: "Java 开发工程师",
    nameInTitle: "Java开发",
    recruiters:
      "招聘方首先看 Java 版本、Spring Boot 和微服务经验。然后关注数据库、消息中间件（Kafka、RabbitMQ）以及业务领域，例如金融、电商或通信。",
    summaries: {
      junior:
        "初级 Java 开发工程师，熟悉 Java 17 和 Spring Boot。我实现了一个支持 JWT 认证的用户管理微服务，JUnit 测试覆盖率 85%。希望在企业级系统方向发展。",
      middle:
        "Java 开发工程师，5 年 Spring Boot、Hibernate 和 Kafka 经验。我开发的数字银行交易模块每天处理 100 万笔业务，并将线上故障减少了 40%。",
      senior:
        "高级 Java 开发工程师，11 年金融系统经验。我主导了单体平台向 Kubernetes 微服务的零停机迁移。目前担任 8 人工程团队的技术负责人。",
    },
    tip: "写明具体版本（Java 17/21、Spring Boot 3）和业务领域。在 Java 岗位中，行业经验（如金融科技）非常加分。",
    skills: ["Java", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "微服务", "JUnit", "Kubernetes"],
  },
  "javascript-react-developer": {
    name: "React 开发工程师",
    nameInTitle: "React开发",
    recruiters:
      "招聘方首先确认您是否熟练使用 React 和 TypeScript，以及状态管理方案（Redux、Zustand、React Query）。然后关注真实项目、界面性能以及 Next.js 或 SSR 经验。",
    summaries: {
      junior:
        "初级 React 开发工程师，熟悉 TypeScript 和 React Query。我开发了一个带交互图表和筛选功能的数据分析面板，供 40 人的团队使用。我用 React Testing Library 编写测试。",
      middle:
        "React 开发工程师，4 年 Next.js 和 Redux Toolkit 经验。我把一个大型应用迁移到严格模式的 TypeScript，线上错误减少 35%。通过优化渲染，页面加载时间缩短 40%。",
      senior:
        "高级 React 开发工程师，8 年经验。我为一个拥有 30 万用户的金融科技平台设计了前端架构，并搭建了包含 80 个组件的设计系统。我负责前端技术决策并指导 5 名开发。",
    },
    tip: "展示一个公开代码的线上 React 应用，在 README 中说明您的技术选择：状态管理、目录结构、测试。这是技术负责人最先打开看的内容。",
    skills: ["React", "TypeScript", "Next.js", "Redux Toolkit", "React Query", "React Testing Library", "Tailwind CSS", "Vite"],
  },
  "nodejs-developer": {
    name: "Node.js 开发工程师",
    nameInTitle: "Node.js开发",
    recruiters:
      "招聘方首先看 Node.js 与 TypeScript 的掌握程度，以及 NestJS、Express 等框架。然后关注数据库、消息队列、第三方 API 集成以及您维护过的服务规模。",
    summaries: {
      junior:
        "初级 Node.js 开发工程师，熟悉 Express、TypeScript 和 MongoDB。我为一个外卖配送应用开发了 25 个接口的 API，并用 Swagger 编写了文档。我关注整洁架构和测试。",
      middle:
        "Node.js 开发工程师，4 年 NestJS、PostgreSQL 和 RabbitMQ 经验。我开发的集成服务对接了 12 个第三方 API，每天同步 50 万条记录，同步失败率降低 70%。",
      senior:
        "高级 Node.js 开发工程师，9 年高并发后端经验。我设计了基于 WebSocket 的实时消息平台，可同时保持 10 万个连接。我负责团队的架构和代码规范。",
    },
    tip: "重点写异步处理、消息队列和第三方集成经验。这是 Node.js 最能发挥价值的地方，也是面试中最常被问到的部分。",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "MongoDB", "RabbitMQ", "Docker"],
  },
  "dotnet-developer": {
    name: ".NET 开发工程师",
    nameInTitle: ".NET开发",
    recruiters:
      "招聘方首先看 C#、.NET 版本和 ASP.NET Core。然后关注 Entity Framework、SQL Server、Azure 经验，以及系统类型：企业级、金融还是 SaaS。",
    summaries: {
      junior:
        "初级 .NET 开发工程师，熟悉 C#、ASP.NET Core 和 Entity Framework。我为库存管理系统开发了基于 SQL Server 的 API，并用 xUnit 编写测试。希望深入 Azure 云服务方向。",
      middle:
        ".NET 开发工程师，5 年 ASP.NET Core 和 Azure 经验。我把一个遗留应用从 .NET Framework 迁移到 .NET 8，内存占用降低 45%。我为四个服务搭建了 Azure DevOps CI/CD 流程。",
      senior:
        "高级 .NET 开发工程师，12 年企业级解决方案经验。我设计了基于 Azure 微服务的保险平台架构，服务 200 万客户。我带领 7 名开发人员。",
    },
    tip: "如果做过从 .NET Framework 到新版 .NET 的迁移，一定要写上。这类经验需求很大，也说明您熟悉新旧两套体系。",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework", "SQL Server", "Azure", "xUnit", "Azure DevOps"],
  },
  "php-developer": {
    name: "PHP 开发工程师",
    nameInTitle: "PHP开发",
    recruiters:
      "招聘方首先看 PHP 版本和框架：Laravel 或 Symfony。然后关注 MySQL、队列、测试经验，以及电商、CMS 等具体项目。",
    summaries: {
      junior:
        "初级 PHP 开发工程师，熟悉 Laravel 和 MySQL。我为一个网店开发了后台管理系统，支持订单管理和 Excel 导出。我用 PHPUnit 写测试，遵循 PSR 规范。",
      middle:
        "PHP 开发工程师，5 年 Laravel 和 Vue.js 经验。我优化了一个拥有 5 万件商品的电商网站，通过缓存和索引将商品列表加载时间从 3 秒降到 0.8 秒。我接入过五个支付渠道。",
      senior:
        "高级 PHP 开发工程师，10 年 Symfony 和 Laravel 经验。我主导将一个遗留平台从 PHP 5 升级到 PHP 8.3，在 40 万用户无感知的情况下完成。我负责架构设计和团队代码评审。",
    },
    tip: "写明您目前使用的 PHP 版本。PHP 8 搭配 Laravel 或 Symfony，与没有框架的老项目给人的印象完全不同。",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "Vue.js"],
  },
  "flutter-developer": {
    name: "Flutter 开发工程师",
    nameInTitle: "Flutter开发",
    recruiters:
      "招聘方首先找已上架 App Store 和 Google Play 的应用链接。然后看状态管理（Bloc、Riverpod、Provider）、架构设计以及原生集成经验。",
    summaries: {
      junior:
        "初级 Flutter 开发工程师，熟悉 Dart、Bloc 和 Firebase。我在 Google Play 上架了一款习惯养成应用，下载量 5000 次，评分 4.6。我关注整洁架构和界面动画。",
      middle:
        "Flutter 开发工程师，4 年经验，在双平台上架过 6 款应用。我开发的外卖应用拥有 20 万用户，借助 Crashlytics 和 Widget 测试将崩溃率降到 0.2%。",
      senior:
        "高级 Flutter 开发工程师，7 年移动开发经验，其中 2 年为原生开发。我为一款拥有 100 万用户的银行应用设计了模块化架构，并用 Swift 和 Kotlin 编写了自研插件。我带领 5 人移动团队。",
    },
    tip: "附上应用商店的直接链接，并写明下载量和评分。对 Flutter 岗位来说，这是最有说服力的证明。",
    skills: ["Flutter", "Dart", "Bloc", "Riverpod", "Firebase", "REST API", "Clean Architecture", "CI/CD (Codemagic)"],
  },
  "ios-developer": {
    name: "iOS 开发工程师",
    nameInTitle: "iOS开发",
    recruiters:
      "招聘方首先看 Swift、SwiftUI 或 UIKit，以及已上架 App Store 的应用。然后关注架构（MVVM、TCA）、async/await 并发和无崩溃会话率等指标。",
    summaries: {
      junior:
        "初级 iOS 开发工程师，熟悉 Swift 和 SwiftUI。我在 App Store 上架了一款菜谱应用，拥有 3000 名用户，并用 Core Data 实现了离线模式。我遵循 Apple 人机界面指南。",
      middle:
        "iOS 开发工程师，5 年 Swift、UIKit 和 SwiftUI 经验。我将一款 15 万用户的应用迁移到 SwiftUI 和 async/await，无崩溃会话率提升到 99.8%。我用 Fastlane 实现了自动化构建。",
      senior:
        "高级 iOS 开发工程师，10 年经验。我为一款拥有 200 万用户的健康应用设计了模块化架构，启动时间缩短 50%。我领导 iOS 团队并制定质量标准。",
    },
    tip: "附上 App Store 链接和质量数据：无崩溃率、评分、启动时间。iOS 团队非常看重这些指标。",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "MVVM", "Fastlane"],
  },
  "android-developer": {
    name: "Android 开发工程师",
    nameInTitle: "Android开发",
    recruiters:
      "招聘方首先确认 Kotlin、Jetpack Compose 以及 Google Play 上的应用。然后关注架构（MVVM、Clean Architecture）、协程、依赖注入和稳定性指标。",
    summaries: {
      junior:
        "初级 Android 开发工程师，熟悉 Kotlin 和 Jetpack Compose。我在 Google Play 上架了一款个人记账应用，下载量 4000 次，用 Room 和 Retrofit 实现数据同步。我用 JUnit 编写单元测试。",
      middle:
        "Android 开发工程师，5 年 Kotlin、Coroutines 和 Hilt 经验。我将一款 30 万用户的出行应用界面迁移到 Jetpack Compose，ANR 减少 60%。",
      senior:
        "高级 Android 开发工程师，10 年经验。我为一款安装量 300 万的零售应用设计了多模块架构，APK 体积缩小 35%。我带领 6 名 Android 开发。",
    },
    tip: "写出 Android Vitals 指标（崩溃率、ANR）和应用体积。这说明您关注的是质量，而不仅仅是功能。",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "测试工程师",
    nameInTitle: "测试工程师",
    recruiters:
      "招聘方首先看您掌握的测试类型（功能、回归、接口、移动端）和工具：Jira、TestRail、Postman。然后看测试文档能力和可量化的结果，例如线上缺陷减少多少。",
    summaries: {
      junior:
        "初级测试工程师，有 Web 和移动端手工测试经验。我为一款预订应用在 TestRail 中编写了 300 条测试用例，在 Jira 中提交了 150 个缺陷。我会用 Postman 测试接口，掌握基础 SQL。",
      middle:
        "测试工程师，4 年金融科技产品测试经验。我搭建的回归测试流程使线上严重缺陷减少 50%。我负责接口、数据库和移动端测试。",
      senior:
        "高级测试工程师，8 年经验。我为 4 个产品团队制定质量策略并引入质量指标，发布周期从 4 周缩短到 2 周。我负责培养测试人员并制定流程。",
    },
    tip: "量化您的贡献：测试用例数量、发布前发现的缺陷数、线上事故的减少比例。",
    skills: ["手工测试", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "接口测试", "移动端测试"],
  },
  "qa-automation-engineer": {
    name: "自动化测试工程师",
    nameInTitle: "自动化测试工程师",
    recruiters:
      "招聘方首先看编程语言和自动化框架：Selenium、Playwright、Cypress 或 Appium。然后关注与 CI/CD 的集成，以及自动化让回归测试缩短了多少时间。",
    summaries: {
      junior:
        "初级自动化测试工程师，熟悉 Java 和 Selenium WebDriver。我为一个网店自动化了 120 个回归用例，并集成到 Jenkins 中。我使用 Page Object 模式。",
      middle:
        "自动化测试工程师，4 年 Playwright 和 TypeScript 经验。我从零搭建了包含 800 个用例的端到端测试框架，在 GitHub Actions 中将回归时间从 3 天缩短到 40 分钟。",
      senior:
        "高级自动化测试工程师，9 年经验。我为 5 个团队制定了覆盖 Web、移动端和接口的自动化策略，关键场景覆盖率达 85%。我带领 4 名自动化工程师。",
    },
    tip: "写出自动化节省了多少时间，以及稳定用例的比例。一个充满不稳定用例的框架不会给人留下好印象。",
    skills: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript", "REST Assured", "Appium", "Jenkins/GitHub Actions"],
  },
  "devops-engineer": {
    name: "DevOps 工程师",
    nameInTitle: "DevOps工程师",
    recruiters:
      "招聘方首先看云平台（AWS、GCP、Azure）、Kubernetes 和基于 Terraform 的基础设施即代码。然后关注 CI/CD、监控以及可量化的结果：可用性、部署频率、成本节约。",
    summaries: {
      junior:
        "初级 DevOps 工程师，熟悉 Docker、GitHub Actions 和 AWS。我为 6 个服务配置了 CI/CD 流水线，部署时间从 40 分钟缩短到 8 分钟。我持有 AWS Cloud Practitioner 认证。",
      middle:
        "DevOps 工程师，5 年 Kubernetes、Terraform 和 AWS 经验。我用 Terraform 将一个 SaaS 产品的基础设施迁移到 EKS，云账单降低 35%。我用 Prometheus 和 Grafana 搭建了监控体系。",
      senior:
        "高级 DevOps 工程师，10 年云平台经验。我为 40 个团队搭建了内部平台，支持每日部署，可用性达 99.99%。我负责基础设施和安全策略。",
    },
    tip: "多谈成本和可靠性：在云上节省了多少钱、保障了多高的可用性、部署时间缩短了多少。这些是 DevOps 简历中最有分量的数字。",
    skills: ["Kubernetes", "Terraform", "AWS", "Docker", "GitHub Actions", "Prometheus", "Grafana", "Linux"],
  },
  "data-analyst": {
    name: "数据分析师",
    nameInTitle: "数据分析师",
    recruiters:
      "招聘方首先确认 SQL 能力和 BI 工具：Tableau、Power BI 或 Looker。然后寻找推动了业务决策的分析案例，以及 Python 或 A/B 测试经验。",
    summaries: {
      junior:
        "初级数据分析师，熟悉 SQL、Python（pandas）和 Power BI。我为 12 家门店搭建了销售看板，替代了手工 Excel 报表，每周为团队节省 8 小时。",
      middle:
        "数据分析师，4 年电商行业经验。我分析购买漏斗并提出结算流程改进方案，使转化率提升 9%。我负责设计和评估 A/B 测试，维护 20 个 Tableau 看板。",
      senior:
        "高级数据分析师，8 年经验。我为一款 200 万用户的应用搭建了产品指标体系，并带领 4 名分析师。我的留存分析决定了两个季度的产品路线图。",
    },
    tip: "每个分析案例都写出它带来的业务决策和量化效果。招聘方看重的是影响力，而不只是好看的看板。",
    skills: ["SQL", "Python", "pandas", "Tableau", "Power BI", "Excel", "A/B 测试", "统计学"],
  },
  "data-scientist": {
    name: "数据科学家",
    nameInTitle: "数据科学家",
    recruiters:
      "招聘方首先看 Python、机器学习库以及您上线过的模型类型。然后关注模型质量指标，更重要的是模型对业务的影响。",
    summaries: {
      junior:
        "初级数据科学家，熟悉 Python、scikit-learn 和 PyTorch。我训练了一个评论分类模型，F1 达到 0.89，并用 FastAPI 部署为接口服务。我拥有应用数学硕士学位。",
      middle:
        "数据科学家，4 年推荐系统经验。我为一个电商平台开发的推荐模型使客单价提升 11%。我使用 MLflow 和 Docker 将模型部署到生产环境。",
      senior:
        "高级数据科学家，9 年机器学习和大模型经验。我主导开发的反欺诈系统使损失降低 40%，还搭建了基于 RAG 的智能客服助手。我领导 5 人机器学习团队。",
    },
    tip: "不要只写模型指标（准确率、F1），还要说明模型给业务带来了什么改变。一个上线的模型胜过十个 Notebook。",
    skills: ["Python", "scikit-learn", "PyTorch", "pandas", "SQL", "MLflow", "大模型/RAG", "统计学"],
  },
  "data-engineer": {
    name: "数据工程师",
    nameInTitle: "数据工程师",
    recruiters:
      "招聘方首先看 SQL、Python、调度和建模工具（Airflow、dbt）以及数据仓库：Snowflake、BigQuery 或 Redshift。然后关注数据量和数据管道的稳定性。",
    summaries: {
      junior:
        "初级数据工程师，熟悉 SQL、Python 和 Airflow。我搭建的 ETL 管道每小时从 5 个数据源向 PostgreSQL 加载数据。我对数据建模和数据质量很感兴趣。",
      middle:
        "数据工程师，4 年 Spark、Airflow 和 BigQuery 经验。我将 200 条数据管道迁移到 dbt，数仓更新时间从 6 小时缩短到 45 分钟。我还引入了数据质量测试。",
      senior:
        "高级数据工程师，9 年经验。我为一家物流公司设计了数据平台，基于 Kafka、Spark 和 Snowflake 每天处理 5 TB 数据。我带领 6 名工程师，负责湖仓一体架构设计。",
    },
    tip: "写明数据量（每天 GB 或 TB）、管道数量和更新时效。在数据工程岗位，规模是最先被关注的。",
    skills: ["SQL", "Python", "Apache Spark", "Airflow", "dbt", "Snowflake", "BigQuery", "Kafka"],
  },
  "product-manager": {
    name: "产品经理",
    nameInTitle: "产品经理",
    recruiters:
      "招聘方首先看您负责过的产品以及推动的指标：留存、转化、收入。然后关注用户研究、A/B 测试以及与研发和设计的协作。",
    summaries: {
      junior:
        "初级产品经理，曾在一款健身应用担任分析师。我基于 25 次用户访谈上线了每周挑战功能，使 30 日留存提升 6 个百分点。",
      middle:
        "产品经理，5 年 C 端产品经验。我重新设计了一款理财应用的新手引导，激活率从 32% 提升到 48%。我管理 8 人团队的需求池，用数据做优先级决策。",
      senior:
        "高级产品经理，10 年 B2B SaaS 经验。我负责的产品线在 3 年内年度经常性收入从 100 万美元增长到 600 万美元。我制定产品愿景和战略，管理 3 名产品经理。",
    },
    tip: "每项成果都要写出产品指标的前后变化。只写「上线了某功能」而没有结果，对产品岗招聘方来说毫无意义。",
    skills: ["产品探索", "A/B 测试", "Amplitude", "SQL", "Jira", "产品路线图", "用户访谈", "单位经济模型"],
  },
  "project-manager": {
    name: "IT 项目经理",
    nameInTitle: "IT项目经理",
    recruiters:
      "招聘方首先确认您管理过的团队和项目规模、使用的方法论（Scrum、Kanban），以及是否按时按预算交付。客户沟通和风险管理能力同样重要。",
    summaries: {
      junior:
        "初级项目经理，曾在软件外包公司担任项目协调。我管理过 4 个 Web 项目，团队规模 5 人，全部按时交付。我熟悉 Jira、Confluence 和 Scrum。",
      middle:
        "项目经理，5 年外包行业经验。我同时管理 3 个项目，总预算 120 万美元，分布式团队共 25 人。通过加强风险管理，交付延期减少 30%。",
      senior:
        "高级项目经理，11 年经验。我主导了 ERP 系统在 8 个国家的实施，团队 60 人，预算 500 万美元。我搭建了公司的项目管理办公室（PMO），并培养了 6 名项目经理。",
    },
    tip: "一定写清规模：团队人数、预算、周期、干系人数量，以及是否按期交付。这些是招聘方最先寻找的信息。",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "风险管理", "预算管理", "干系人管理", "PMP"],
  },
  "ui-ux-designer": {
    name: "UI/UX 设计师",
    nameInTitle: "UI/UX设计师",
    recruiters:
      "招聘方首先打开作品集，没有作品集的简历几乎不会被细看。然后寻找包含完整流程（调研、原型、测试）和量化结果的案例，并确认您熟练使用 Figma 和设计系统。",
    summaries: {
      junior:
        "初级 UI/UX 设计师，熟悉 Figma 和原型设计。我在 8 轮可用性测试后重新设计了一款问诊预约应用的注册流程，流失率降低 20%。作品集中有 4 个完整案例。",
      middle:
        "UI/UX 设计师，4 年 SaaS 产品经验。我在 Figma 中搭建了包含 120 个组件的设计系统，界面开发效率提升 30%。每个迭代我都会进行用户研究和可用性测试。",
      senior:
        "高级 UI/UX 设计师，9 年经验。我主导了一款 150 万用户银行应用的改版，应用评分从 3.9 提升到 4.7。我领导 4 人设计团队，负责用户体验战略。",
    },
    tip: "把作品集链接放在简历第一行。每个案例都展示问题、过程和量化结果，而不只是漂亮的界面。",
    skills: ["Figma", "原型设计", "用户研究", "可用性测试", "设计系统", "线框图", "交互设计", "无障碍设计"],
  },
  "business-analyst": {
    name: "业务分析师",
    nameInTitle: "业务分析师",
    recruiters:
      "招聘方首先看需求收集和文档编写经验：用户故事、BPMN、UML。然后关注行业领域（金融科技、物流、电商）、SQL 能力以及与干系人的沟通。",
    summaries: {
      junior:
        "初级业务分析师，有需求文档编写和 BPMN 建模经验。我为仓储管理系统编写了 60 个带验收标准的用户故事。我会用 SQL 核对数据。",
      middle:
        "业务分析师，5 年金融科技经验。我分析并重新设计了贷款审批流程，客户等待时间从 3 天缩短到 4 小时。我使用 Jira、Confluence 和 BPMN 流程图。",
      senior:
        "高级业务分析师，10 年企业系统经验。我负责覆盖 12 个国家的物流平台需求分析，协调了 30 位干系人的需求。我带领 4 名分析师并制定文档规范。",
    },
    tip: "用数字说明您的分析如何改变了流程：节省的时间、避免的错误、降低的成本。同时写明行业领域，这在该岗位中很受重视。",
    skills: ["需求管理", "用户故事", "BPMN", "UML", "SQL", "Jira", "Confluence", "流程分析"],
  },
  "it-recruiter": {
    name: "IT 招聘专员",
    nameInTitle: "IT招聘专员",
    recruiters:
      "看 IT 招聘专员的简历时，首先看您招过哪些技术岗位、每年关闭多少职位。然后关注招聘周期等指标、寻访工具以及对技术的理解程度。",
    summaries: {
      junior:
        "初级 IT 招聘专员，在猎头公司有 1 年经验。我通过 LinkedIn 和 GitHub 寻访，成功关闭了 18 个开发和测试职位。我了解不同技术栈的区别，能完成初步技术筛选。",
      middle:
        "IT 招聘专员，4 年产品公司内部招聘经验。我每年关闭 45 个职位，包括高级后端和 DevOps 岗位，并将招聘周期从 45 天缩短到 28 天。",
      senior:
        "高级 IT 招聘专员，8 年经验。我从零搭建了一家初创公司的招聘体系，公司在 2 年内从 30 人发展到 200 人。我负责雇主品牌建设，并带领 3 名招聘专员。",
    },
    tip: "用招聘数据说话：关闭的职位数、招聘周期、Offer 接受率、招到的岗位类型。这些就是您的业务成果。",
    skills: ["人才寻访", "LinkedIn Recruiter", "布尔搜索", "ATS", "技术初筛", "雇主品牌", "招聘指标", "薪资谈判"],
  },
};

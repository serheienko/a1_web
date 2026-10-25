// lib/seo/job-role.ts
//
// 01.10.2026 (SEO, по анализу ключевых слов: «вакансії qa», «тестувальник
// робота», «робота дизайнер», «project manager вакансії»). Профессия
// вакансии по ЗАГОЛОВКУ -- тем же способом, что уровень (lib/seo/job-level.ts):
// описание не смотрим, там названия чужих ролей встречаются в тексте про
// команду. Вакансия может попасть в несколько профессий («Product Designer
// & Researcher»), поэтому здесь список, а не одно значение.
//
// 10.10.2026 (Александр, разбор SEO). Было девять профессий на 31 тысячу
// вакансий -- посадочных страниц почти не было, хотя ищут люди именно их
// («робота рекрутером», «вакансії seo», «sap консультант»). Стало сорок
// четыре. Порог прежний: ниже MIN_SEGMENT_POSTS страницы просто нет, так
// что лишние профессии не создают пустых страниц -- они молча не живут,
// пока вакансий мало, и появляются сами, когда их набирается достаточно.
//
// ТЕХНОЛОГИИ СЮДА НЕ ДОБАВЛЯЕМ. «Java», «React», «Python» -- это
// посадочные по стеку (/jobs/stack/<slug>, lib/seo/tech-landings.ts).
// Профессия -- чем человек занимается, стек -- чем он это делает. Если
// завести и то и другое как профессию, две наши же страницы начнут
// бороться за один запрос.
//
// Границы слова заданы вручную: \b в JS не понимает кириллицу.

export type JobRole =
  | "qa" | "frontend" | "backend" | "fullstack" | "mobile" | "devops" | "data" | "design" | "pm"
  | "ai" | "ba" | "architect" | "lead" | "security" | "support" | "dba" | "network"
  | "embedded" | "gamedev" | "blockchain" | "sap" | "salesforce" | "erp"
  | "recruiter" | "marketing" | "ppc" | "seo" | "aso" | "smm" | "content" | "techwriter"
  | "sales" | "account" | "affiliate" | "finance" | "legal" | "office" | "clevel"
  | "devrel" | "motion" | "localization" | "moderation" | "education" | "ops"
  | "software" | "hardware" | "military";

export type RoleInfo = {
  slug: JobRole;
  /** Подпись в ссылках и заголовках (английская, как в самих вакансиях). */
  label: string;
  /** Украинское название профессии для заголовков: «QA та тестування». */
  uk: string;
  ru: string;
  /** Английское название направления для заголовков нелокализованных языков. */
  en: string;
  /** Что люди пишут в поиске -- идёт в описание страницы. */
  uk_hint: string;
  /** Заголовок страницы в выдаче (<title>), украинский. */
  titleUk: string;
  rx: RegExp;
};

const B = "(^|[^a-zа-яіїєґ0-9])";
const E = "([^a-zа-яіїєґ0-9]|$)";
const rx = (body: string) => new RegExp(`${B}(${body})${E}`, "i");

export const ROLES: RoleInfo[] = [
  {
    slug: "qa",
    label: "QA",
    uk: "QA та тестування",
    ru: "QA и тестирование",
    en: "QA & testing",
    uk_hint: "QA, тестувальник, QA automation, SDET",
    titleUk: "Вакансії QA — робота тестувальником (QA, QA automation)",
    rx: rx("qa|qe|sdet|quality assurance|quality engineer|test engineer|test automation|software tester|tester|developer in test|engineer in test|тестувальник[а-яіїєґ]*|тестировщик[а-яіїєґ]*"),
  },
  {
    slug: "frontend",
    label: "Frontend",
    uk: "Frontend-розробка",
    ru: "Frontend-разработка",
    en: "Frontend",
    uk_hint: "Frontend, React, Vue, Angular, JavaScript",
    titleUk: "Frontend вакансії — робота Frontend-розробником",
    rx: rx("front[- ]?end|react developer|react engineer|vue developer|angular developer|ui developer"),
  },
  {
    slug: "backend",
    label: "Backend",
    uk: "Backend-розробка",
    ru: "Backend-разработка",
    en: "Backend",
    uk_hint: "Backend, Java, Python, Node.js, .NET, Go",
    titleUk: "Backend вакансії — робота Backend-розробником",
    rx: rx("back[- ]?end|server[- ]side|(java|python|node\\.?js|golang|go|\\.net|c#|php|ruby|scala|elixir|kotlin backend|django|laravel|symfony) (developer|engineer|programmer)|розробник[а-яіїєґ]* (python|java|php|\\.net)"),
  },
  {
    slug: "fullstack",
    label: "Fullstack",
    uk: "Fullstack-розробка",
    ru: "Fullstack-разработка",
    en: "Fullstack",
    uk_hint: "Fullstack, full-stack developer",
    titleUk: "Fullstack вакансії — робота Fullstack-розробником",
    rx: rx("full[- ]?stack"),
  },
  {
    slug: "mobile",
    label: "Mobile",
    uk: "Мобільна розробка",
    ru: "Мобильная разработка",
    en: "Mobile (iOS, Android)",
    uk_hint: "iOS, Android, Flutter, React Native, Swift, Kotlin",
    titleUk: "Мобільна розробка: вакансії iOS, Android, Flutter",
    rx: rx("ios|android|flutter|react native|swift|kotlin multiplatform|mobile (developer|engineer|dev|qa)|мобільн[а-яіїєґ]* розроб[а-яіїєґ]*"),
  },
  {
    slug: "devops",
    label: "DevOps",
    uk: "DevOps та інфраструктура",
    ru: "DevOps и инфраструктура",
    en: "DevOps & infrastructure",
    uk_hint: "DevOps, SRE, Cloud, Kubernetes, системний адміністратор",
    titleUk: "DevOps вакансії — робота DevOps, SRE, Cloud",
    rx: rx("devops|sre|site reliability|platform engineer|cloud engineer|infrastructure engineer|systems? administrator|sysadmin|devsecops|linux (engineer|administrator)|системн[а-яіїєґ]* адміністратор[а-яіїєґ]*|системн[а-яіїєґ]* администратор[а-яіїєґ]*"),
  },
  {
    slug: "data",
    label: "Data",
    uk: "Дані та аналітика",
    ru: "Данные и аналитика",
    en: "Data & analytics",
    uk_hint: "Data Analyst, Data Scientist, Data Engineer, BI, аналітик даних",
    titleUk: "Вакансії Data — Data Analyst, Data Scientist, Data Engineer",
    rx: rx("data (scientist|analyst|engineer|architect)|data science|databricks|bi (developer|analyst|engineer)|analytics (engineer|lead|manager)|business intelligence|(product|web|marketing|growth|bi|reporting) analyst|аналітик даних|аналитик данных"),
  },
  {
    slug: "design",
    label: "Design",
    uk: "UI/UX та дизайн",
    ru: "UI/UX и дизайн",
    en: "UI/UX design",
    uk_hint: "UI/UX дизайнер, Product Designer, графічний дизайнер",
    titleUk: "Вакансії UI/UX дизайнера — робота дизайнером в IT",
    rx: rx("designer|ux|ui/ux|ux/ui|product design|design lead|art director|(2d|3d|game|concept|ui) artist|illustrator|дизайнер[а-яіїєґ]*|ілюстратор[а-яіїєґ]*"),
  },
  {
    slug: "pm",
    label: "Project & Product",
    uk: "Project та Product Manager",
    ru: "Project и Product Manager",
    en: "Project & product management",
    uk_hint: "Project Manager, Product Manager, Product Owner, Scrum Master",
    titleUk: "Вакансії Project та Product Manager — робота в IT",
    rx: rx("project manager|product manager|product owner|product lead|head of product|scrum master|delivery manager|program manager|pmo|керівник[а-яіїєґ]* проєкт[а-яіїєґ]*|керівник[а-яіїєґ]* проект[а-яіїєґ]*|проджект[а-яіїєґ]*|продакт[а-яіїєґ]*"),
  },
  {
    slug: "ai",
    label: "AI & ML",
    uk: "AI та машинне навчання",
    ru: "AI и машинное обучение",
    en: "AI & machine learning",
    uk_hint: "ML Engineer, AI Engineer, LLM, Computer Vision, NLP",
    titleUk: "Вакансії AI та ML — робота ML Engineer, AI Engineer",
    rx: rx("machine learning|ml engineer|mlops|ai engineer|ai developer|ai researcher|deep learning|computer vision|nlp engineer|llm|generative ai|prompt engineer|машинного навчання|штучного інтелекту"),
  },
  {
    slug: "ba",
    label: "Business Analyst",
    uk: "Бізнес- та системний аналіз",
    ru: "Бизнес- и системный анализ",
    en: "Business analysis",
    uk_hint: "Business Analyst, System Analyst, бізнес-аналітик",
    titleUk: "Вакансії бізнес-аналітика — Business Analyst, System Analyst",
    rx: rx("business analyst|systems? analyst|бізнес[- ]?аналітик[а-яіїєґ]*|бизнес[- ]?аналитик[а-яіїєґ]*|системний аналітик[а-яіїєґ]*|системный аналитик[а-яіїєґ]*"),
  },
  {
    slug: "architect",
    label: "Architect",
    uk: "Архітектура ПЗ",
    ru: "Архитектура ПО",
    en: "Software architecture",
    uk_hint: "Solution Architect, Software Architect, Cloud Architect",
    titleUk: "Вакансії архітектора — Solution, Software, Cloud Architect",
    rx: rx("solution architect|software architect|enterprise architect|technical architect|cloud architect|system architect|архітектор[а-яіїєґ]*|архитектор[а-яіїєґ]*"),
  },
  {
    slug: "lead",
    label: "Team & Tech Lead",
    uk: "Тимлід та інженерний менеджмент",
    ru: "Тимлид и инженерный менеджмент",
    en: "Team & engineering leadership",
    uk_hint: "Team Lead, Tech Lead, Engineering Manager",
    titleUk: "Вакансії Team Lead та Tech Lead — робота тимлідом",
    rx: rx("team lead|tech lead|technical lead|engineering manager|software development manager|head of engineering|head of development|head of software|vp of engineering|тимлід[а-яіїєґ]*|тимлид[а-яіїєґ]*"),
  },
  {
    slug: "security",
    label: "Security",
    uk: "Інформаційна безпека",
    ru: "Информационная безопасность",
    en: "Information security",
    uk_hint: "Security Engineer, AppSec, Pentester, SOC, CISO",
    titleUk: "Вакансії з кібербезпеки — Security Engineer, Pentester, SOC",
    rx: rx("security (engineer|analyst|specialist|architect|consultant)|cyber ?security|information security|infosec|appsec|application security|penetration test[a-z]*|pentester|soc analyst|ciso|кібербезпек[а-яіїєґ]*|інформаційної безпеки|информационной безопасности"),
  },
  {
    slug: "support",
    label: "Support",
    uk: "Технічна підтримка",
    ru: "Техническая поддержка",
    en: "Technical & customer support",
    uk_hint: "Technical Support, Customer Support, Helpdesk",
    titleUk: "Вакансії технічної підтримки — Support, Helpdesk",
    rx: rx("technical support|tech support|customer support|support (engineer|specialist|agent|manager)|help ?desk|service desk|технічної підтримки|технической поддержки|служби підтримки"),
  },
  {
    slug: "dba",
    label: "Database",
    uk: "Бази даних",
    ru: "Базы данных",
    en: "Databases",
    uk_hint: "DBA, Database Engineer, PostgreSQL, Oracle",
    titleUk: "Вакансії DBA — адміністратор баз даних",
    rx: rx("dba|database (administrator|engineer|developer|architect)|адміністратор баз даних|администратор баз данных"),
  },
  {
    slug: "network",
    label: "Network",
    uk: "Мережі та телеком",
    ru: "Сети и телеком",
    en: "Networking & telecom",
    uk_hint: "Network Engineer, NOC, Cisco, телеком",
    titleUk: "Вакансії мережевого інженера — Network Engineer, NOC",
    rx: rx("network (engineer|administrator|architect|specialist)|noc engineer|telecom engineer|мережевий інженер[а-яіїєґ]*|сетевой инженер[а-яіїєґ]*"),
  },
  {
    slug: "embedded",
    label: "Embedded",
    uk: "Embedded та firmware",
    ru: "Embedded и firmware",
    en: "Embedded & firmware",
    uk_hint: "Embedded, Firmware, IoT, FPGA, hardware",
    titleUk: "Вакансії Embedded — firmware, IoT, hardware",
    rx: rx("embedded|firmware|fpga|rtos|iot engineer|hardware engineer|електронік[а-яіїєґ]*"),
  },
  {
    slug: "gamedev",
    label: "Game dev",
    uk: "Геймдев",
    ru: "Геймдев",
    en: "Game development",
    uk_hint: "Game Developer, Unity, Unreal, Game Designer",
    titleUk: "Вакансії в геймдеві — Unity, Unreal, Game Designer",
    rx: rx("game (developer|designer|artist|producer|engineer)|gameplay|unity developer|unreal|level designer|геймдизайнер[а-яіїєґ]*"),
  },
  {
    slug: "blockchain",
    label: "Blockchain",
    uk: "Blockchain та Web3",
    ru: "Blockchain и Web3",
    en: "Blockchain & Web3",
    uk_hint: "Blockchain, Solidity, Web3, smart contracts",
    titleUk: "Вакансії Blockchain та Web3 — Solidity, smart contracts",
    rx: rx("blockchain|solidity|web3|smart contract[a-z]*|defi|crypto developer"),
  },
  {
    slug: "sap",
    label: "SAP",
    uk: "SAP",
    ru: "SAP",
    en: "SAP",
    uk_hint: "SAP consultant, ABAP, SAP FI/CO, SAP MM",
    titleUk: "Вакансії SAP — консультант, ABAP, SAP FI/CO",
    rx: rx("sap|abap"),
  },
  {
    slug: "salesforce",
    label: "Salesforce",
    uk: "Salesforce",
    ru: "Salesforce",
    en: "Salesforce",
    uk_hint: "Salesforce Developer, Admin, Consultant, Apex",
    titleUk: "Вакансії Salesforce — developer, admin, consultant",
    rx: rx("salesforce|apex developer"),
  },
  {
    slug: "erp",
    label: "ERP & 1C",
    uk: "ERP та 1С",
    ru: "ERP и 1С",
    en: "ERP & 1C",
    uk_hint: "1С, ERP, Odoo, NetSuite, Dynamics, Bitrix",
    titleUk: "Вакансії ERP та 1С — Odoo, NetSuite, Dynamics",
    rx: rx("erp|1c|1с|odoo|netsuite|dynamics 365|ms dynamics|bitrix|бітрікс|битрикс"),
  },
  {
    slug: "recruiter",
    label: "Recruiting & HR",
    uk: "Рекрутинг та HR",
    ru: "Рекрутинг и HR",
    en: "Recruiting & HR",
    uk_hint: "IT Recruiter, Talent Acquisition, Sourcer, HR, People Partner",
    titleUk: "Вакансії рекрутера та HR — IT Recruiter, Talent Acquisition",
    rx: rx("recruiter|recruitment|talent acquisition|sourcer|hr (manager|generalist|specialist|director|lead|partner)|hrbp|hr business partner|people partner|people operations|c&b|compensation|рекрутер[а-яіїєґ]*|рекрутинг[а-яіїєґ]*|hr[- ]?менеджер[а-яіїєґ]*"),
  },
  {
    slug: "marketing",
    label: "Marketing",
    uk: "Маркетинг",
    ru: "Маркетинг",
    en: "Marketing",
    uk_hint: "Marketing Manager, Growth, Brand, CMO",
    titleUk: "Вакансії в маркетингу — Marketing Manager, Growth, Brand",
    rx: rx("marketing (manager|specialist|lead|director|analyst)|head of marketing|growth (manager|marketer|lead)|brand manager|cmo|product marketing|crm (manager|marketing|specialist)|retention (manager|marketing|specialist)|lifecycle (manager|marketing)|email marketing|маркетолог[а-яіїєґ]*|маркетинг[а-яіїєґ]*"),
  },
  {
    slug: "ppc",
    label: "PPC & media buying",
    uk: "PPC та медіабаїнг",
    ru: "PPC и медиабаинг",
    en: "PPC & media buying",
    uk_hint: "PPC, Media Buyer, UA manager, Google Ads, Facebook Ads",
    titleUk: "Вакансії PPC та медіабаєра — Google Ads, Facebook Ads",
    rx: rx("ppc|media ?buyer|performance marketing|paid (ads|media|social)|user acquisition|ua manager|google ads|facebook ads|traffic manager|медіабаєр[а-яіїєґ]*|медиабайер[а-яіїєґ]*"),
  },
  {
    slug: "seo",
    label: "SEO",
    uk: "SEO",
    ru: "SEO",
    en: "SEO",
    uk_hint: "SEO specialist, лінкбілдер, SEO manager",
    titleUk: "Вакансії SEO — SEO-спеціаліст, лінкбілдер",
    rx: rx("seo|link ?build[a-z]*|лінкбілдер[а-яіїєґ]*|линкбилдер[а-яіїєґ]*"),
  },
  {
    slug: "aso",
    label: "ASO",
    uk: "ASO",
    ru: "ASO",
    en: "ASO",
    uk_hint: "ASO manager, App Store Optimization",
    titleUk: "Вакансії ASO — App Store Optimization",
    rx: rx("aso|app store optimization"),
  },
  {
    slug: "smm",
    label: "SMM & community",
    uk: "SMM та спільноти",
    ru: "SMM и сообщества",
    en: "SMM & community",
    uk_hint: "SMM, Social Media, Community Manager",
    titleUk: "Вакансії SMM та Community Manager",
    rx: rx("smm|social media (manager|marketing|specialist)|community manager|комьюніті[- ]?менеджер[а-яіїєґ]*|ком.юніті[- ]?менеджер[а-яіїєґ]*"),
  },
  {
    slug: "content",
    label: "Content & copywriting",
    uk: "Контент та копірайтинг",
    ru: "Контент и копирайтинг",
    en: "Content & copywriting",
    uk_hint: "Copywriter, Content Manager, Content Writer",
    titleUk: "Вакансії копірайтера та контент-менеджера",
    rx: rx("copywriter|copywriting|editor|content (manager|writer|specialist|editor|marketer|creator)|копірайтер[а-яіїєґ]*|копирайтер[а-яіїєґ]*|редактор[а-яіїєґ]*|контент[- ]?менеджер[а-яіїєґ]*"),
  },
  {
    slug: "techwriter",
    label: "Technical writer",
    uk: "Технічний письменник",
    ru: "Технический писатель",
    en: "Technical writing",
    uk_hint: "Technical Writer, документація",
    titleUk: "Вакансії Technical Writer — документація в IT",
    rx: rx("technical writer|technical writing|documentation (engineer|specialist|manager)|технічний письменник[а-яіїєґ]*|технический писатель[а-яіїєґ]*"),
  },
  {
    slug: "sales",
    label: "Sales",
    uk: "Продажі",
    ru: "Продажи",
    en: "Sales",
    uk_hint: "Sales Manager, Account Executive, BDM, Lead Generation",
    titleUk: "Вакансії в продажах — Sales Manager, BDM, Lead Generation",
    rx: rx("sales (manager|representative|executive|development|director|lead)|account executive|business development|bdm|lead generation|lead gen|sdr|менеджер з продажів|менеджер по продажам"),
  },
  {
    slug: "account",
    label: "Account & CS",
    uk: "Акаунт-менеджмент та Customer Success",
    ru: "Аккаунт-менеджмент и Customer Success",
    en: "Account management & customer success",
    uk_hint: "Account Manager, Customer Success, Client Manager",
    titleUk: "Вакансії Account Manager та Customer Success",
    rx: rx("account manager|customer success|client (manager|partner|success)|key account|vip manager|акаунт[- ]?менеджер[а-яіїєґ]*|аккаунт[- ]?менеджер[а-яіїєґ]*"),
  },
  {
    slug: "affiliate",
    label: "Affiliate",
    uk: "Афіліейт-маркетинг",
    ru: "Аффилейт-маркетинг",
    en: "Affiliate marketing",
    uk_hint: "Affiliate Manager, CPA, партнерські мережі",
    titleUk: "Вакансії Affiliate Manager — CPA, партнерський маркетинг",
    rx: rx("affiliate|cpa (manager|network)|partner manager|partnership manager|афіліейт[а-яіїєґ]*|аффилейт[а-яіїєґ]*"),
  },
  {
    slug: "finance",
    label: "Finance",
    uk: "Фінанси та бухгалтерія",
    ru: "Финансы и бухгалтерия",
    en: "Finance & accounting",
    uk_hint: "Financial Analyst, Accountant, Payroll, Controller",
    titleUk: "Вакансії у фінансах — фінансовий аналітик, бухгалтер",
    rx: rx("financial (analyst|controller|manager)|finance (manager|director|specialist)|accountant|accounting|payroll|bookkeeper|cfo|treasury|risk (manager|analyst)|fraud|investment analyst|бухгалтер[а-яіїєґ]*|фінансовий аналітик[а-яіїєґ]*|финансовый аналитик[а-яіїєґ]*"),
  },
  {
    slug: "legal",
    label: "Legal & compliance",
    uk: "Юристи та комплаєнс",
    ru: "Юристы и комплаенс",
    en: "Legal & compliance",
    uk_hint: "Lawyer, Legal Counsel, Compliance, AML",
    titleUk: "Вакансії юриста та комплаєнс — Legal Counsel, AML",
    rx: rx("lawyer|legal (counsel|manager|specialist|advisor)|compliance (manager|officer|specialist|analyst)|aml|kyc|юрист[а-яіїєґ]*"),
  },
  {
    slug: "office",
    label: "Office & admin",
    uk: "Офіс та адміністрування",
    ru: "Офис и администрирование",
    en: "Office & administration",
    uk_hint: "Office Manager, Executive Assistant, асистент",
    titleUk: "Вакансії офіс-менеджера та асистента",
    rx: rx("office (manager|administrator)|executive assistant|personal assistant|administrative assistant|офіс[- ]?менеджер[а-яіїєґ]*|офис[- ]?менеджер[а-яіїєґ]*"),
  },
  {
    slug: "clevel",
    label: "C-level",
    uk: "Топменеджмент",
    ru: "Топ-менеджмент",
    en: "Executive & C-level",
    uk_hint: "CEO, CTO, COO, VP, Head of, Director",
    titleUk: "Вакансії топменеджменту — CEO, CTO, VP, Head of",
    rx: rx("ceo|cto|coo|cpo|cio|cmo|cfo|cro|chief [a-z]+ officer|vp of|vice president|managing director|general manager|директор[а-яіїєґ]*"),
  },
  {
    slug: "software",
    label: "Software Engineer",
    uk: "Розробка ПЗ",
    ru: "Разработка ПО",
    en: "Software engineering",
    uk_hint: "Software Engineer, програміст, розробник ПЗ",
    titleUk: "Вакансії Software Engineer — робота програмістом",
    rx: rx("software (engineer|developer)|programmer|програміст[а-яіїєґ]*|программист[а-яіїєґ]*|розробник[а-яіїєґ]* (пз|програмного)|(c\\+\\+|c/c\\+\\+|rust) (developer|engineer)"),
  },
  {
    slug: "hardware",
    label: "Hardware & mechanical",
    uk: "Інженерія та конструювання",
    ru: "Инженерия и конструирование",
    en: "Hardware & mechanical engineering",
    uk_hint: "Інженер-конструктор, Mechanical, Electronics, CAD, RF",
    titleUk: "Вакансії інженера-конструктора — Mechanical, Electronics, CAD",
    rx: rx("mechanical engineer|electrical engineer|electronics (engineer|design)|design engineer|cad|solidworks|pcb|rf engineer|інженер[а-яіїєґ]*[- ]конструктор[а-яіїєґ]*|конструктор[а-яіїєґ]*|інженер[а-яіїєґ]*[- ]проєктувальник[а-яіїєґ]*|електронщик[а-яіїєґ]*"),
  },
  {
    slug: "military",
    label: "Defense & military",
    uk: "Сили оборони та БпЛА",
    ru: "Силы обороны и БПЛА",
    en: "Defense, military & drones",
    uk_hint: "Оператор БпЛА, інженер БпЛА, військові посади, FPV",
    titleUk: "Вакансії в силах оборони — оператор БпЛА, інженер, військова служба",
    rx: rx("бпла|бпак|безпілотн[а-яіїєґ]*|uav|uas|fpv|drone|військов[а-яіїєґ]*|військовослужбов[а-яіїєґ]*|зсу|командир[а-яіїєґ]*|розвідник[а-яіїєґ]*|нрк|ardupilot"),
  },
  {
    slug: "devrel",
    label: "DevRel",
    uk: "DevRel та спільнота",
    ru: "DevRel и сообщество",
    en: "Developer relations",
    uk_hint: "Developer Advocate, Developer Relations",
    titleUk: "Вакансії DevRel — Developer Advocate",
    rx: rx("devrel|developer advocate|developer relations|developer experience"),
  },
  {
    slug: "motion",
    label: "Motion & video",
    uk: "Моушн та відео",
    ru: "Моушн и видео",
    en: "Motion & video",
    uk_hint: "Motion Designer, Video Editor, 3D Artist, аніматор",
    titleUk: "Вакансії Motion Designer та відеомонтажера",
    rx: rx("motion (designer|graphic[a-z]*)|video (editor|producer)|videographer|3d (artist|designer|modeler)|animator|illustrator|відеомонтаж[а-яіїєґ]*|моушн[а-яіїєґ]*"),
  },
  {
    slug: "localization",
    label: "Localization",
    uk: "Локалізація та переклад",
    ru: "Локализация и перевод",
    en: "Localization",
    uk_hint: "Localization Manager, Translator, Linguist",
    titleUk: "Вакансії з локалізації та перекладу",
    rx: rx("localization|localisation|translator|linguist|перекладач[а-яіїєґ]*|переводчик[а-яіїєґ]*|локалізац[а-яіїєґ]*"),
  },
  {
    slug: "moderation",
    label: "Moderation",
    uk: "Модерація контенту",
    ru: "Модерация контента",
    en: "Content moderation",
    uk_hint: "Content Moderator, Trust & Safety",
    titleUk: "Вакансії модератора контенту — Trust & Safety",
    rx: rx("moderator|moderation|content reviewer|trust (and|&) safety|модератор[а-яіїєґ]*"),
  },
  {
    slug: "education",
    label: "Education",
    uk: "Освіта та менторство",
    ru: "Образование и менторство",
    en: "Education & mentoring",
    uk_hint: "Mentor, Trainer, Tutor, викладач",
    titleUk: "Вакансії ментора та викладача в IT",
    rx: rx("mentor|trainer|tutor|lecturer|teacher|instructor|викладач[а-яіїєґ]*|ментор[а-яіїєґ]*|інструктор[а-яіїєґ]*|преподаватель[а-яіїєґ]*"),
  },
  {
    slug: "ops",
    label: "Operations",
    uk: "Операційний менеджмент",
    ru: "Операционный менеджмент",
    en: "Operations",
    uk_hint: "Operations Manager, Business Operations, RevOps",
    titleUk: "Вакансії Operations Manager — операційний менеджмент",
    rx: rx("operations (manager|specialist|lead|analyst|director|coordinator)|head of operations|business operations|revops|revenue operations|procurement|supply chain|logistics (manager|specialist)|закупівл[а-яіїєґ]*|логіст[а-яіїєґ]*"),
  },
];

// 25.10.2026 (Александр: «в ролях точно все вакансии?» -- нет: из 18 540
// заголовков карты сайта роль не находилась у ~34%). Добавки к правилам выше:
// названия на немецком, французском, испанском, португальском, итальянском,
// польском, шведском, чешском и английские, которых не было (Solutions /
// Presales / Forward Deployed Engineer, ServiceNow, SysOps...). Отдельная
// таблица, а не правка rx выше: граница слова здесь понимает любые буквы
// (é, ü, ø), а не только латиницу и кириллицу.
const BU = "(^|[^\\p{L}\\p{N}])";
const EU = "([^\\p{L}\\p{N}]|$)";
const rxu = (body: string) => new RegExp(`${BU}(${body})${EU}`, "iu");

const EXTRA: Partial<Record<JobRole, RegExp>> = {
  software: rxu(
    "software ?(engineering|entwickler[a-z]*|ingenieur[a-z]*)|softwareentwickler[a-z]*|entwickler[a-z]*|d[ée]veloppeur[a-z]*|desarrollador[a-z]*|programador[a-z]*|desenvolvedor[a-z]*|sviluppatore|programista|systemutvecklare|utvecklare|v[ýy]voj[áa][řr][a-z]*|ontwikkelaar|ing[ée]nieur logiciel|forward deployed|fde|member of technical staff|applications? (engineer|developer)|integration (engineer|developer)|developer|inzhener programist",
  ),
  backend: rxu("(\\.?net|java|python|php|golang|scala|ruby) (entwickler[a-z]*|d[ée]veloppeur[a-z]*|desarrollador[a-z]*|programador[a-z]*|desenvolvedor[a-z]*|programista|utvecklare|engineer|developer)"),
  frontend: rxu("web ?(developer|entwickler[a-z]*|d[ée]veloppeur[a-z]*)|javascript (developer|engineer)|typescript (developer|engineer)"),
  mobile: rxu("mobile app|app (developer|entwickler[a-z]*|d[ée]veloppeur[a-z]*)|mobile"),
  devops: rxu("systemadministrator[a-z]*|systemadministration|sysops|kubernetes|cloud (developer|specialist|consultant|operations)|administrateur (syst[èe]mes?|r[ée]seaux?)|administrador de sistemas|ing[ée]nieur (devops|cloud|syst[èe]mes?)|infrastructure|linux|techops|reliability engineer|platform engineering|virtuali[sz]ation"),
  network: rxu("netzwerk[a-z]*|network|r[ée]seaux?|redes|telecom[a-z]*|telco"),
  data: rxu("data(?! (protection|privacy|cent(er|re)))|dados|daten|donn[ée]es|datos|analytics|bi"),
  ai: rxu("research (scientist|engineer)|applied (scientist|ai|ml)|scientist|ai|ml|machine|k[üu]nstliche|intelligence artificielle|inteligencia artificial|robotics"),
  security: rxu("security|s[ée]curit[ée]|sicherheit|seguridad|seguran[çc]a|cyber|identity|iam|incident response|threat|vulnerability|insider risk|abuse|systems[äa]kerhet[a-z]*|s[äa]kerhet[a-z]*"),
  qa: rxu("testing|testautomat[a-z]*|qualit[äa]tssicher[a-z]*|test (analyst|manager|lead|technician)|validation|verification|quality"),
  support: rxu("supporter|support|helpdesk|(1st|2nd|3rd|first|second|third) level|servicedesk"),
  dba: rxu("data ?base|datenbank[a-z]*|banco de dados|base de donn[ée]es|dbre"),
  erp: rxu("servicenow|workday|oracle (fusion|ebs|apps)|microsoft dynamics|dynamics 365|d365|crm (developer|consultant|administrator)|implementation (consultant|specialist)|functional consultant"),
  architect: rxu("architect|architekt[a-z]*|architecte|arquitect[oa]|arquitet[oa]"),
  lead: rxu("(director|manager|head|vp)( of)?( software| field| platform| systems)? engineering|engineering (director|manager|lead)|teamleiter[a-z]*|team leader"),
  pm: rxu("projektleiter[a-z]*|projektmanager[a-z]*|chef de projet|gestor de proyectos|gerente de projetos|kierownik projektu|product (leadership|director|management|specialist)|technical program|program (lead|director)|programme manager|project (lead|coordinator|director)"),
  sales: rxu("presales|pre sales|solutions? (engineer|consultant|specialist)|sales|vertrieb[a-z]*|vente[a-z]*|commercial[e]?|ventas|vendas|handlowiec|agente|procacciatore|gtm|go to market|partnerships?|channel (manager|partner)|ejecutivo|account director|business developer"),
  account: rxu("customer (success|experience|engagement|relations)|client services|onboarding (specialist|manager)"),
  recruiter: rxu("recruiting|talent|people (and |& )?culture|people business partner|human resources|personalreferent[a-z]*|rrhh|ressources humaines"),
  marketing: rxu("marketing|marketer|brand|communications|public relations|growth"),
  finance: rxu("finance|financial|controlling|controller|buchhalt[a-z]*|comptable|contador|contabil[a-z]*|tax|audit[a-z]*|billing|payments?|fp&a"),
  legal: rxu("legal|counsel|compliance|privacy|data protection|governance|regulatory|grc|jurist[a-z]*|avocat|abogad[oa]"),
  hardware: rxu("hardware|electrical|mechanical|electronics?|avionics|propulsion|rf|antenna|silicon|asic|vlsi|manufacturing|production engineer|technician|techniker[a-z]*|mechatron[a-z]*|thermal|structures engineer|vehicle|cabin|spacecraft|satellite"),
  embedded: rxu("controls engineer|plc|scada|automation engineer|automotive|autosar|microcontroller|mechatron[a-z]*"),
  ops: rxu("operations|coordinator|coordinador[a]?|logisti[ck][a-z]*|supply|procurement|facility|workplace"),
  education: rxu("training (specialist|manager|coordinator|lead)|trainer|teacher|enseignant|profesor[a]?|formateur|instructor"),
  design: rxu("designer[a-z]*|mediengestalter[a-z]*|graphiste|dise[ñn]ador[a]?"),
  content: rxu("writer|redakteur[a-z]*|r[ée]dacteur[a-z]*|redactor[a]?"),
};

export const JOB_ROLES: JobRole[] = ROLES.map((r) => r.slug);

export function roleInfo(slug: string): RoleInfo | null {
  return ROLES.find((r) => r.slug === slug) ?? null;
}

// 25.10.2026 (разбор 7 917 живых заголовков). Профессии «не из разработки»:
// если заголовок попал в одну из них, «Team Lead» в нём -- это тимлид
// продаж/поддержки/медиабаинга, а не инженерный, и «Software Engineer»
// общий -- лишний, когда язык уже назван (Backend).
const NON_ENGINEERING: JobRole[] = [
  "recruiter", "marketing", "ppc", "seo", "aso", "smm", "content", "sales", "account",
  "affiliate", "finance", "legal", "office", "support", "moderation", "education", "ops", "motion",
];

export function extractRoles(title: string): JobRole[] {
  // Ассистент руководителя -- не топменеджер («Executive Assistant to CEO»).
  const t = /assistant|асистент|помічник/i.test(title) ? title.replace(/\b(ceo|cto|coo|cfo|директор[а-яіїєґ]*)\b/gi, "") : title;
  let roles = ROLES.filter((r) => r.rx.test(t)).map((r) => r.slug);
  // Добавки -- только когда основные правила ничего не нашли: так уже
  // размеченные вакансии не меняются, а «пустые» получают роль.
  if (roles.length === 0) {
    roles = ROLES.filter((r) => EXTRA[r.slug]?.test(t)).map((r) => r.slug);
    // «Business Developer», «Sales Developer» -- продажи, а не разработка.
    if (roles.includes("software") && roles.some((r) => r === "sales" || r === "account" || r === "affiliate" || r === "recruiter" || r === "marketing")) {
      roles = roles.filter((r) => r !== "software");
    }
  }
  if (roles.includes("lead") && roles.some((r) => NON_ENGINEERING.includes(r))) roles = roles.filter((r) => r !== "lead");
  if (roles.includes("software") && roles.some((r) => r === "backend" || r === "frontend" || r === "fullstack" || r === "mobile" || r === "qa" || r === "embedded" || r === "gamedev" || r === "ai" || r === "data")) {
    roles = roles.filter((r) => r !== "software");
  }
  // «Head of Sales» -- это продажи; в топменеджмент «Head of …» идёт, только
  // если больше ни во что не попал («Head of Warehousing»).
  if (roles.length === 0 && /(^|[^a-z])head of /i.test(t)) roles = ["clevel"];
  // 25.10.2026: остаток. «Director …», «VP …» без направления -- топменеджмент;
  // просто «Engineer» / «Ingénieur» без направления -- разработка ПО.
  if (roles.length === 0 && /(^|[^\p{L}])(director|directeur|direktor|director[a]?|vp|vice president|chief|founder|co ?founder)([^\p{L}]|$)/iu.test(t)) roles = ["clevel"];
  if (roles.length === 0 && !/(^|[^\p{L}])(civil|chemical|structural|process|environmental|geotechnical|biomedical)([^\p{L}]|$)/iu.test(t) && /(^|[^\p{L}])(engineer|engineering|ing[ée]nieur[a-z]*|ingeniero|engenheiro|inzhener|in[żz]ynier|technical staff)([^\p{L}]|$)/iu.test(t)) roles = ["software"];
  return roles;
}

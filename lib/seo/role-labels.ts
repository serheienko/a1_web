// lib/seo/role-labels.ts
//
// 25.10.2026 (Александр: «сделать разбивку не только по стекам, а и по
// ролям, как на DOU»). Короткие подписи профессий для чипов фильтра «Роль»
// на всех девяти языках сайта. Сами профессии и правила, по которым
// вакансия в них попадает, -- в lib/seo/job-role.ts; там же длинные
// названия для заголовков посадочных страниц /jobs/role/<slug>.

import type { JobRole } from "@/lib/seo/job-role";
import type { Locale } from "@/components/t";

type L = Record<Locale, string>;

const same = (s: string): L => ({ uk: s, en: s, ru: s, de: s, es: s, fr: s, pl: s, ptBR: s, zh: s });

export const ROLE_LABELS: Record<JobRole, L> = {
  qa: { uk: "QA / тестування", en: "QA / testing", ru: "QA / тестирование", de: "QA / Testing", es: "QA / testing", fr: "QA / tests", pl: "QA / testy", ptBR: "QA / testes", zh: "测试 / QA" },
  frontend: same("Frontend"),
  backend: same("Backend"),
  fullstack: same("Fullstack"),
  mobile: { uk: "Mobile (iOS, Android)", en: "Mobile (iOS, Android)", ru: "Mobile (iOS, Android)", de: "Mobile (iOS, Android)", es: "Móvil (iOS, Android)", fr: "Mobile (iOS, Android)", pl: "Mobile (iOS, Android)", ptBR: "Mobile (iOS, Android)", zh: "移动端 (iOS, Android)" },
  devops: same("DevOps / SRE"),
  data: { uk: "Data / аналітика", en: "Data / analytics", ru: "Data / аналитика", de: "Data / Analytics", es: "Datos / analítica", fr: "Data / analyse", pl: "Data / analityka", ptBR: "Dados / análise", zh: "数据 / 分析" },
  design: { uk: "Дизайн (UI/UX)", en: "Design (UI/UX)", ru: "Дизайн (UI/UX)", de: "Design (UI/UX)", es: "Diseño (UI/UX)", fr: "Design (UI/UX)", pl: "Design (UI/UX)", ptBR: "Design (UI/UX)", zh: "设计 (UI/UX)" },
  pm: same("Project / Product Manager"),
  ai: same("AI / ML"),
  ba: { uk: "Бізнес-аналітик", en: "Business Analyst", ru: "Бизнес-аналитик", de: "Business Analyst", es: "Analista de negocio", fr: "Business Analyst", pl: "Analityk biznesowy", ptBR: "Analista de negócios", zh: "业务分析师" },
  architect: { uk: "Архітектор", en: "Architect", ru: "Архитектор", de: "Architekt", es: "Arquitecto", fr: "Architecte", pl: "Architekt", ptBR: "Arquiteto", zh: "架构师" },
  lead: same("Team / Tech Lead"),
  security: { uk: "Кібербезпека", en: "Security", ru: "Кибербезопасность", de: "IT-Sicherheit", es: "Ciberseguridad", fr: "Cybersécurité", pl: "Cyberbezpieczeństwo", ptBR: "Segurança", zh: "信息安全" },
  support: { uk: "Підтримка", en: "Support", ru: "Поддержка", de: "Support", es: "Soporte", fr: "Support", pl: "Wsparcie", ptBR: "Suporte", zh: "技术支持" },
  dba: { uk: "Бази даних (DBA)", en: "Databases (DBA)", ru: "Базы данных (DBA)", de: "Datenbanken (DBA)", es: "Bases de datos (DBA)", fr: "Bases de données (DBA)", pl: "Bazy danych (DBA)", ptBR: "Bancos de dados (DBA)", zh: "数据库 (DBA)" },
  network: { uk: "Мережі / телеком", en: "Network / telecom", ru: "Сети / телеком", de: "Netzwerk / Telekom", es: "Redes / telecom", fr: "Réseaux / télécom", pl: "Sieci / telekom", ptBR: "Redes / telecom", zh: "网络 / 电信" },
  embedded: same("Embedded"),
  gamedev: { uk: "Геймдев", en: "Game dev", ru: "Геймдев", de: "Game Dev", es: "Videojuegos", fr: "Jeu vidéo", pl: "Gamedev", ptBR: "Games", zh: "游戏开发" },
  blockchain: same("Blockchain / Web3"),
  sap: same("SAP"),
  salesforce: same("Salesforce"),
  erp: { uk: "ERP / 1С", en: "ERP / 1C", ru: "ERP / 1С", de: "ERP / 1C", es: "ERP / 1C", fr: "ERP / 1C", pl: "ERP / 1C", ptBR: "ERP / 1C", zh: "ERP / 1C" },
  recruiter: { uk: "HR / рекрутинг", en: "HR / recruiting", ru: "HR / рекрутинг", de: "HR / Recruiting", es: "RR. HH. / reclutamiento", fr: "RH / recrutement", pl: "HR / rekrutacja", ptBR: "RH / recrutamento", zh: "HR / 招聘" },
  marketing: { uk: "Маркетинг", en: "Marketing", ru: "Маркетинг", de: "Marketing", es: "Marketing", fr: "Marketing", pl: "Marketing", ptBR: "Marketing", zh: "市场营销" },
  ppc: { uk: "PPC / медіабаїнг", en: "PPC / media buying", ru: "PPC / медиабаинг", de: "PPC / Media Buying", es: "PPC / media buying", fr: "PPC / media buying", pl: "PPC / media buying", ptBR: "PPC / mídia paga", zh: "PPC / 媒体采购" },
  seo: same("SEO"),
  aso: same("ASO"),
  smm: { uk: "SMM / спільноти", en: "SMM / community", ru: "SMM / сообщества", de: "SMM / Community", es: "SMM / comunidad", fr: "SMM / communauté", pl: "SMM / społeczność", ptBR: "SMM / comunidade", zh: "社媒 / 社区" },
  content: { uk: "Контент / копірайтинг", en: "Content / copywriting", ru: "Контент / копирайтинг", de: "Content / Copywriting", es: "Contenido / copywriting", fr: "Contenu / rédaction", pl: "Content / copywriting", ptBR: "Conteúdo / redação", zh: "内容 / 文案" },
  techwriter: { uk: "Технічний письменник", en: "Technical writer", ru: "Технический писатель", de: "Technischer Redakteur", es: "Redactor técnico", fr: "Rédacteur technique", pl: "Technical writer", ptBR: "Redator técnico", zh: "技术文档" },
  sales: { uk: "Продажі (Sales)", en: "Sales", ru: "Продажи (Sales)", de: "Vertrieb", es: "Ventas", fr: "Ventes", pl: "Sprzedaż", ptBR: "Vendas", zh: "销售" },
  account: { uk: "Account / Customer Success", en: "Account / Customer Success", ru: "Account / Customer Success", de: "Account / Customer Success", es: "Account / Customer Success", fr: "Account / Customer Success", pl: "Account / Customer Success", ptBR: "Account / Customer Success", zh: "客户经理 / 客户成功" },
  affiliate: { uk: "Афіліейт", en: "Affiliate", ru: "Аффилейт", de: "Affiliate", es: "Afiliados", fr: "Affiliation", pl: "Afiliacja", ptBR: "Afiliados", zh: "联盟营销" },
  finance: { uk: "Фінанси", en: "Finance", ru: "Финансы", de: "Finanzen", es: "Finanzas", fr: "Finance", pl: "Finanse", ptBR: "Finanças", zh: "财务" },
  legal: { uk: "Юристи / комплаєнс", en: "Legal / compliance", ru: "Юристы / комплаенс", de: "Recht / Compliance", es: "Legal / cumplimiento", fr: "Juridique / conformité", pl: "Prawo / compliance", ptBR: "Jurídico / compliance", zh: "法务 / 合规" },
  office: { uk: "Офіс / адміністрування", en: "Office / admin", ru: "Офис / администрирование", de: "Office / Verwaltung", es: "Oficina / administración", fr: "Office / administration", pl: "Biuro / administracja", ptBR: "Escritório / administração", zh: "行政 / 办公室" },
  clevel: same("C-level"),
  devrel: same("DevRel"),
  motion: { uk: "Моушн / відео", en: "Motion / video", ru: "Моушн / видео", de: "Motion / Video", es: "Motion / vídeo", fr: "Motion / vidéo", pl: "Motion / wideo", ptBR: "Motion / vídeo", zh: "动效 / 视频" },
  localization: { uk: "Локалізація / переклад", en: "Localization", ru: "Локализация / перевод", de: "Lokalisierung", es: "Localización", fr: "Localisation", pl: "Lokalizacja", ptBR: "Localização", zh: "本地化 / 翻译" },
  moderation: { uk: "Модерація", en: "Moderation", ru: "Модерация", de: "Moderation", es: "Moderación", fr: "Modération", pl: "Moderacja", ptBR: "Moderação", zh: "内容审核" },
  education: { uk: "Освіта / менторство", en: "Education / mentoring", ru: "Образование / менторство", de: "Bildung / Mentoring", es: "Educación / mentoría", fr: "Formation / mentorat", pl: "Edukacja / mentoring", ptBR: "Educação / mentoria", zh: "教育 / 导师" },
  ops: { uk: "Операційний менеджмент", en: "Operations", ru: "Операционный менеджмент", de: "Operations", es: "Operaciones", fr: "Opérations", pl: "Operacje", ptBR: "Operações", zh: "运营管理" },
};

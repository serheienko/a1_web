// app/stats/i18n.ts -- переводы страницы /stats на de, es, fr, pl, pt-BR, zh.
//
// 18.10.2026 (Александр: «и стату тоже переводить, на всех языках»). Раньше в stats-live.tsx и page.tsx
// для этих шести языков стояла копия английского. Ключ словаря -- английский текст, как он записан в
// L("укр", "English", "рус") в stats-live.tsx: L() сама подставляет перевод по этому ключу. Порядок
// переводов в массиве: [de, es, fr, pl, ptBR, zh]. Новая строка на странице -- сюда же добавить перевод.

import type { Locale } from "@/components/t";

export type Six = [string, string, string, string, string, string];
const ORDER: Locale[] = ["de", "es", "fr", "pl", "ptBR", "zh"];

export function six(v: Six): Partial<Record<Locale, string>> {
  const o: Partial<Record<Locale, string>> = {};
  ORDER.forEach((l, i) => {
    o[l] = v[i];
  });
  return o;
}

const D: Record<string, Six> = {
  "Ukraine": ["Ukraine", "Ucrania", "Ukraine", "Ukraina", "Ucrânia", "乌克兰"],
  "Europe": ["Europa", "Europa", "Europe", "Europa", "Europa", "欧洲"],
  "US & Canada": ["USA und Kanada", "EE. UU. y Canadá", "États-Unis et Canada", "USA i Kanada", "EUA e Canadá", "美国和加拿大"],
  "Latin America": ["Lateinamerika", "Latinoamérica", "Amérique latine", "Ameryka Łacińska", "América Latina", "拉丁美洲"],
  "Asia": ["Asien", "Asia", "Asie", "Azja", "Ásia", "亚洲"],
  "Oceania": ["Ozeanien", "Oceanía", "Océanie", "Oceania", "Oceania", "大洋洲"],
  "Middle East & Africa": ["Naher Osten und Afrika", "Oriente Medio y África", "Moyen-Orient et Afrique", "Bliski Wschód i Afryka", "Oriente Médio e África", "中东和非洲"],
  "Remote from anywhere": ["Remote aus jedem Land", "Remoto desde cualquier país", "Télétravail depuis n'importe quel pays", "Zdalnie z dowolnego kraju", "Remoto de qualquer país", "可从任何国家远程办公"],
  "Junior": ["Junior", "Junior", "Junior", "Junior", "Júnior", "初级"],
  "Middle": ["Mid-Level", "Semi senior", "Confirmé", "Mid", "Pleno", "中级"],
  "Senior": ["Senior", "Senior", "Senior", "Senior", "Sênior", "高级"],
  "Lead / Head": ["Lead / Head", "Lead / Head", "Lead / Head", "Lead / Head", "Lead / Head", "主管 / 负责人"],
  "Jobs": ["Jobs", "Vacantes", "Offres", "Oferty", "Vagas", "职位"],
  "New in 24h": ["Neu in 24 Std.", "Nuevas en 24 h", "Nouvelles en 24 h", "Nowe w 24 godz.", "Novas em 24 h", "24 小时内新增"],
  "Added": ["Hinzugefügt", "Añadidas", "Ajoutées", "Dodano", "Adicionadas", "新增"],
  "open jobs now": ["offene Jobs aktuell", "vacantes abiertas ahora", "offres ouvertes actuellement", "otwartych ofert teraz", "vagas abertas agora", "当前开放职位"],
  "companies": ["Firmen", "empresas", "entreprises", "firm", "empresas", "公司"],
  "countries": ["Länder", "países", "pays", "krajów", "países", "国家"],
  "cities": ["Städte", "ciudades", "villes", "miast", "cidades", "城市"],
  "new in 24h": ["neu in 24 Std.", "nuevas en 24 h", "nouvelles en 24 h", "nowych w 24 godz.", "novas em 24 h", "24 小时内新增"],
  "Live numbers: the page refreshes itself every minute": [
    "Live-Zahlen: Die Seite aktualisiert sich jede Minute von selbst",
    "Cifras en vivo: la página se actualiza sola cada minuto",
    "Chiffres en direct : la page s'actualise toute seule chaque minute",
    "Liczby na żywo: strona odświeża się sama co minutę",
    "Números ao vivo: a página se atualiza sozinha a cada minuto",
    "实时数据：页面每分钟自动刷新",
  ],
  "data as of": ["Stand", "datos a las", "données de", "dane z godz.", "dados de", "数据时间"],
  "Color shows how many jobs a country has; ripples mark countries with new jobs in the last 24h. Hover a country.": [
    "Die Farbe zeigt, wie viele Jobs ein Land hat; Wellen markieren Länder mit neuen Jobs in den letzten 24 Std. Fahre über ein Land.",
    "El color muestra cuántas vacantes tiene un país; las ondas marcan países con vacantes nuevas en las últimas 24 h. Pasa el cursor sobre un país.",
    "La couleur indique le nombre d'offres d'un pays ; les ondes signalent les pays avec de nouvelles offres sur les dernières 24 h. Survolez un pays.",
    "Kolor pokazuje, ile ofert ma dany kraj; fale oznaczają kraje z nowymi ofertami z ostatnich 24 godzin. Najedź na kraj.",
    "A cor mostra quantas vagas cada país tem; ondas marcam países com vagas novas nas últimas 24 h. Passe o mouse sobre um país.",
    "颜色表示各国职位数量；扩散的圆圈标出过去 24 小时有新增职位的国家。将鼠标悬停在国家上查看。",
  ],
  "Job map": ["Jobkarte", "Mapa de vacantes", "Carte des offres", "Mapa ofert", "Mapa de vagas", "职位地图"],
  "jobs (log scale)": ["Jobs (logarithmische Skala)", "vacantes (escala logarítmica)", "offres (échelle logarithmique)", "ofert (skala logarytmiczna)", "vagas (escala logarítmica)", "职位（对数刻度）"],
  "Top 15 countries by open jobs": ["Top 15 Länder nach offenen Jobs", "Los 15 países con más vacantes abiertas", "Top 15 des pays par offres ouvertes", "15 krajów z największą liczbą otwartych ofert", "Os 15 países com mais vagas abertas", "开放职位最多的 15 个国家"],
  "Countries": ["Länder", "Países", "Pays", "Kraje", "Países", "国家"],
  "How the whole A1 market splits across the world": ["So verteilt sich der gesamte A1-Markt auf die Welt", "Cómo se reparte todo el mercado de A1 por el mundo", "Comment tout le marché A1 se répartit dans le monde", "Jak cały rynek A1 rozkłada się na świecie", "Como todo o mercado do A1 se distribui pelo mundo", "A1 全部职位在全球的分布"],
  "Regions": ["Regionen", "Regiones", "Régions", "Regiony", "Regiões", "地区"],
  "Remote, hybrid or office": ["Remote, hybrid oder im Büro", "Remoto, híbrido o en oficina", "Télétravail, hybride ou bureau", "Zdalnie, hybrydowo lub w biurze", "Remoto, híbrido ou presencial", "远程、混合或到岗"],
  "Work format": ["Arbeitsformat", "Modalidad de trabajo", "Mode de travail", "Forma pracy", "Formato de trabalho", "工作方式"],
  "Remote": ["Remote", "Remoto", "Télétravail", "Zdalnie", "Remoto", "远程"],
  "Hybrid": ["Hybrid", "Híbrido", "Hybride", "Hybrydowo", "Híbrido", "混合"],
  "Office or not stated": ["Büro oder nicht angegeben", "Oficina o sin especificar", "Bureau ou non précisé", "Biuro lub nie podano", "Presencial ou não informado", "到岗或未注明"],
  "How many of today's open jobs were added to A1 each day over the last 30 days": [
    "Wie viele der aktuell offenen Jobs in den letzten 30 Tagen pro Tag zu A1 hinzugefügt wurden",
    "Cuántas de las vacantes abiertas hoy se añadieron a A1 cada día en los últimos 30 días",
    "Combien des offres ouvertes aujourd'hui ont été ajoutées à A1 chaque jour sur les 30 derniers jours",
    "Ile z dzisiejszych otwartych ofert dodano do A1 każdego dnia w ciągu ostatnich 30 dni",
    "Quantas das vagas abertas hoje foram adicionadas ao A1 a cada dia nos últimos 30 dias",
    "当前开放职位中，过去 30 天每天新增到 A1 的数量",
  ],
  "New jobs per day": ["Neue Jobs pro Tag", "Vacantes nuevas por día", "Nouvelles offres par jour", "Nowe oferty dziennie", "Novas vagas por dia", "每日新增职位"],
  "Last 7 days:": ["Letzte 7 Tage:", "Últimos 7 días:", "7 derniers jours :", "Ostatnie 7 dni:", "Últimos 7 dias:", "近 7 天："],
  "Last 24h:": ["Letzte 24 Std.:", "Últimas 24 h:", "24 dernières heures :", "Ostatnie 24 godz.:", "Últimas 24 h:", "近 24 小时："],
  "Technologies mentioned in job posts. One job can name several.": [
    "In Stellenanzeigen genannte Technologien. Ein Job kann mehrere nennen.",
    "Tecnologías mencionadas en las vacantes. Una vacante puede nombrar varias.",
    "Technologies citées dans les offres. Une offre peut en citer plusieurs.",
    "Technologie wymieniane w ofertach. Jedna oferta może wymieniać kilka.",
    "Tecnologias citadas nas vagas. Uma vaga pode citar várias.",
    "职位描述中提到的技术。一个职位可能提到多种技术。",
  ],
  "Tech stacks": ["Tech-Stacks", "Stacks tecnológicos", "Stacks techniques", "Stosy technologiczne", "Stacks de tecnologia", "技术栈"],
  "All": ["Alle", "Todos", "Tous", "Wszystkie", "Todos", "全部"],
  "Role is read from the job title": ["Die Rolle wird aus dem Jobtitel abgelesen", "El rol se deduce del título de la vacante", "Le rôle est déduit de l'intitulé de l'offre", "Rola jest odczytywana z tytułu oferty", "A função é identificada pelo título da vaga", "职位类别根据职位名称判断"],
  "Roles": ["Rollen", "Roles", "Rôles", "Role", "Funções", "职位类别"],
  "Seniority, when the title states it": ["Seniorität, wenn der Titel sie nennt", "Nivel de seniority, cuando el título lo indica", "Niveau d'expérience, lorsque l'intitulé le précise", "Poziom doświadczenia, gdy podano go w tytule", "Nível de senioridade, quando o título informa", "职级（职位名称中有标注时）"],
  "Seniority": ["Seniorität", "Nivel", "Niveau", "Poziom", "Senioridade", "职级"],
  "Salaries by technology": ["Gehälter nach Technologie", "Salarios por tecnología", "Salaires par technologie", "Wynagrodzenia według technologii", "Salários por tecnologia", "按技术划分的薪资"],
  "Who is hiring the most right now": ["Wer gerade am meisten einstellt", "Quién contrata más ahora mismo", "Qui recrute le plus en ce moment", "Kto rekrutuje teraz najwięcej", "Quem mais está contratando agora", "目前招聘最多的公司"],
  "Top companies": ["Top-Unternehmen", "Principales empresas", "Principales entreprises", "Czołowe firmy", "Principais empresas", "热门公司"],
  "Largest role × country segments": ["Größte Segmente aus Rolle × Land", "Mayores segmentos de rol × país", "Plus grands segments rôle × pays", "Największe segmenty rola × kraj", "Maiores segmentos de função × país", "最大的“职位类别 × 国家”组合"],
  "Biggest segments": ["Größte Segmente", "Mayores segmentos", "Plus grands segments", "Największe segmenty", "Maiores segmentos", "最大细分市场"],
  "Cities with the most jobs": ["Städte mit den meisten Jobs", "Ciudades con más vacantes", "Villes avec le plus d'offres", "Miasta z największą liczbą ofert", "Cidades com mais vagas", "职位最多的城市"],
  "Cities": ["Städte", "Ciudades", "Villes", "Miasta", "Cidades", "城市"],
  "Latest jobs added": ["Zuletzt hinzugefügte Jobs", "Últimas vacantes añadidas", "Dernières offres ajoutées", "Ostatnio dodane oferty", "Últimas vagas adicionadas", "最新添加的职位"],
  "Just in on A1": ["Gerade neu bei A1", "Recién llegado a A1", "Tout juste arrivé sur A1", "Świeżo na A1", "Acabou de chegar ao A1", "A1 刚刚上新"],
  // шапка страницы (page.tsx) и подпись загрузки
  "A1 Jobs · live data": ["A1 Jobs · Live-Daten", "A1 Jobs · datos en vivo", "A1 Jobs · données en direct", "A1 Jobs · dane na żywo", "A1 Jobs · dados ao vivo", "A1 Jobs · 实时数据"],
  "IT job market statistics": ["Statistiken zum IT-Jobmarkt", "Estadísticas del mercado laboral IT", "Statistiques du marché de l'emploi IT", "Statystyki rynku pracy IT", "Estatísticas do mercado de vagas de TI", "IT 职位市场统计"],
  "Table: all countries": ["Tabelle: alle Länder", "Tabla: todos los países", "Tableau : tous les pays", "Tabela: wszystkie kraje", "Tabela: todos os países", "表格：所有国家"],
  "Table: technologies": ["Tabelle: Technologien", "Tabla: tecnologías", "Tableau : technologies", "Tabela: technologie", "Tabela: tecnologias", "表格：技术"],
  "How we count: all open jobs on the site; closed jobs are removed daily. Technology, role and level are read from the job title and text; salaries only where the job states them. Numbers update automatically.": [
    "So zählen wir: alle offenen Jobs auf der Seite; geschlossene Jobs werden täglich entfernt. Technologie, Rolle und Level werden aus Jobtitel und Text abgelesen; Gehälter nur, wenn die Anzeige sie nennt. Die Zahlen aktualisieren sich automatisch.",
    "Cómo contamos: todas las vacantes abiertas del sitio; las cerradas se retiran a diario. La tecnología, el rol y el nivel se deducen del título y del texto de la vacante; los salarios, solo cuando la vacante los indica. Las cifras se actualizan automáticamente.",
    "Notre méthode : toutes les offres ouvertes du site ; les offres fermées sont retirées chaque jour. La technologie, le rôle et le niveau sont déduits de l'intitulé et du texte de l'offre ; les salaires, uniquement lorsque l'offre les indique. Les chiffres se mettent à jour automatiquement.",
    "Jak liczymy: bierzemy wszystkie otwarte oferty na stronie; zamknięte są codziennie usuwane. Technologię, rolę i poziom odczytujemy z tytułu i treści oferty; wynagrodzenia tylko wtedy, gdy oferta je podaje. Liczby aktualizują się automatycznie.",
    "Como contamos: todas as vagas abertas do site; as encerradas são removidas diariamente. Tecnologia, função e nível são identificados pelo título e pelo texto da vaga; salários, só quando a vaga informa. Os números se atualizam automaticamente.",
    "统计方式：计入网站上所有开放职位，已关闭的职位每天移除。技术、职位类别和级别根据职位名称和描述判断；薪资仅统计职位中注明的部分。数据自动更新。",
  ],
};

/** Полный набор из 9 языков: uk, en, ru как есть, остальные шесть из словаря (нет ключа -- английский). */
export function L9(uk: string, en: string, ru: string): Record<Locale, string> {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en, ...restFor(en) };
}

/** Переводы по английскому ключу; если ключа нет, остаётся английский (так было раньше). */
export function restFor(en: string): Partial<Record<Locale, string>> {
  const v = D[en];
  return v ? six(v) : {};
}

/** Подпись под графиком зарплат: число вакансий с зарплатой подставляется в {n}. */
const SAL: Six = [
  "Nur Jobs mit angegebenem Gehalt in US-Dollar, pro Jahr. Balken: 25. bis 75. Perzentil, Punkt: Median. Jobs mit Gehalt: {n}.",
  "Solo vacantes con salario indicado en dólares, por año. Barra: percentil 25 a 75, punto: mediana. Vacantes con salario: {n}.",
  "Uniquement les offres avec un salaire en dollars, par an. Barre : du 25e au 75e centile, point : médiane. Offres avec salaire : {n}.",
  "Tylko oferty z podanym wynagrodzeniem w dolarach, rocznie. Pasek: od 25. do 75. percentyla, punkt: mediana. Ofert z wynagrodzeniem: {n}.",
  "Somente vagas com salário informado em dólares, por ano. Barra: do percentil 25 ao 75, ponto: mediana. Vagas com salário: {n}.",
  "仅统计注明美元年薪的职位。条形为第 25 至第 75 百分位，圆点为中位数。含薪资的职位：{n}。",
];
export function salaryHint(n: string): Partial<Record<Locale, string>> {
  return six(SAL.map((s) => s.replace("{n}", n)) as Six);
}

/** Вступительный абзац страницы: числа и названия подставляются снаружи. */
const INTRO: Six = [
  "Aktuell listet A1 {total} offene IT-Jobs von {companies} Firmen in {countries} Ländern und {cities} Städten. In den letzten 24 Stunden kamen {fresh24h} hinzu, in der letzten Woche {fresh7d}. Top-Länder: {top}. Am häufigsten genannte Technologien: {tech}.",
  "A1 tiene ahora {total} vacantes de IT abiertas de {companies} empresas en {countries} países y {cities} ciudades. Se añadieron {fresh24h} en las últimas 24 horas y {fresh7d} en la última semana. Países principales: {top}. Tecnologías más mencionadas: {tech}.",
  "A1 compte actuellement {total} offres IT ouvertes de {companies} entreprises dans {countries} pays et {cities} villes. {fresh24h} ont été ajoutées ces dernières 24 heures et {fresh7d} cette semaine. Principaux pays : {top}. Technologies les plus citées : {tech}.",
  "A1 ma obecnie {total} otwartych ofert IT od {companies} firm w {countries} krajach i {cities} miastach. W ciągu ostatnich 24 godzin dodano {fresh24h}, w ciągu tygodnia {fresh7d}. Najwięcej ofert w krajach: {top}. Najczęściej wymieniane technologie: {tech}.",
  "O A1 tem agora {total} vagas de TI abertas de {companies} empresas em {countries} países e {cities} cidades. {fresh24h} foram adicionadas nas últimas 24 horas e {fresh7d} na última semana. Principais países: {top}. Tecnologias mais citadas: {tech}.",
  "A1 目前有 {total} 个开放的 IT 职位，来自 {companies} 家公司，覆盖 {countries} 个国家和 {cities} 个城市。过去 24 小时新增 {fresh24h} 个，过去一周新增 {fresh7d} 个。职位最多的国家：{top}。最常提到的技术：{tech}。",
];
export function introFor(
  base: { uk: string; en: string; ru: string },
  v: Record<string, string>,
  topNames: Partial<Record<Locale, string>>,
): Record<Locale, string> {
  const out: Record<Locale, string> = { ...base, de: base.en, es: base.en, fr: base.en, pl: base.en, ptBR: base.en, zh: base.en };
  ORDER.forEach((l, i) => {
    out[l] = (INTRO[i] ?? "").replace(/\{(\w+)\}/g, (_, k: string) => (k === "top" ? topNames[l] ?? "" : v[k] ?? ""));
  });
  return out;
}

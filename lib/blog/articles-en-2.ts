// lib/blog/articles-en-2.ts
//
// 01.10.2026. Вторая партия английских гайдов под страны: Нидерланды,
// Ирландия, Испания, Франция, Австралия. Живые цифры -- блоки "data";
// юридические факты взяты только с официальных страниц (проверено
// 01.10.2026), всё, что подтвердить не удалось (порог зарплаты в Испании,
// пороги австралийской визы 482, срок рассмотрения), в текст не вошло --
// вместо цифры стоит отсылка к официальной странице.

import type { Article } from "./types";
import { CHECKED, guide, liveData, WORLD_LINKS } from "./articles-en";

const TP =
  "EU temporary protection for people fleeing Ukraine has been extended to 4 March 2028 and gives access to the labour market. New applicants must show they met Ukrainian military obligations or are exempt, while people already protected are not affected ([Council of the EU](https://www.consilium.europa.eu/en/press/press-releases/2026/07/15/eu-countries-agree-to-extend-temporary-protection-for-those-fleeing-ukraine-until-march-2028/)). Some national pages still show the older March 2027 date, so check the end date with your own immigration authority.";

export const ARTICLES_EN_2: Article[] = [
  // ───────────────── Netherlands ─────────────────
  guide({
    slug: "tech-jobs-in-netherlands",
    title: "Tech Jobs in the Netherlands for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in the Netherlands as a Ukrainian or international candidate",
    description:
      "Open Dutch tech jobs with live numbers by seniority, stack, city and employer, plus the Highly Skilled Migrant salary thresholds for 2026, the 30% ruling and Ukrainian temporary protection.",
    related: ["tech-jobs-in-germany", "tech-jobs-in-uk", "tech-jobs-in-ireland"],
    blocks: [
      { t: "p", text: "The Netherlands is one of the easiest places in Europe to work in English. Amsterdam is the main hub, with Rotterdam, The Hague, Utrecht and Eindhoven behind it, and most international tech employers already know how to sponsor foreign engineers. The catch is that the main work route runs through the employer, so the search is really a search for a sponsoring company." },
      ...liveData("NL", "the Netherlands"),
      { t: "h2", text: "The Highly Skilled Migrant route" },
      { t: "p", text: "The main route for non-EU engineers is the highly skilled migrant permit (kennismigrant). Only an employer that is a recognised sponsor with the Immigration and Naturalisation Service (IND) can apply, and the salary must meet a monthly threshold ([IND](https://ind.nl/en/residence-permits/work/highly-skilled-migrant))." },
      { t: "ul", items: [
        "**Age 30 and over:** €5,942 gross a month, excluding holiday allowance, in 2026.",
        "**Under 30:** €4,357 gross a month.",
        "**Recent graduates (reduced criterion):** €3,122 gross a month.",
        "**EU Blue Card:** €5,942 a month, or €4,754 under the reduced criterion.",
      ] },
      { t: "p", text: "These are the figures valid from 1 January 2026 on the [IND's required amounts page](https://ind.nl/en/required-amounts-income-requirements); they are indexed every year. The IND page does not state a processing time, so ask the employer how long their recent applications have taken." },
      { t: "h2", text: "The 30% ruling" },
      { t: "p", text: "Foreign hires with scarce expertise can qualify for a tax-free allowance of 30% of salary, for a maximum of five years. It requires a minimum salary, and the employee must have lived more than 150 km from the Dutch border for 16 of the 24 months before the job started. The allowance is 30% in 2026 and falls to 27% from 1 January 2027, and the employer applies within four months of the start date ([business.gov.nl](https://business.gov.nl/staff/employing-staff/the-expat-scheme-30-percent-ruling-in-the-netherlands/)). Ask any employer whether they will file for it, because it changes your take-home pay noticeably." },
      { t: "h2", text: "Ukrainians in the Netherlands" },
      { t: "p", text: TP },
      { t: "p", text: "In the Netherlands, holders of temporary protection can work without an employment permit ([Government of the Netherlands](https://www.government.nl/topics/reception-of-refugees-from-ukraine/work-and-income)), which makes them easier to hire than candidates who need a sponsor. The [IND's notice](https://ind.nl/en/news/temporary-protection-directive-for-ukraine-extended-with-new-condition-for-new-applications) explains the new condition for first-time applicants." },
      { t: "h2", text: "Do you need Dutch?" },
      { t: "p", text: "There is no official language requirement for the highly skilled migrant route, and English is the working language at many international tech employers in Amsterdam and Eindhoven. Smaller local companies and customer-facing roles are more likely to ask for Dutch, so read the requirements in each posting." },
      WORLD_LINKS("nl", "the Netherlands", [{ href: "/jobs/city/amsterdam", label: "Amsterdam" }, { href: "/jobs/city/rotterdam", label: "Rotterdam" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "What salary do I need for the Dutch highly skilled migrant permit in 2026?", a: "€5,942 gross a month for age 30 and over, €4,357 under 30 and €3,122 for recent graduates, excluding holiday allowance. The employer must be a recognised IND sponsor." },
      { q: "Can I apply for a Dutch work permit myself?", a: "For the highly skilled migrant route the employer applies, and only recognised sponsors can. Ukrainians with temporary protection can work without an employment permit." },
      { q: "Is the 30% ruling guaranteed?", a: "No. It depends on scarce expertise, a minimum salary and where you lived before the job, and the employer files for it within four months of the start date. It drops from 30% to 27% on 1 January 2027." },
    ],
  }),

  // ───────────────── Ireland ─────────────────
  guide({
    slug: "tech-jobs-in-ireland",
    title: "Tech Jobs in Ireland for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Ireland as a Ukrainian or international candidate",
    description:
      "Live Irish tech openings by seniority, stack, city and employer, plus the Critical Skills Employment Permit thresholds and the status of Ukrainians in Ireland in 2026.",
    related: ["tech-jobs-in-uk", "tech-jobs-in-netherlands", "tech-jobs-in-germany"],
    blocks: [
      { t: "p", text: "Ireland is the only English-speaking country in the euro area, and Dublin hosts European offices of many global technology companies. Cork, Galway and Limerick add smaller hubs. For non-EU candidates the central tool is the Critical Skills Employment Permit." },
      ...liveData("IE", "Ireland"),
      { t: "h2", text: "Critical Skills Employment Permit" },
      { t: "p", text: "ICT professionals are among the eligible categories ([Department of Enterprise](https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/))." },
      { t: "ul", items: [
        "**Salary thresholds.** €40,904 a year for a restricted list of strategically important occupations (€36,848 if the qualification was gained within 12 months before applying), and €68,911 for all other occupations. Which tier your job falls in depends on the occupation code, so check the official list.",
        "**Job offer.** A contract of at least two years is required.",
        "**Who applies.** Either the employee or the employer can file.",
        "**Timing.** The Department recommends applying at least 12 weeks before the start date; that is a lead time, not a promised processing time.",
      ] },
      { t: "h2", text: "Ukrainians in Ireland" },
      { t: "p", text: TP },
      { t: "p", text: "Irish immigration pages say that temporary protection gives immediate access to the labour market. Since 5 August 2026 new applicants must show they were authorised to leave Ukraine; see the [Irish immigration service page](https://www.irishimmigration.ie/information-on-temporary-protection-for-people-fleeing-the-conflict-in-ukraine/) for the current wording." },
      { t: "h2", text: "Language and the market" },
      { t: "p", text: "English is the working language of the Irish tech market, so there is no language barrier in the way the German or Dutch markets sometimes have. The flip side is competition: Dublin postings attract applicants from all over the world, so a focused CV and a clear stack match matter. We did not find an official remote-worker visa route on the pages we checked, so plan around an employer-sponsored permit." },
      WORLD_LINKS("ie", "Ireland", [{ href: "/jobs/city/dublin", label: "Dublin" }, { href: "/jobs/city/cork", label: "Cork" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "What is the salary threshold for the Irish Critical Skills permit?", a: "€40,904 for the restricted list of strategically important occupations and €68,911 for other occupations. A two-year job offer is required." },
      { q: "Can I apply for an Irish work permit without an employer?", a: "The Critical Skills permit requires a job offer. Either the employee or the employer can apply, but you need the offer first." },
      { q: "Can Ukrainians work in Ireland?", a: "People with temporary protection have access to the labour market. New applicants must show they were authorised to leave Ukraine, under the rules introduced on 5 August 2026." },
    ],
  }),

  // ───────────────── Spain ─────────────────
  guide({
    slug: "tech-jobs-in-spain",
    title: "Tech Jobs in Spain for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Spain as a Ukrainian or international candidate",
    description:
      "Live Spanish tech openings by seniority, stack, city and employer, plus the highly qualified professional permit, the telework (digital nomad) visa and the Beckham regime in 2026.",
    related: ["tech-jobs-in-netherlands", "tech-jobs-in-germany", "tech-jobs-in-ireland"],
    blocks: [
      { t: "p", text: "Madrid and Barcelona are the two big Spanish tech hubs, with Valencia, Málaga and Seville growing quickly. Spain is also the country with the most direct route for remote workers: a telework visa that lets people employed outside Spain live there." },
      ...liveData("ES", "Spain"),
      { t: "h2", text: "Highly qualified professionals" },
      { t: "p", text: "Under the law on entrepreneurs (Ley 14/2013, article 71), a highly qualified professional route exists for workers with a job offer and a higher-education degree, or at least three years of comparable professional experience ([Ministry of Inclusion](https://www.inclusion.gob.es/en/web/unidadgrandesempresas/profesionales-altamente-cualificados)). The salary threshold depends on a ministerial order that is updated every year, so check the current figure with the Spanish authorities or the employer's immigration adviser." },
      { t: "h2", text: "Telework (digital nomad) visa" },
      { t: "p", text: "The international telework visa lets you live in Spain while working for companies outside Spain ([Spanish consulate guidance](https://www.exteriores.gob.es/Consulados/nuevayork/en/ServiciosConsulares/Paginas/Consular/Visado-de-teletrabajo.aspx))." },
      { t: "ul", items: [
        "You need income of at least 200% of the Spanish monthly minimum wage; check the current euro amount on the official page.",
        "You need a degree or three years of relevant experience.",
        "Employees must have worked for their employer for at least three months. Employees may only work for companies outside Spain, while self-employed people can have up to 20% of clients in Spain.",
        "The visa is valid for one year and is not open to EU nationals.",
      ] },
      { t: "h2", text: "The Beckham regime" },
      { t: "p", text: "Spain has a special tax regime for people who move to Spain for work. It explicitly covers remote workers who hold the telework visa, and it requires that you have not been a Spanish tax resident in the previous five years ([Agencia Tributaria](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c02-irpf-cuestiones-generales/sujecion-irpf-aspectos-personales/regimen-fiscal-especial-aplicable-trabajadores-desplazados/cuadro-resumen.html)). The rate and conditions are worth confirming with a tax adviser before you rely on it." },
      { t: "h2", text: "Ukrainians in Spain" },
      { t: "p", text: TP },
      { t: "p", text: "In Spain temporary protection comes with a residence and work permit ([Ministry of Inclusion](https://ucraniaurgente.inclusion.gob.es/proteccion-temporal1)). Note that the Spanish page still shows March 2027 as the end date, which is older than the EU decision." },
      { t: "h2", text: "Do you need Spanish?" },
      { t: "p", text: "For international tech roles in Madrid and Barcelona, English is common in engineering teams, but day-to-day company life and most local employers use Spanish. Treat basic Spanish as a long-term advantage rather than a day-one requirement, and read the language line in each posting." },
      WORLD_LINKS("es", "Spain", [{ href: "/jobs/city/madrid", label: "Madrid" }, { href: "/jobs/city/barcelona", label: "Barcelona" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "Can I get a Spanish visa to work remotely for a foreign employer?", a: "Yes, the international telework visa is designed for this. It requires income of at least 200% of the monthly minimum wage, a degree or three years of experience, and, for employees, at least three months with the employer." },
      { q: "Does the telework visa let me work for Spanish companies?", a: "Employees may only work for companies outside Spain. Self-employed people can have up to 20% of clients in Spain." },
      { q: "Can Ukrainians work in Spain?", a: "Temporary protection gives a residence and work permit. The EU extended protection to 4 March 2028, although some Spanish pages still show 2027." },
    ],
  }),

  // ───────────────── France ─────────────────
  guide({
    slug: "tech-jobs-in-france",
    title: "Tech Jobs in France for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in France as a Ukrainian or international candidate",
    description:
      "Live French tech openings by seniority, stack, city and employer, plus the Talent Passport salary thresholds, the EU Blue Card route and Ukrainian temporary protection in 2026.",
    related: ["tech-jobs-in-germany", "tech-jobs-in-netherlands", "tech-jobs-in-spain"],
    blocks: [
      { t: "p", text: "France has a large and well-funded tech scene centred on Paris, with Lyon, Toulouse, Sophia Antipolis and Nantes behind it. Paris dominates the openings, and a visible share of employers work in English, although French remains the default in the wider market." },
      ...liveData("FR", "France"),
      { t: "h2", text: "The Talent Passport" },
      { t: "p", text: "Non-EU engineers usually come through the Talent Passport (passeport talent). The official page lists several variants with different salary thresholds ([service-public.gouv.fr](https://www.service-public.gouv.fr/particuliers/vosdroits/F16922?lang=en), updated 1 June 2026)." },
      { t: "ul", items: [
        "**EU Blue Card–Talent:** at least €59,373 gross a year, a bachelor's degree or five years of experience (three in some designated professions) and a contract of at least six months. This is the route most non-EU engineers use.",
        "**Qualified Employee–Talent:** at least €39,582 gross a year, but it requires a French master's degree or equivalent.",
        "**JEI innovative-company employee and intra-group transfers:** at least €39,582 gross a year.",
      ] },
      { t: "p", text: "The card can be valid for up to four years. Non-EU nationals apply from abroad through a French consulate for a long-stay talent visa. The page states no processing time, and silence from the prefecture for four months counts as a refusal, so build a margin into your plans." },
      { t: "h2", text: "Ukrainians in France" },
      { t: "p", text: TP },
      { t: "p", text: "In France, holders of temporary protection may work as soon as they have the provisional residence authorisation (APS), valid for six months ([Ministry of the Interior](https://www.interieur.gouv.fr/actualites/grands-dossiers/situation-en-ukraine/foire-aux-questions-accueil-des-refugies-ukrainiens))." },
      { t: "h2", text: "Do you need French?" },
      { t: "p", text: "French is not a legal requirement for the Talent Passport. In practice, Paris has many English-speaking engineering teams at international companies and startups, while smaller French employers and anything customer-facing will expect French. Look at the language line in each posting. We did not find an official remote-worker visa route for France, so assume you need an employer to sponsor you." },
      WORLD_LINKS("fr", "France", [{ href: "/jobs/city/paris", label: "Paris" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "What salary do I need for the French Talent Passport?", a: "€59,373 gross a year for the EU Blue Card–Talent, which most non-EU engineers use, and €39,582 for the Qualified Employee–Talent variant, which requires a French master's degree or equivalent." },
      { q: "Do I need to speak French to get the Talent Passport?", a: "French is not a legal requirement for the card, although many employers expect it. Many Paris teams at international companies work in English." },
      { q: "Can Ukrainians work in France?", a: "Holders of temporary protection can work once they have the provisional residence authorisation (APS), valid six months." },
    ],
  }),

  // ───────────────── Australia ─────────────────
  guide({
    slug: "tech-jobs-in-australia",
    title: "Tech Jobs in Australia for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Australia as a Ukrainian or international candidate",
    description:
      "Live Australian tech openings by seniority, stack, city and employer, plus the Skills in Demand 482 visa and the Temporary Humanitarian Stay pathway for Ukrainians in 2026.",
    related: ["tech-jobs-in-uk", "tech-jobs-in-canada", "tech-jobs-in-usa"],
    blocks: [
      { t: "p", text: "Sydney and Melbourne carry most of the Australian tech market, with Brisbane, Perth and Canberra behind them. The time difference with Europe is large, which matters if you are thinking of a remote role for an Australian company from Ukraine or Europe." },
      ...liveData("AU", "Australia"),
      { t: "h2", text: "Skills in Demand visa (subclass 482)" },
      { t: "p", text: "The main employer-sponsored route is the Skills in Demand visa. The employer sponsors a worker they cannot source locally, and Home Affairs gives higher processing priority to the Specialist Skills stream ([Home Affairs](https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/visa-processing-priorities/skilled-visa))." },
      { t: "ul", items: [
        "**Income thresholds and occupations.** These change and depend on the stream, so read the current figures on the [official Home Affairs page](https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482) rather than relying on older articles.",
        "**English.** Applicants need to meet an English-language requirement unless exempt; the details are on the [Home Affairs English page](https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482/sufficient-english).",
        "**Processing time.** Home Affairs publishes it through an interactive tool, so check the live estimate before you plan around a start date.",
      ] },
      { t: "h2", text: "Ukrainians and the Temporary Humanitarian Stay pathway" },
      { t: "p", text: "Australia does not use EU temporary protection. Its Ukraine-specific offer is a Temporary Humanitarian Stay pathway: a three-year visa with full work rights, by Minister's invitation only, for Ukrainians who arrived before 31 July 2024. The visa ends if the holder leaves Australia ([Home Affairs](https://www.homeaffairs.gov.au/help-and-support/ukraine-visa-support/australian-government-offer-for-temporary-humanitarian-stay-in-australia)). If you are not already in Australia, the realistic route is employer sponsorship." },
      { t: "h2", text: "Working for an Australian company from abroad" },
      { t: "p", text: "Australian visa rules apply to work done in Australia. Contractor and employer-of-record arrangements for people abroad depend on the tax and legal rules of the country where you live, so ask the company how they handle it. See [worldwide remote roles](/jobs/country/ww) for companies that hire from anywhere." },
      WORLD_LINKS("au", "Australia", [{ href: "/jobs/city/sydney", label: "Sydney" }, { href: "/jobs/city/melbourne", label: "Melbourne" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "Can I get an Australian work visa without an employer?", a: "The Skills in Demand 482 visa is employer-sponsored. Ukrainians already in Australia may have a separate humanitarian pathway, which is by Minister's invitation only." },
      { q: "Is there an English test for the 482 visa?", a: "Yes, applicants must meet an English requirement unless exempt. The current details are on the Home Affairs page." },
      { q: "What is the Temporary Humanitarian Stay pathway?", a: "A three-year visa with full work rights for Ukrainians who arrived before 31 July 2024, offered by Minister's invitation only. It ends if the holder leaves Australia." },
    ],
  }),
];

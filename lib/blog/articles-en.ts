// lib/blog/articles-en.ts
//
// 01.10.2026. Английские гайды под страны первого эшелона (США, Британия,
// Германия, Канада, Польша, Израиль) -- отдельные статьи со своей
// спецификой, не перевод украинских. Живые цифры (вакансии, стеки, города,
// работодатели) подставляют блоки "data" с cc; юридические факты проверены
// по официальным источникам на 01.10.2026 и снабжены ссылками. Всё, что не
// удалось подтвердить официальной страницей, в текст не попало или подано
// как «проверьте». Правила миграции меняются -- в каждой статье есть дата
// проверки.

import type { Article, Block } from "./types";

const P = "2026-10-01";
const CHECKED = "Facts checked on 1 October 2026 against the official pages linked in the text. Immigration rules change often — confirm the current requirements with the official source or a qualified adviser before you apply. This is general information, not legal advice.";

function liveData(cc: string, name: string): Block[] {
  return [
    { t: "h2", text: `Tech jobs in ${name} right now` },
    { t: "p", text: `The numbers below are calculated from the open vacancies on A1 and refresh with the database.` },
    { t: "data", id: "country-summary", cc, title: `Open tech roles in ${name}` },
    { t: "data", id: "country-salary", cc },
    { t: "h3", text: "Seniority" },
    { t: "data", id: "country-levels", cc, caption: "Seniority is taken from the job title." },
    { t: "h3", text: "Most requested technologies" },
    { t: "data", id: "country-tech", cc, caption: "A role can mention several technologies, so counts overlap." },
    { t: "h3", text: "Where the jobs are" },
    { t: "data", id: "country-cities", cc },
    { t: "h3", text: "Employers with the most open roles" },
    { t: "data", id: "country-employers", cc },
  ];
}

function guide(a: Omit<Article, "lang" | "published" | "updated" | "kicker"> & { kicker?: string }): Article {
  return { lang: "en", published: P, updated: P, kicker: a.kicker ?? "Country guide", ...a };
}

const WORLD_LINKS = (cc: string, name: string, extra: { href: string; label: string }[] = []): Block => ({
  t: "links",
  title: "Browse jobs",
  links: [
    { href: `/jobs/country/${cc}`, label: `All jobs in ${name}` },
    { href: `/jobs/country/${cc}/remote`, label: "Remote" },
    { href: `/jobs/country/${cc}/junior`, label: "Junior" },
    { href: `/jobs/country/${cc}/senior`, label: "Senior" },
    { href: `/jobs/country/${cc}/python`, label: "Python" },
    ...extra,
  ],
});

export const ARTICLES_EN: Article[] = [
  // ───────────────── United States ─────────────────
  guide({
    slug: "tech-jobs-in-usa",
    title: "Tech Jobs in the United States for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in the United States as a Ukrainian or international candidate",
    description:
      "Open tech jobs in the US with live numbers by seniority, stack, city and employer, plus the 2026 work-visa picture: H-1B lottery, the $100,000 payment, O-1, L-1 and TPS for Ukrainians.",
    related: ["tech-jobs-in-canada", "tech-jobs-in-uk", "tech-jobs-in-germany"],
    blocks: [
      { t: "p", text: "The United States has the largest tech job market in the world, and most of the roles open to people outside the country are sponsored by large employers. This guide combines live data on current openings with the main 2026 work routes, so you can see both what is hiring and what it takes to be hired." },
      ...liveData("US", "the United States"),
      { t: "h2", text: "Work routes for software and IT professionals" },
      { t: "ul", items: [
        "**H-1B.** Your employer sponsors you; you cannot apply on your own. Registrations go into a lottery, and since the rule that took effect on 27 February 2026 the lottery is weighted by wage level — a higher offered wage level means more entries ([Federal Register](https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b)). Registration for fiscal year 2027 has already closed.",
        "**The $100,000 payment.** A presidential proclamation requires a $100,000 payment for certain new H-1B entrants. It was extended in September 2026 and runs until 21 September 2027 unless extended again, with national-interest exceptions possible ([Federal Register](https://www.federalregister.gov/documents/2026/09/23/2026-19554/restriction-on-entry-of-certain-nonimmigrant-workers)). Ask any prospective employer how they treat it.",
        "**O-1.** For people with extraordinary ability, with an employer or agent as petitioner. It is not subject to the H-1B lottery, but the evidence bar is high ([State Department overview](https://travel.state.gov/content/travel/en/us-visas/employment/temporary-worker-visas.html)).",
        "**L-1.** For intracompany transfers: you generally need to have worked for a related company abroad for at least a year within the previous three.",
        "**TN** is only for Canadian and Mexican citizens, so it is not an option for Ukrainians.",
      ] },
      { t: "note", text: "Further changes have been proposed — a new fee for cap-subject H-1B petitions, higher prevailing wage levels, and the end of the 60-day grace period after a job loss. Proposals are not law until finalised, so check the Federal Register or USCIS before relying on them." },
      { t: "h2", text: "Ukrainians in the United States" },
      { t: "p", text: "Temporary Protected Status for Ukraine is legally contested at the moment: the extension published in January 2025 runs to 19 October 2026, while advocacy groups argue that DHS missed a decision deadline so that status is automatically extended by six months. Do not rely on either date without checking USCIS directly. New applications under Uniting for Ukraine have been reported as paused since January 2025, so verify the current status before planning around it." },
      { t: "h2", text: "Working for a US company from outside the US" },
      { t: "p", text: "A US work visa is about working physically inside the US. Many companies hire engineers abroad as contractors or through an employer of record (EOR), so you do not need a US visa for work done from Ukraine or another country — but you must follow the tax and legal rules of the country where you live and work. Doing the work while in the US as a visitor is not permitted. Browse [worldwide remote roles](/jobs/country/ww) or [remote roles in the US](/jobs/country/us/remote)." },
      { t: "h2", text: "What the hiring process usually looks like" },
      { t: "p", text: "Expect a recruiter call, a technical screen, a coding or take-home exercise, and a final loop with system-design and behavioural interviews. Employers sponsoring visas will ask about your work authorisation at the very first call; being direct about it saves everyone time." },
      WORLD_LINKS("us", "the United States", [{ href: "/jobs/city/new-york", label: "New York" }, { href: "/jobs/city/san-francisco", label: "San Francisco" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "Can I apply for an H-1B myself?", a: "No. An employer must register and file the petition on your behalf, which is why searching for employers that sponsor is the practical first step." },
      { q: "Are there tech jobs in the US I can do from Ukraine?", a: "Yes. Some US companies hire contractors or use an employer of record. See [US remote roles](/jobs/country/us/remote) and [worldwide remote roles](/jobs/country/ww)." },
    ],
  }),

  // ───────────────── United Kingdom ─────────────────
  guide({
    slug: "tech-jobs-in-uk",
    title: "Tech Jobs in the UK for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in the United Kingdom as a Ukrainian or international candidate",
    description:
      "Live UK tech openings by seniority, stack, city and employer, plus the 2026 Skilled Worker visa salary thresholds, sponsorship rules and Ukraine Permission Extension explained.",
    related: ["tech-jobs-in-usa", "tech-jobs-in-germany", "tech-jobs-in-canada"],
    blocks: [
      { t: "p", text: "The UK is Europe's biggest tech market, with most roles concentrated in London and a few regional hubs. For candidates from outside the country, almost everything runs through employer sponsorship under the Skilled Worker route, so the practical question is which employers are hiring and whether the offer meets the visa thresholds." },
      ...liveData("GB", "the United Kingdom"),
      { t: "h2", text: "The Skilled Worker visa" },
      { t: "ul", items: [
        "**Salary.** The general minimum is £41,700 or the going rate for your occupation, whichever is higher; a lower £33,400 rate applies to some applicants ([GOV.UK](https://www.gov.uk/skilled-worker-visa)). A Migration Advisory Committee note computes a higher general threshold, but we found no evidence it is in force — check before you rely on the figure.",
        "**Job level.** Since 22 July 2025 the job generally has to be at RQF level 6 or above, unless it is on the Immigration Salary List or Temporary Shortage List. The interim Temporary Shortage List runs to 31 December 2026. Check the occupation code of your specific role.",
        "**Sponsorship.** You need a job offer from a licensed sponsor and a certificate of sponsorship, and you must apply within three months of receiving it.",
        "**English.** New applicants need B2-level English.",
        "**Costs.** Application fees from outside the UK are £819 for up to three years and £1,618 for longer, plus the healthcare surcharge (£1,035 a year) and, for the employer, the Immigration Skills Charge ([fees table](https://www.gov.uk/government/publications/visa-regulations-revised-table/home-office-immigration-and-nationality-fees-8-april-2026)).",
      ] },
      { t: "h2", text: "Global Talent" },
      { t: "p", text: "The [Global Talent visa](https://www.gov.uk/global-talent) is for leaders and potential leaders in digital technology, among other fields, and does not need an employer sponsor. It requires endorsement; check on GOV.UK which body currently endorses digital-technology applicants." },
      { t: "h2", text: "Ukrainians in the UK" },
      { t: "p", text: "People who already hold permission under a Ukraine scheme can extend it through the free [Ukraine Permission Extension](https://www.gov.uk/guidance/applying-to-the-ukraine-permission-extension-scheme): 18 months, then a further 24 months, applied for within 90 days before expiry. It is not available to new arrivals, and time on it does not count towards settlement. A long-term position is expected later in 2026." },
      { t: "h2", text: "Working for a UK company from abroad" },
      { t: "p", text: "UK visa rules apply to work done in the UK; a standard visitor cannot take up paid work ([GOV.UK](https://www.gov.uk/standard-visitor)). Remote contract or employer-of-record arrangements for work done outside the UK are a separate matter governed by the rules of the country where you live. See [remote roles in the UK](/jobs/country/gb/remote) and [worldwide remote roles](/jobs/country/ww)." },
      WORLD_LINKS("gb", "the United Kingdom", [{ href: "/jobs/city/london", label: "London" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "Do I need a sponsor to work in the UK?", a: "For the Skilled Worker route, yes — a licensed employer must sponsor you. The Global Talent route does not need an employer sponsor but requires endorsement." },
      { q: "What is the minimum salary for a Skilled Worker visa?", a: "At least £41,700 or the going rate for the occupation, whichever is higher, with a lower rate of £33,400 for some applicants. Check the current GOV.UK page, as thresholds are reviewed." },
    ],
  }),

  // ───────────────── Germany ─────────────────
  guide({
    slug: "tech-jobs-in-germany",
    title: "Tech Jobs in Germany for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Germany as a Ukrainian or international candidate",
    description:
      "Live German tech openings by seniority, stack, city and employer, plus 2026 EU Blue Card thresholds, the Opportunity Card, the IT route without a degree and temporary protection for Ukrainians.",
    related: ["tech-jobs-in-poland", "tech-jobs-in-uk", "tech-jobs-in-usa"],
    blocks: [
      { t: "p", text: "Germany is the largest tech employer in the EU and one of the most popular destinations for Ukrainian engineers. Berlin, Munich, Hamburg and a long tail of smaller hubs all hire, and the legal routes for skilled workers are comparatively well defined." },
      ...liveData("DE", "Germany"),
      { t: "h2", text: "Work routes for IT professionals" },
      { t: "ul", items: [
        "**EU Blue Card.** For 2026 the minimum gross salary is €50,700 a year; a reduced €45,934.20 applies to shortage occupations and recent graduates, with Federal Employment Agency approval needed in the shortage tier for people under 45. Thresholds are updated every year ([Make it in Germany](https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card)).",
        "**IT specialists without a degree.** Under section 19c, people with at least three years of IT experience in the last seven years and a job offer at €45,934.20 or more can qualify, with Federal Employment Agency approval ([Make it in Germany IT brochure](https://www.make-it-in-germany.com/fileadmin/1_Rebrush_2022/a_Fachkraefte/PDF-Dateien/3_Visum_u_Aufenthalt/Visagrafik_EN/Visaoptionen_IT_aus_Drittstaaten_EN.pdf)). Embassy guidance has mentioned German at B1 as typically required, so confirm the language rule with your embassy.",
        "**Opportunity Card (Chancenkarte).** A points-based permit to look for work for up to a year: you need at least 6 points (or a fully recognised qualification), proof of funds of about €1,091 a month, and you may work up to 20 hours a week while searching ([Make it in Germany](https://www.make-it-in-germany.com/en/visa-residence/types/job-search-opportunity-card)).",
      ] },
      { t: "h2", text: "Ukrainians in Germany" },
      { t: "p", text: "Temporary protection for Ukrainians now has an EU-level extension to 4 March 2028, applying from 5 March 2027 ([EUR-Lex](https://eur-lex.europa.eu/eli/dec_impl/2026/1912/oj/eng)). New applicants from 31 July 2026 must show they have met Ukrainian military obligations, while people already protected by 30 July 2026 are exempt. Holders of the German section 24 permit may work in Germany without a separate work permit; recognition of qualifications is mandatory only for regulated professions ([Germany4Ukraine](https://www.germany4ukraine.de/EN/arbeit-und-soziales/ukrainer-arbeiten-in-deutschland/seite_node.html))." },
      { t: "h2", text: "Do you need German?" },
      { t: "p", text: "It depends on the role. The official portal notes that exceptions are possible in IT, and many international teams in Berlin or Munich work in English, but most listings on the federal job portal are in German. Check the language requirement in each posting and filter for English-language roles in your search." },
      WORLD_LINKS("de", "Germany", [{ href: "/jobs/city/berlin", label: "Berlin" }, { href: "/jobs/city/munich", label: "Munich" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "What salary do I need for the EU Blue Card in 2026?", a: "€50,700 gross a year in general, or €45,934.20 for shortage occupations and recent graduates. The figures are updated every year." },
      { q: "Can I work remotely for a German company from Ukraine?", a: "The official Make it in Germany pages do not address this directly. Remote contractor or employer-of-record arrangements depend on the tax and legal rules where you live, so ask the employer how they handle it." },
    ],
  }),

  // ───────────────── Canada ─────────────────
  guide({
    slug: "tech-jobs-in-canada",
    title: "Tech Jobs in Canada for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Canada as a Ukrainian or international candidate",
    description:
      "Live Canadian tech openings by seniority, stack, city and employer, plus Express Entry, the STEM category, the Global Talent Stream and what is left of the Ukraine-specific measures in 2026.",
    related: ["tech-jobs-in-usa", "tech-jobs-in-uk", "tech-jobs-in-germany"],
    blocks: [
      { t: "p", text: "Canada combines a growing tech market (Toronto, Vancouver, Montréal, Ottawa, Calgary) with immigration programmes designed for skilled workers. For many candidates the route is either permanent residence through Express Entry or a work permit through an employer." },
      ...liveData("CA", "Canada"),
      { t: "h2", text: "Routes for tech workers" },
      { t: "ul", items: [
        "**Express Entry — Federal Skilled Worker.** Requires English or French at CLB 7, at least one year of skilled experience, an educational credential assessment for foreign degrees and a minimum of 67 points; a job offer is not required ([IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html)).",
        "**Category-based draws.** 2026 categories include STEM occupations; renewed categories now require one year of experience instead of six months ([IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/02/attracting-the-worlds-best-talent-to-fill-canadas-labour-gaps-and-build-our-economy.html)). Canada has also consulted on reforms such as raising the language bar and reinstating job-offer points, but final rules were not confirmed at the time of writing.",
        "**Global Talent Stream.** Employers hiring in listed tech occupations can use a fast-track Labour Market Impact Assessment (fee: CAD 1,000 per position), with a two-week work-permit processing target; the permit must be applied for from outside Canada ([ESDC](https://www.canada.ca/en/employment-social-development/services/foreign-workers/global-talent/requirements.html)).",
      ] },
      { t: "p", text: "Job-offer points in Express Entry were removed in March 2025, so a Canadian job offer no longer adds ranking points the way it used to." },
      { t: "h2", text: "Ukrainian-specific measures" },
      { t: "p", text: "The CUAET programme ended in July 2023. Ukrainians already in Canada may be able to extend their open work permit under a public policy valid from 1 April 2026 to 31 March 2027 for people who arrived by the cut-off dates ([IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/public-policies/ukraine-april-2026.html)). The family-based permanent residence pathway for Ukrainians has closed." },
      { t: "h2", text: "Working for a Canadian employer from abroad" },
      { t: "p", text: "Canadian immigration rules apply to work performed in Canada. IRCC has said that digital nomads may stay as visitors for up to six months while working for employers outside Canada, but a Canadian employer who wants you to work in Canada needs a work-permit route. See [remote roles in Canada](/jobs/country/ca/remote) and [worldwide remote roles](/jobs/country/ww)." },
      WORLD_LINKS("ca", "Canada", [{ href: "/jobs/city/toronto", label: "Toronto" }, { href: "/jobs/city/vancouver", label: "Vancouver" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "Do I need a job offer for Express Entry?", a: "No, the Federal Skilled Worker programme does not require one, although a Canadian job offer helps in other ways. Job-offer points were removed in March 2025." },
      { q: "Is CUAET still open?", a: "No. It ended in July 2023. Ukrainians already in Canada may extend work permits under a public policy that runs to 31 March 2027." },
    ],
  }),

  // ───────────────── Poland ─────────────────
  guide({
    slug: "tech-jobs-in-poland",
    title: "Tech Jobs in Poland for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Poland as a Ukrainian or international candidate",
    description:
      "Live Polish tech openings by seniority, stack, city and employer, plus how work permits, the EU Blue Card and Ukrainian status (UKR, CUKR card) work in 2026.",
    related: ["tech-jobs-in-germany", "tech-jobs-in-uk", "tech-jobs-in-canada"],
    blocks: [
      { t: "p", text: "Poland is the closest big tech market for Ukrainians: Warsaw, Kraków, Wrocław, Gdańsk and other cities host large engineering teams of global companies, and many Ukrainian professionals already live and work there. The rules for Ukrainians changed substantially in 2026, so it is worth reading the status section carefully." },
      ...liveData("PL", "Poland"),
      { t: "h2", text: "Work routes" },
      { t: "ul", items: [
        "**Work permit.** The employer applies online through praca.gov.pl; a permit is valid for up to three years. A new act has applied since 1 June 2025: the labour-market test was abolished and applications are electronic ([official guide](https://psz.praca.gov.pl/documents/10240/42353333/WORK+IN+POLAND_GUIDE+FOR+FOREIGNERS+FROM+THIRD+COUNTRIES_EN.pdf)). Since that date a tourist or other Schengen visa does not authorise work.",
        "**Employer declaration.** A simplified route for citizens of Ukraine, Armenia, Belarus, Georgia and Moldova, valid up to 24 months ([gov.pl](https://www.gov.pl/web/mswia-en/entry-conditions-for-working-purposes)).",
        "**EU Blue Card.** The gross annual salary must be at least 150% of the previous year's national average wage, with a contract of at least six months. Based on the 2025 average of 8,903.56 PLN, that is roughly 13,355 PLN gross a month ([official page](https://zielonalinia.gov.pl/niebieska-karta-41531/)).",
        "**Poland Business Harbour** (a fast-track IT visa programme) is suspended; some older articles still describe it as active.",
      ] },
      { t: "h2", text: "Ukrainians in Poland" },
      { t: "p", text: "Ukrainian special status (UKR) was extended to 4 March 2027, and the special rules are being phased out under an act of 23 January 2026. The CUKR residence card is valid for three years, requires 365 days of continuous UKR status and status held on 4 June 2025, is applied for online and can be filed until 4 March 2027 ([gov.pl](https://www.gov.pl/web/uw-warminsko-mazurski/nowa-procedura-uzyskania-karty-pobytu-cukr-dla-obywateli-ukrainy-od-4-maja-2026-r)). UKR and CUKR holders may work without a separate work permit; the employer notifies the labour office within seven days." },
      { t: "h2", text: "Working for a Polish company from abroad" },
      { t: "p", text: "According to the official Green Line portal, a foreigner working remotely from outside Poland for a Polish employer does not need a Polish work permit, while remote work performed while physically in Poland does need authorisation ([zielonalinia.gov.pl](https://zielonalinia.gov.pl/praca-zdalna-swiadczona-przez-cudzoziemca/); the page dates from 2021, so verify). See [remote roles in Poland](/jobs/country/pl/remote)." },
      WORLD_LINKS("pl", "Poland", [{ href: "/jobs/city/warsaw", label: "Warsaw" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "Do I need Polish to work in tech in Poland?", a: "Many international and product teams work in English, and the language is set by the employer rather than by law. Check the language line in each job posting." },
      { q: "Is the Poland Business Harbour programme still running?", a: "No — it is suspended, although some older pages still describe it as active." },
    ],
  }),

  // ───────────────── Israel ─────────────────
  guide({
    slug: "tech-jobs-in-israel",
    title: "Tech Jobs in Israel for Ukrainian and International Candidates (2026)",
    h1: "How to find a tech job in Israel as a Ukrainian or international candidate",
    description:
      "Live Israeli tech openings by seniority, stack, city and employer, plus how the expert B/1 visa, the Innovation Authority route and the Ukrainian experts arrangement work.",
    related: ["tech-jobs-in-usa", "tech-jobs-in-germany", "tech-jobs-in-uk"],
    blocks: [
      { t: "p", text: "Israel is one of the densest tech ecosystems in the world, centred on Tel Aviv, Herzliya, Haifa and Jerusalem. Hiring engineers from abroad is possible but narrower than in most other countries, because the main visa routes are built around expert, high-salary roles." },
      ...liveData("IL", "Israel"),
      { t: "h2", text: "How foreign tech workers are hired" },
      { t: "ul", items: [
        "**B/1 expert visa.** The employer applies. The test is unique expertise that is not available in Israel, or pay of at least twice the average wage; initial validity is up to two years with a total cap of 63 months ([Ministry of Interior procedure](https://www.gov.il/BlobFolder/policy/request_for_working_permit_expert_foreign_workers_procedure/en/5.3.0041en.pdf), 2020 edition — check for updates).",
        "**High-tech companies.** A separate procedure applies to companies recognised as high-tech by the Israel Innovation Authority, again requiring pay of at least twice the average wage, with options and shares not counting towards it ([procedure 5.3.0043](https://www.gov.il/BlobFolder/policy/hightech_cyber_companies_application_for_foreign_workers_procedure/he/5.3.0043_eng.pdf)).",
        "**Innovation Authority incentive programme.** Covers nationals who are exempt from visas and earn at least twice the average wage, with visas up to one year, renewable up to five years ([Innovation Authority](https://innovationisrael.org.il/en/programs/visas-for-foreign-high-tech-experts-incentive-program/)).",
      ] },
      { t: "h2", text: "Ukrainian experts" },
      { t: "p", text: "The Innovation Authority describes an arrangement under which technology companies may bring Ukrainian high-tech experts, with their families, for up to 90 days without a minimum salary requirement, for experts arriving after 10 April 2022. It is a short-term arrangement, not a long-term work visa." },
      { t: "h2", text: "Remote work and practical notes" },
      { t: "p", text: "Many Israeli companies hire remote engineers abroad through contractor or employer-of-record arrangements, so remote roles may be the more realistic starting point. See [worldwide remote roles](/jobs/country/ww) and [remote roles in Israel](/jobs/country/il/remote). For travel or relocation, check your government's current travel advisory and the official Israeli immigration pages, since conditions can change quickly." },
      WORLD_LINKS("il", "Israel", [{ href: "/jobs/city/tel-aviv-yafo", label: "Tel Aviv" }, { href: "/jobs/city/herzliya", label: "Herzliya" }]),
      { t: "note", text: CHECKED },
    ],
    faq: [
      { q: "What salary do I need for an Israeli expert visa?", a: "The official procedures refer to pay of at least twice the average wage, or unique expertise not available in Israel." },
      { q: "Is the 90-day arrangement for Ukrainians a work visa?", a: "No, it is a short-term arrangement for high-tech experts, not a long-term work visa." },
    ],
  }),
];

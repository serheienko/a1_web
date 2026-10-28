import type { RoleUi } from "@/lib/cv-roles/types";

// Polski. Wspólne teksty stron „Przykład CV według stanowiska” (28.10.2026).
export const pl: RoleUi = {
  breadcrumbExamples: "Przykłady CV",
  titleTpl: "CV {role}: przykład {year} + PDF | A1",
  descriptionTpl:
    "CV {role}: przykład {year} z umiejętnościami i zarobkami z prawdziwych ofert A1, wzorami podsumowania i radami. Stwórz darmowe CV w PDF.",
  h1Tpl: "CV {role}: przykład {year}",
  leadTpl:
    "Co wpisać w CV {role}, jakich umiejętności wymagają pracodawcy i ile płacą, na podstawie prawdziwych ofert z A1. Stwórz takie CV w PDF za darmo ze swojego profilu.",
  ctaCreate: "Stwórz CV za darmo",
  ctaDownload: "Pobierz moje CV",
  ctaFill: "Uzupełnij profil",
  signedInHint: "CV powstaje z Twojego profilu. Im pełniejszy profil, tym mocniejsze CV.",
  h2Recruiters: "Na co rekruter patrzy najpierw",
  h2Skills: "Czego wymaga {n} ofert na A1",
  skillsNote: "Odsetek ofert na to stanowisko w A1, w których pojawia się dana umiejętność.",
  skillsFallback: "Kluczowe umiejętności na tym stanowisku",
  h2Salary: "Zarobki w ofertach A1",
  salaryNote: "Mediana widełek w ofertach z podanym wynagrodzeniem, USD miesięcznie.",
  salaryFrom: "od",
  salaryTo: "do",
  h2Summaries: "Przykłady podsumowania zawodowego",
  levels: { junior: "Junior", middle: "Mid", senior: "Senior" },
  h2Tip: "Rada dla tego stanowiska",
  h2Github: "Jak pokazać projekty i GitHub",
  githubText:
    "Linki do 2-3 prawdziwych projektów przekonują bardziej niż długa lista technologii: krótko opisz, co zrobiłeś samodzielnie i jaki był efekt. Zweryfikuj GitHub w profilu A1, logując się do GitHuba, a w CV pojawi się kafelek z kalendarzem aktywności i prawdziwą liczbą kontrybucji.",
  h2Mistakes: "Typowe błędy w CV dla IT",
  mistakes: [
    "Lista obowiązków zamiast efektów. Zamiast „pracowałem nad backendem” napisz, co się zmieniło: szybkość, liczba użytkowników, mniej błędów.",
    "Wszystkie technologie, z którymi kiedykolwiek miałeś styczność. Zostaw te, o których swobodnie porozmawiasz na rozmowie, i pokaż poziom.",
    "Jedno CV do wszystkich ofert. Używaj tych samych nazw umiejętności co w ogłoszeniu, żeby znalazł Cię i rekruter, i system ATS.",
    "Brak linków do kodu lub portfolio albo linki, które nie działają. Otwórz każdy link przed wysłaniem CV.",
    "Literówki i niespójne nazwy technologii, np. „javascript”, „JS” i „JavaScript” w jednym dokumencie. Pisz je tak jak w oficjalnej dokumentacji.",
  ],
  h2Faq: "Najczęstsze pytania",
  faq: [
    {
      q: "Jak długie powinno być CV {role}?",
      a: "Dla juniora i mida wystarczy jedna strona, senior może mieć dwie. CV z A1 mieści się na jednej stronie, a przy rozbudowanym profilu schludnie przechodzi na drugą.",
    },
    {
      q: "Jak napisać CV {role} bez doświadczenia?",
      a: "Pokaż projekty z nauki i własne, kursy, hackathony i wolontariat. Zweryfikowany GitHub z kalendarzem aktywności w CV z A1 wyraźnie pokazuje, że regularnie praktykujesz.",
    },
    {
      q: "Jakie umiejętności wpisać w CV {role}?",
      a: "Te, które najczęściej pojawiają się w ofertach: zobacz statystyki powyżej. Poziom każdej umiejętności w CV z A1 pochodzi z suwaka w profilu, więc oceń się uczciwie.",
    },
    {
      q: "Czy CV {role} powinno być po angielsku?",
      a: "Dla firm międzynarodowych i ofert z zagranicy tak. A1 rozpoznaje język CV po tekście profilu: wypełnij profil po angielsku, a nagłówki też będą po angielsku.",
    },
  ],
  h2Related: "Podobne stanowiska",
  h2Jobs: "Najnowsze oferty: {role}",
  jobsMore: "Wszystkie oferty",
  hubTitle: "Przykłady CV według zawodu",
  hubLead:
    "Na co patrzą rekruterzy, jakich umiejętności wymagają oferty w A1 i ile płacą. Wybierz swoje stanowisko.",
};

import type { CvLandingContent } from "@/lib/cv-landing/types";

// Polski. Lokalizacja z uk.ts (28.10.2026). Główna fraza: "kreator CV". Forma "Ty", jak na stronie.
export const pl: CvLandingContent = {
  title: "Kreator CV za darmo dla IT: PDF z kodem QR | A1",
  description:
    "Stwórz CV dla IT za darmo z profilu A1: gotowy PDF, kod QR do Twojego profilu na żywo, zweryfikowany GitHub i Stack Overflow. Bez opłat i okresów próbnych.",
  breadcrumbHome: "A1",
  breadcrumb: "Kreator CV",
  eyebrow: "CV Builder dla IT",
  h1: "Kreator CV dla specjalistów IT: za darmo, w PDF",
  lead:
    "Wypełnij profil w A1 raz, a my zrobimy z niego ładne CV w PDF: zdjęcie, doświadczenie, umiejętności z poziomami, języki, statystyki GitHub i kod QR do Twojego profilu na żywo. Bez opłat, bez okresu próbnego, bez karty.",
  badges: ["Za darmo na zawsze", "PDF w kilka sekund", "QR do profilu na żywo"],
  ctaCreate: "Stwórz CV za darmo",
  ctaDownload: "Pobierz moje CV",
  ctaFill: "Uzupełnij profil",
  signedInHint: "CV powstaje z Twojego profilu. Im pełniejszy profil, tym mocniejsze CV.",
  sampleAlt: "Przykładowe CV z A1: zdjęcie, umiejętności, doświadczenie, statystyki GitHub i kod QR",

  stepsTitle: "Jak to działa: 3 kroki",
  steps: [
    {
      title: "Zaloguj się do A1",
      text: "Rejestracja zajmuje minutę: e-mail, Google lub Apple. Twój profil w A1 jest podstawą Twojego CV.",
    },
    {
      title: "Wypełnij profil",
      text: "Dodaj doświadczenie, wykształcenie, umiejętności z poziomami, języki i linki. Zweryfikuj GitHub, Dribbble lub Stack Overflow, aby w CV pojawiły się statystyki na żywo.",
    },
    {
      title: "Pobierz PDF",
      text: "Kliknij „Zapisz CV” w profilu. Dostajesz gotowy plik z kodem QR, klikalnymi linkami i starannym designem A1.",
    },
  ],

  insideTitle: "Co znajdziesz w swoim CV",
  insideLead:
    "Zebraliśmy to, co rekruter IT chce zobaczyć w pierwszych 10 sekundach, i usunęliśmy wszystko zbędne. Pustych sekcji nie pokazujemy: jeśli czegoś nie ma w profilu, CV po prostu jest bardziej zwarte.",
  inside: [
    {
      title: "Kod QR do profilu na żywo",
      text: "Rekruter skanuje kod z wydruku albo klika go w PDF i widzi Twój aktualny profil w A1: świeże doświadczenie, projekty, głosowe przedstawienie się.",
    },
    {
      title: "Zweryfikowane statystyki",
      text: "Kontrybucje na GitHubie z kalendarzem aktywności, prace z Dribbble, reputacja i odznaki ze Stack Overflow. Tylko z kont, które zweryfikowałeś.",
    },
    {
      title: "Umiejętności z poziomami",
      text: "Poziom każdej umiejętności pochodzi z suwaka w Twoim profilu. Najmocniejsze umiejętności są na początku.",
    },
    {
      title: "Doświadczenie na osi czasu",
      text: "Firmy, lata i opis roli układają się w czytelną linię. Rekruter od razu widzi, ile masz lat doświadczenia.",
    },
    {
      title: "Klikalne kontakty",
      text: "E-mail, Telegram, strona i profil otwierają się jednym kliknięciem prosto z PDF. Telefon i e-mail pojawiają się tylko wtedy, gdy udostępnisz je w profilu.",
    },
    {
      title: "Głosowe przedstawienie się",
      text: "Jeśli w profilu masz nagrane „o mnie”, w CV pojawi się przycisk „Posłuchaj mnie”. Dzięki temu rekruter usłyszy Cię jeszcze przed rozmową.",
    },
  ],

  verifiedTitle: "Dlaczego rekruterzy ufają zweryfikowanym statystykom",
  verifiedText: [
    "Każdy może wpisać w CV „swobodnie posługuję się Gitem”. Pokazać 260 kontrybucji w roku i prawdziwe repozytoria może tylko ktoś, kto naprawdę pisze kod. Dlatego w CV z A1 liczby z GitHuba, Dribbble i Stack Overflow pojawiają się dopiero wtedy, gdy zweryfikujesz konto, logując się do samego serwisu.",
    "Liczby aktualizują się automatycznie. Nie musisz przepisywać CV za każdym razem, gdy zamkniesz zadanie albo opublikujesz nową pracę: po prostu pobierz PDF jeszcze raz, a znajdziesz w nim świeże dane.",
  ],

  rolesTitle: "CV dla każdej roli w IT",
  rolesLead:
    "Kreator CV działa równie dobrze dla programistów, testerów, projektantów, analityków i menedżerów. Sekcje, których nie ma w Twojej roli, po prostu się nie pojawią.",
  roles: [
    "Software Engineer",
    "Junior Developer",
    "Frontend",
    "Backend",
    "Full-Stack",
    "Python",
    "Java",
    "JavaScript / React",
    "Node.js",
    ".NET / C#",
    "PHP",
    "Flutter",
    "iOS",
    "Android",
    "QA Manual",
    "QA Automation",
    "DevOps",
    "Data Analyst",
    "Data Scientist / ML",
    "Data Engineer",
    "Product Manager",
    "Project Manager",
    "UI/UX Designer",
    "Business Analyst",
    "IT Recruiter",
  ],

  freeTitle: "Naprawdę za darmo",
  freeText:
    "Wiele „darmowych” kreatorów CV prosi o płatność właśnie przy pobieraniu albo włącza płatną subskrypcję po okresie próbnym. W A1 CV jest za darmo: dostajesz pełny PDF bez ograniczeń i możesz pobierać go tyle razy, ile chcesz.",
  compareHead: ["", "A1", "Typowy kreator"],
  compare: [
    ["Pobranie PDF", "Za darmo", "Często płatne"],
    ["Okres próbny i subskrypcja", "Brak", "Często tak"],
    ["Karta płatnicza", "Niepotrzebna", "Często wymagana"],
    ["Kod QR do profilu na żywo", "Tak", "Nie"],
    ["Zweryfikowany GitHub i Stack Overflow", "Tak", "Nie"],
    ["Oferty pracy obok CV", "Tak", "Nie"],
  ],

  atsTitle: "CV, które czytają i ludzie, i programy",
  atsText: [
    "Wiele firm najpierw przepuszcza CV przez systemy rekrutacyjne (ATS). Tekst w PDF z A1 jest prawdziwym tekstem, a nie obrazkiem: można go zaznaczyć, skopiować i wyszukać, dlatego takie systemy widzą Twoje imię, umiejętności i doświadczenie.",
    "Dla człowieka CV mieści się na jednej stronie, ma czytelne nagłówki i czyta się je w minutę. Jeśli profil jest obszerny, CV schludnie przechodzi na drugą stronę.",
  ],

  langsTitle: "CV w 9 językach",
  langsText: [
    "Nagłówki CV są dostępne po ukraińsku, angielsku, rosyjsku, niemiecku, hiszpańsku, francusku, polsku, portugalsku i chińsku. Język rozpoznajemy po tekście Twojego profilu: jeśli wypełnisz profil po polsku, CV też będzie po polsku.",
    "Twojego własnego tekstu (o mnie, opis ról) nie tłumaczymy ani nie zmieniamy: w CV będzie dokładnie to, co napisałeś.",
  ],

  jobsTitle: "Od CV do pracy",
  jobsText:
    "A1 to nie tylko kreator CV. Znajdziesz tu dziesiątki tysięcy ofert pracy w IT z Ukrainy i z całego świata, a aplikować możesz prosto z profilu, z którego powstało Twoje CV.",
  jobsCta: "Zobacz oferty",

  faqTitle: "Częste pytania",
  faq: [
    {
      q: "Czy kreator CV A1 jest naprawdę darmowy?",
      a: "Tak. Pełny PDF jest za darmo, bez okresu próbnego, bez subskrypcji i bez karty. Na dole CV jest niewielki dopisek „Stworzone w A1” i link do Twojego profilu.",
    },
    {
      q: "Czy potrzebna jest rejestracja?",
      a: "Tak, potrzebujesz profilu w A1: to z niego powstaje CV. Rejestracja zajmuje minutę, a profil działa potem i jako CV na żywo pod linkiem, i jako aplikacja na oferty pracy.",
    },
    {
      q: "Do czego służy kod QR w CV?",
      a: "Prowadzi do Twojego profilu w A1. Rekruter skanuje kod z wydrukowanego CV albo klika go w PDF i widzi aktualną wersję: nowe projekty, doświadczenie, głosowe przedstawienie się.",
    },
    {
      q: "Jak weryfikowane są statystyki GitHub, Dribbble i Stack Overflow?",
      a: "Logujesz się do samego serwisu przyciskiem „Zweryfikuj” w profilu. Potem liczby pobierają się i aktualizują automatycznie, a w CV pojawia się odpowiedni kafelek.",
    },
    {
      q: "Czy CV przejdzie przez ATS?",
      a: "Tekst w naszym PDF jest prawdziwy, nie jest obrazkiem, więc programy rekrutacyjne go czytają: imię, kontakty, umiejętności i doświadczenie. Dla pewności wpisuj nazwy umiejętności tak, jak brzmią w ofertach pracy.",
    },
    {
      q: "Czy mogę zrobić CV po angielsku?",
      a: "Tak. Język CV rozpoznajemy po tekście profilu. Napisz „o mnie” i opis doświadczenia po angielsku, a nagłówki CV też będą po angielsku.",
    },
    {
      q: "Co powinno być w CV dla IT?",
      a: "Rola i poziom, krótko o sobie, doświadczenie z rezultatami, kluczowe umiejętności, języki, linki do kodu lub portfolio. U seniora liczą się skala zadań i przywództwo, u juniora projekty z nauki i własne.",
    },
    {
      q: "Jak napisać CV bez doświadczenia komercyjnego?",
      a: "Pokaż projekty z nauki i pet projekty, kursy, hackathony i zweryfikowany GitHub. Kalendarz aktywności w CV z A1 wyraźnie pokazuje, że regularnie piszesz kod.",
    },
    {
      q: "Czy mogę ukryć telefon lub e-mail?",
      a: "Tak. Telefon i e-mail trafiają do CV tylko wtedy, gdy udostępnisz je w ustawieniach profilu. Czego nie ma w profilu, tego nie będzie też w CV.",
    },
    {
      q: "Jak zaktualizować CV?",
      a: "Zmień profil i pobierz PDF jeszcze raz. CV za każdym razem powstaje od nowa z aktualnych danych, więc niczego nie trzeba edytować osobno.",
    },
  ],

  finalTitle: "Twoje CV w kilka minut",
  finalText: "Wypełnij profil raz i pobieraj świeże CV za każdym razem, gdy będzie potrzebne.",
};

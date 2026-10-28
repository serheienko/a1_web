import type { RoleSlug, RoleText } from "@/lib/cv-roles/types";

export const pl: Record<RoleSlug, RoleText> = {
  "software-engineer": {
    name: "Software Engineer",
    nameInTitle: "inżyniera oprogramowania",
    recruiters:
      "Rekruter szuka języka i stacku, z którymi pracowałeś przez ostatnie 2-3 lata, oraz skali systemów: liczby użytkowników, zapytań i wielkości zespołu. Potem sprawdza, czy odpowiadałeś za projektowanie rozwiązań, code review i produkcję, a nie tylko za realizację zadań.",
    summaries: {
      junior:
        "Software Engineer z rocznym doświadczeniem komercyjnym w Javie i Spring Boot. Napisałem 12 endpointów REST do wewnętrznego CRM, pokryłem je testami w 80% i ograniczyłem liczbę błędów po wydaniu. Szybko odnajduję się w cudzym kodzie i dbam o czytelne pull requesty.",
      middle:
        "Software Engineer z 4 latami doświadczenia w firmach produktowych, główny stack to Go, PostgreSQL i Kafka. Przepisałem serwis powiadomień, który obsługuje dziś 3 mln wiadomości dziennie z opóźnieniem do 200 ms. Regularnie robię code review i mentoruję dwóch juniorów.",
      senior:
        "Senior Software Engineer z 8 latami doświadczenia, projektuję systemy rozproszone w Go i Kotlinie. Prowadziłem migrację monolitu do 14 mikroserwisów bez przestojów, co skróciło cykl wydań z tygodnia do jednego dnia. Odpowiadam za decyzje techniczne w zespole 7 inżynierów i prowadzę rozmowy techniczne.",
    },
    tip: "Przy każdym miejscu pracy dodaj jedną linijkę o skali: ilu użytkowników, ile RPS lub danych obsługiwał Twój system. Ta liczba pokazuje poziom zadań lepiej niż lista technologii.",
    skills: ["Java", "Go", "PostgreSQL", "REST API", "Docker", "Kafka", "System Design", "Git"],
  },
  "junior-developer": {
    name: "Junior Developer",
    nameInTitle: "programisty juniora",
    recruiters:
      "W CV juniora rekruter szuka przede wszystkim prawdziwych projektów z linkiem do GitHuba lub działającej strony, a nie samej listy kursów. Ocenia też poziom angielskiego, gotowość do zadania rekrutacyjnego i to, jak jasno opisałeś, co zrobiłeś samodzielnie.",
    summaries: {
      junior:
        "Junior Developer JavaScript i React, po bootcampie i 6 miesiącach pracy nad własnymi projektami. Zbudowałem aplikację do śledzenia wydatków z logowaniem, wykresami i wdrożeniem na Vercel, korzysta z niej 40 znajomych. Szukam zespołu, w którym będę się rozwijać dzięki code review.",
      middle:
        "Początkujący programista po 4-miesięcznym stażu w software housie, Python i Django. Zamknąłem 25 zadań w prawdziwym projekcie i napisałem parser raportów, który oszczędza menedżerom 3 godziny tygodniowo. Jestem gotowy na zadanie rekrutacyjne i pracę stacjonarną lub zdalną.",
      senior:
        "Przebranżowiłem się z inżynierii, mam za sobą 9 miesięcy nauki i 3 ukończone projekty w TypeScript i Node.js. Z mojego bota na Telegramie do rezerwacji sal korzystają codziennie 2 biura. Doświadczenie w pracy z ludźmi i terminami z poprzedniego zawodu pomaga mi w pracy zespołowej.",
    },
    tip: "Umieść sekcję „Projekty” nad wykształceniem i przy każdym projekcie podaj link, stack i jedno zdanie o efekcie. Rekruter powinien otworzyć Twój kod jednym kliknięciem.",
    skills: ["JavaScript", "HTML/CSS", "Git", "React", "SQL", "REST API", "Python"],
  },
  "frontend-developer": {
    name: "Frontend Developer",
    nameInTitle: "Frontend Developera",
    recruiters:
      "Rekruter patrzy na framework (React, Vue lub Angular), TypeScript i doświadczenie z zarządzaniem stanem. Ważne są linki do działających interfejsów, które zbudowałeś, oraz wzmianki o wydajności, responsywności i dostępności.",
    summaries: {
      junior:
        "Frontend Developer z rocznym doświadczeniem w React i TypeScript. Zakodowałem 15 responsywnych landing page'y według makiet z Figmy z wynikiem Lighthouse powyżej 90. Swobodnie pracuję z CSS Grid, Flexboxem i podstawami dostępności.",
      middle:
        "Frontend Developer z 4 latami doświadczenia, React, Next.js, Redux Toolkit. Skróciłem czas ładowania strony głównej sklepu internetowego z 4,2 do 1,6 s dzięki code splittingowi i optymalizacji obrazów, konwersja wzrosła o 9%. Buduję biblioteki komponentów w Storybooku.",
      senior:
        "Senior Frontend Developer z 7 latami doświadczenia, odpowiadam za architekturę frontendu platformy SaaS. Wdrożyłem design system z 60 komponentami, z którego korzystają 4 zespoły, i zmigrowałem projekt na TypeScript bez wstrzymywania wydań. Konfiguruję CI z testami wizualnymi i mentoruję programistów.",
    },
    tip: "Dodaj linki do 2-3 działających interfejsów i podaj wyniki Lighthouse lub Core Web Vitals przed Twoją pracą i po niej. Dla frontendu to najbardziej przekonujący dowód jakości.",
    skills: ["React", "TypeScript", "Next.js", "Redux", "HTML/CSS", "Tailwind CSS", "Jest", "Figma"],
  },
  "backend-developer": {
    name: "Backend Developer",
    nameInTitle: "Backend Developera",
    recruiters:
      "Rekrutera interesuje język i framework, bazy danych oraz praca pod obciążeniem. Patrzy na doświadczenie z kolejkami, cache'owaniem, projektowaniem API i na to, czy utrzymywałeś serwisy na produkcji.",
    summaries: {
      junior:
        "Backend Developer z rocznym doświadczeniem w Node.js i PostgreSQL. Stworzyłem API dla aplikacji mobilnej do dostaw: 20 endpointów, autoryzacja JWT i dokumentacja w Swaggerze. Piszę testy integracyjne i umiem czytać plany zapytań.",
      middle:
        "Backend Developer z 4 latami doświadczenia, Python, FastAPI, PostgreSQL, Redis. Zoptymalizowałem zapytania i dodałem cache, co skróciło średni czas odpowiedzi API z 800 do 120 ms przy 2 tys. RPS. Wdrożyłem asynchroniczną obsługę płatności przez RabbitMQ.",
      senior:
        "Senior Backend Developer z 8 latami doświadczenia w fintechu, Java, Spring, Kafka. Zaprojektowałem bramkę płatniczą obsługującą 1,5 mln transakcji dziennie z dostępnością 99,95%. Odpowiadam za decyzje architektoniczne, dyżury on-call i rekrutację do zespołu backendu.",
    },
    tip: "Opisz przynajmniej jeden przypadek, w którym znalazłeś i usunąłeś wąskie gardło: co spowalniało system, co zmieniłeś i jak zmienił się czas odpowiedzi lub obciążenie bazy.",
    skills: ["Node.js", "Python", "PostgreSQL", "Redis", "Docker", "REST API", "RabbitMQ", "Microservices"],
  },
  "full-stack-developer": {
    name: "Full Stack Developer",
    nameInTitle: "Full Stack Developera",
    recruiters:
      "Rekruter sprawdza, czy naprawdę pracowałeś z obiema warstwami: konkretnym frameworkiem frontendowym i konkretnym backendem, a nie tylko z listą 20 technologii. Plusem są funkcje, które samodzielnie doprowadziłeś od bazy danych do interfejsu i wdrożenia.",
    summaries: {
      junior:
        "Full Stack Developer z rocznym doświadczeniem w React, Node.js i MongoDB. Samodzielnie zbudowałem system rezerwacji wizyt dla salonu: interfejs, API, przypomnienia mailowe i wdrożenie na Railway. Co miesiąc korzysta z niego ponad 300 klientów.",
      middle:
        "Full Stack Developer z 4 latami doświadczenia, Next.js, NestJS, PostgreSQL. W całości zbudowałem moduł subskrypcji z płatnościami Stripe, który w pół roku dał 18% przychodu produktu. Piszę testy e2e w Playwright i konfiguruję CI w GitHub Actions.",
      senior:
        "Senior Full Stack Developer z 8 latami doświadczenia, TypeScript na froncie i backendzie, AWS. Jako tech lead uruchomiłem MVP platformy B2B w 3 miesiące z zespołem 4 osób, dziś ma 120 płacących klientów. Odpowiadam za architekturę, infrastrukturę i proces wydań.",
    },
    tip: "Pokaż jedną funkcję „od końca do końca”: schemat bazy, API, interfejs, wdrożenie i efekt biznesowy. Wtedy rekruter widzi, że jesteś full stackiem, a nie frontendowcem z backendem na liście.",
    skills: ["TypeScript", "React", "Next.js", "Node.js", "NestJS", "PostgreSQL", "Docker", "AWS"],
  },
  "python-developer": {
    name: "Programista Python",
    nameInTitle: "programisty Python",
    recruiters:
      "Rekruter najpierw sprawdza, do czego używałeś Pythona: web (Django, FastAPI), dane czy automatyzacja, bo to zupełnie różne oferty. Dalej patrzy na bazy danych, asynchroniczność, testy i doświadczenie z Celery lub kolejkami.",
    summaries: {
      junior:
        "Programista Python z rocznym doświadczeniem w Django i PostgreSQL. Napisałem skrypty automatyzujące raportowanie, które oszczędzają działowi sprzedaży 10 godzin ręcznej pracy tygodniowo. Pokrywam kod testami pytest i trzymam się PEP 8.",
      middle:
        "Programista Python z 4 latami doświadczenia, FastAPI, SQLAlchemy, Celery, Redis. Przepisałem synchroniczny serwis importu na asyncio i przetwarzanie 500 tys. produktów skróciło się z 6 godzin do 40 minut. Pracuję z Dockerem, Kubernetesem i monitoringiem w Grafanie.",
      senior:
        "Senior programista Python z 8 latami doświadczenia, buduję wysokowydajne API i pipeline'y danych. Zaprojektowałem platformę przetwarzania zdarzeń na 50 mln rekordów dziennie z Kafką i ClickHouse. Ustalam standardy kodu w zespole, wprowadziłem typowanie mypy i zmniejszyłem liczbę incydentów o 35%.",
    },
    tip: "W pierwszej linijce CV jasno napisz, jaka jest Twoja specjalizacja w Pythonie: backend webowy, dane czy automatyzacja. Jedno CV na wszystkie trzy kierunki działa słabiej.",
    skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Celery", "Redis", "pytest", "Docker"],
  },
  "java-developer": {
    name: "Programista Java",
    nameInTitle: "programisty Java",
    recruiters:
      "Rekruter szuka wersji Javy, Spring Boot, Hibernate i doświadczenia z mikroserwisami. Na poziomie mid i senior liczą się wielowątkowość, optymalizacja JVM, Kafka i praca w dużych projektach enterprise lub fintech.",
    summaries: {
      junior:
        "Programista Java z rocznym doświadczeniem, Java 17, Spring Boot, Hibernate. Zbudowałem moduł raportów dla systemu bankowego z eksportem do Excela i pokryłem go testami JUnit w 85%. Rozumiem OOP, SOLID i podstawowe wzorce projektowe.",
      middle:
        "Programista Java z 5 latami doświadczenia, Spring Boot, Kafka, PostgreSQL. Podzieliłem monolit obsługi zamówień na 6 mikroserwisów, co pozwoliło skalować szczytowe obciążenie czterokrotnie. Wdrożyłem tracing w OpenTelemetry i o połowę skróciłem czas szukania przyczyn incydentów.",
      senior:
        "Senior programista Java z 9 latami doświadczenia w fintechu i telekomunikacji. Dostroiłem GC i pamięć JVM, co obniżyło opóźnienie p99 serwisu płatności z 900 do 150 ms. Prowadzę przeglądy architektury i szkolę zespół 6 inżynierów.",
    },
    tip: "Podawaj dokładne wersje Javy i Springa, z którymi pracowałeś. Rekruterzy często filtrują po Java 11+ lub Java 17+, a samo „Java” bez wersji wygląda na przestarzałe doświadczenie.",
    skills: ["Java 17", "Spring Boot", "Hibernate", "Kafka", "PostgreSQL", "JUnit", "Maven", "Microservices"],
  },
  "javascript-react-developer": {
    name: "React Developer",
    nameInTitle: "React Developera",
    recruiters:
      "Rekruter patrzy na pewną znajomość React hooks, TypeScriptu i bibliotek stanu (Redux, Zustand, React Query). Ważne są Next.js, testowanie komponentów i działające przykłady interfejsów.",
    summaries: {
      junior:
        "React Developer z rocznym doświadczeniem, React, TypeScript, React Query. Zbudowałem panel administracyjny z tabelami, filtrami i formularzami w React Hook Form dla wewnętrznego systemu. Piszę testy w Testing Library i pilnuję zbędnych rerenderów.",
      middle:
        "React Developer z 4 latami doświadczenia, Next.js, TypeScript, Zustand. Przeniosłem renderowanie marketplace'u na SSR i ruch organiczny wzrósł o 30% w 3 miesiące. Stworzyłem w Storybooku bibliotekę wspólnych komponentów dla trzech produktów.",
      senior:
        "Senior React Developer z 7 latami doświadczenia, projektuję frontend dużych produktów SaaS. Wdrożyłem mikrofrontendy dla 5 zespołów, co skróciło czas budowania z 12 do 3 minut. Odpowiadam za wydajność, standardy kodu i rozmowy techniczne z kandydatami.",
    },
    tip: "Wspomnij, jak walczyłeś ze zbędnymi rerenderami lub dużym bundlem: narzędzie, zmiana, wynik w milisekundach albo kilobajtach. To odróżnia React Developera od osoby, która tylko koduje layout.",
    skills: ["React", "TypeScript", "Next.js", "Redux Toolkit", "React Query", "Jest", "Testing Library", "Webpack"],
  },
  "nodejs-developer": {
    name: "Node.js Developer",
    nameInTitle: "Node.js Developera",
    recruiters:
      "Rekruter sprawdza framework (Express, NestJS, Fastify), TypeScript, bazy danych i rozumienie event loopa. Cenione są też kolejki, WebSockety i wdrażanie serwisów w Dockerze i chmurze.",
    summaries: {
      junior:
        "Node.js Developer z rocznym doświadczeniem, Express, TypeScript, MongoDB. Zbudowałem API do rezerwacji biletów z 18 endpointami i walidacją w Zod. Pokryłem logikę testami Jest i skonfigurowałem automatyczne wdrożenia w GitHub Actions.",
      middle:
        "Node.js Developer z 4 latami doświadczenia, NestJS, PostgreSQL, Redis, BullMQ. Stworzyłem serwis czatu na WebSocketach, który utrzymuje 20 tys. jednoczesnych połączeń. Przeniosłem ciężkie generowanie PDF do kolejek i czas odpowiedzi API spadł trzykrotnie.",
      senior:
        "Senior Node.js Developer z 8 latami doświadczenia, architektura backendu w TypeScript i AWS. Zaprojektowałem platformę event-driven z 30 serwisów na SQS i Lambda, która przetwarza 4 mln zdarzeń dziennie. Znalazłem i usunąłem wycieki pamięci, przez które produkcja padała co tydzień.",
    },
    tip: "Pokaż, że rozumiesz asynchroniczność: opisz przypadek z kolejkami, streamami lub profilowaniem event loopa i podaj, co to dało w liczbach.",
    skills: ["Node.js", "TypeScript", "NestJS", "Express", "PostgreSQL", "Redis", "Docker", "AWS"],
  },
  "dotnet-developer": {
    name: "Programista .NET",
    nameInTitle: "programisty .NET",
    recruiters:
      "Rekruter szuka C#, nowoczesnego .NET (6, 8), ASP.NET Core i Entity Framework. Ważne są Azure, MS SQL i to, czy pracowałeś z legacy .NET Framework, czy z nowymi projektami.",
    summaries: {
      junior:
        "Programista .NET z rocznym doświadczeniem, C#, ASP.NET Core, Entity Framework, MS SQL. Zbudowałem moduł zarządzania magazynem z REST API i raportami, pokryty testami xUnit. Znam zasady SOLID i stosuję Dependency Injection.",
      middle:
        "Programista .NET z 4 latami doświadczenia, .NET 8, ASP.NET Core, Azure. Zmigrowałem 3 serwisy z .NET Framework 4.7 na .NET 8, co obniżyło koszty hostingu o 35%. Wprowadziłem CQRS z MediatR i testy integracyjne z Testcontainers.",
      senior:
        "Senior programista .NET z 9 latami doświadczenia w enterprise i ochronie zdrowia. Zaprojektowałem platformę na Azure Service Bus i Kubernetesie, która obsługuje 200 klinik. Odpowiadam za architekturę, bezpieczeństwo danych i rozwój zespołu 8 programistów.",
    },
    tip: "Wyraźnie oddziel doświadczenie z .NET Framework od nowoczesnego .NET. Jeśli robiłeś migrację, opisz ją w osobnym punkcie z wynikiem, bo to jedno z najczęstszych zadań w ofertach.",
    skills: ["C#", ".NET 8", "ASP.NET Core", "Entity Framework", "MS SQL", "Azure", "xUnit", "Docker"],
  },
  "php-developer": {
    name: "Programista PHP",
    nameInTitle: "programisty PHP",
    recruiters:
      "Rekruter patrzy na wersję PHP (8.x), framework Laravel lub Symfony i pracę z MySQL. Plusem są testy, kolejki, Docker i doświadczenie w utrzymaniu dużych sklepów internetowych lub systemów CMS.",
    summaries: {
      junior:
        "Programista PHP z rocznym doświadczeniem, PHP 8, Laravel, MySQL. Zintegrowałem sklep internetowy z firmą kurierską i bramką płatności, integracja obsługuje 150 zamówień dziennie. Piszę testy PHPUnit i pracuję w Git flow.",
      middle:
        "Programista PHP z 4 latami doświadczenia, Laravel, MySQL, Redis, Vue. Zoptymalizowałem katalog z 200 tys. produktów i czas ładowania strony kategorii spadł z 3 do 0,7 s. Przeniosłem zadania w tle do Laravel Queues i skonfigurowałem monitoring błędów.",
      senior:
        "Senior programista PHP z 9 latami doświadczenia, Symfony, Laravel, architektura e-commerce. Przeprowadziłem refaktoryzację projektu legacy z PHP 5.6 do PHP 8.2 z pokryciem testami 70%, liczba incydentów spadła o połowę. Prowadzę zespół 5 programistów backendu.",
    },
    tip: "Koniecznie podaj wersję PHP i napisz, czy aktualizowałeś stary kod. W ofertach PHP upgrade legacy i pokrycie testami często liczą się bardziej niż nowy framework.",
    skills: ["PHP 8", "Laravel", "Symfony", "MySQL", "Redis", "PHPUnit", "Docker", "REST API"],
  },
  "flutter-developer": {
    name: "Flutter Developer",
    nameInTitle: "programisty Flutter",
    recruiters:
      "Rekruter szuka Darta, zarządzania stanem (Bloc, Riverpod, Provider) i aplikacji opublikowanych w App Store i Google Play. Patrzy też na pracę z modułami natywnymi, Firebase i CI dla buildów mobilnych.",
    summaries: {
      junior:
        "Flutter Developer z rocznym doświadczeniem, Dart, Bloc, Firebase. Stworzyłem aplikację do śledzenia nawyków z trybem offline i powiadomieniami push, opublikowaną w Google Play, ponad 1 tys. pobrań. Piszę testy widgetów i trzymam się clean architecture.",
      middle:
        "Flutter Developer z 4 latami doświadczenia, Riverpod, Dio, Firebase, Codemagic. Wydałem 3 aplikacje w App Store i Google Play, jedna ma ocenę 4,7 i 80 tys. użytkowników. Skróciłem zimny start o 40% i skonfigurowałem automatyczne buildy.",
      senior:
        "Senior Flutter Developer z 7 latami w mobile, w tym 5 we Flutterze. Prowadziłem przejście aplikacji fintech z dwóch natywnych baz kodu na Fluttera, co przyspieszyło dostarczanie funkcji dwukrotnie. Piszę platform channels w Swift i Kotlinie, odpowiadam za architekturę i code review.",
    },
    tip: "Dodaj bezpośrednie linki do aplikacji w App Store i Google Play z liczbą pobrań lub oceną. Dla Flutter Developera to waży więcej niż jakikolwiek certyfikat.",
    skills: ["Dart", "Flutter", "Bloc", "Riverpod", "Firebase", "REST API", "Codemagic", "Git"],
  },
  "ios-developer": {
    name: "iOS Developer",
    nameInTitle: "iOS Developera",
    recruiters:
      "Rekruter patrzy na Swift, SwiftUI lub UIKit, architekturę (MVVM, VIPER, TCA) i aplikacje w App Store. Ważne są Combine lub async/await, Core Data i doświadczenie z review Apple.",
    summaries: {
      junior:
        "iOS Developer z rocznym doświadczeniem, Swift, SwiftUI, MVVM. Zbudowałem aplikację do rezerwacji siłowni z mapą i Apple Pay, opublikowaną w App Store. Korzystam z async/await, Core Data i piszę testy jednostkowe w XCTest.",
      middle:
        "iOS Developer z 4 latami doświadczenia, Swift, UIKit, SwiftUI, Combine. Przepisałem ekrany składania zamówienia na SwiftUI, a odsetek sesji bez crashy wzrósł z 98,1 do 99,7%. Skonfigurowałem Fastlane do automatycznych wydań w TestFlight.",
      senior:
        "Senior iOS Developer z 8 latami doświadczenia, architektura dużych aplikacji z ponad 1 mln użytkowników. Podzieliłem projekt na moduły w Swift Package Manager, co skróciło build z 9 do 3 minut. Mentoruję zespół 5 programistów iOS i prowadzę rozmowy techniczne.",
    },
    tip: "Podaj odsetek sesji crash-free lub ocenę aplikacji w App Store przed Twoją pracą i po niej. Tę metrykę rozumie zarówno rekruter, jak i tech lead.",
    skills: ["Swift", "SwiftUI", "UIKit", "Combine", "Core Data", "XCTest", "Fastlane", "MVVM"],
  },
  "android-developer": {
    name: "Android Developer",
    nameInTitle: "Android Developera",
    recruiters:
      "Rekruter szuka Kotlina, Jetpack Compose, korutyn i architektury MVVM lub MVI. Ważne są Dagger lub Hilt, Room i aplikacje opublikowane w Google Play.",
    summaries: {
      junior:
        "Android Developer z rocznym doświadczeniem, Kotlin, Jetpack Compose, Room. Stworzyłem aplikację do kontroli wydatków z wykresami i synchronizacją przez Firebase, 2 tys. pobrań w Google Play. Piszę testy jednostkowe i używam Hilt do DI.",
      middle:
        "Android Developer z 4 latami doświadczenia, Kotlin, Coroutines, Flow, Compose. Przeniosłem 25 ekranów z XML na Compose i zmniejszyłem liczbę ANR o 60%. Wdrożyłem Baseline Profiles, co przyspieszyło start aplikacji o 30%.",
      senior:
        "Senior Android Developer z 8 latami doświadczenia, wielomodułowa architektura aplikacji z 3 mln użytkowników. Wprowadziłem modularyzację w Gradle, która o połowę skróciła build i pozwoliła 4 zespołom pracować równolegle. Odpowiadam za stabilność, crash-free na poziomie 99,8%.",
    },
    tip: "Pokaż, że pracujesz na nowoczesnym stacku: Kotlin, Compose, korutyny. Jeśli migrowałeś projekt z Javy lub XML, opisz skalę migracji i jej wpływ na ANR albo szybkość.",
    skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Hilt", "Room", "Retrofit", "MVVM", "Gradle"],
  },
  "qa-engineer": {
    name: "Tester QA",
    nameInTitle: "testera QA",
    recruiters:
      "Rekruter sprawdza, jakie rodzaje testów wykonywałeś (funkcjonalne, regresyjne, API, mobilne) i w jakich narzędziach: Jira, TestRail, Postman, DevTools. Liczy się też, czy pisałeś przypadki testowe i dokumentację oraz czy znasz podstawy SQL.",
    summaries: {
      junior:
        "Tester QA z rocznym doświadczeniem w testach manualnych aplikacji webowych i mobilnych. Napisałem 300 przypadków testowych w TestRail i zgłosiłem ponad 150 błędów w Jirze z jasnymi krokami reprodukcji. Testuję API w Postmanie i weryfikuję dane w SQL.",
      middle:
        "Tester QA z 4 latami doświadczenia, testy platformy e-commerce na webie, iOS i Androidzie. Zbudowałem proces regresji, który zmniejszył liczbę błędów na produkcji o 40%. Testuję API, sprawdzam logi w Kibanie i piszę pierwsze testy automatyczne w Postmanie.",
      senior:
        "Senior Tester QA z 7 latami doświadczenia, odpowiadam za jakość produktu rozwijanego przez 4 zespoły. Wprowadziłem strategię testów i kryteria wydania, co zmniejszyło liczbę krytycznych incydentów po wydaniu z 6 do 1 na kwartał. Mentoruję 3 testerów i prowadzę onboarding nowych osób w QA.",
    },
    tip: "Podaj liczby: ile przypadków testowych napisałeś, ile błędów znalazłeś i jak zmieniła się liczba błędów na produkcji. Dołącz przykładowy raport błędu lub plan testów, jeśli nie łamie to NDA.",
    skills: ["Manual Testing", "Jira", "TestRail", "Postman", "SQL", "Chrome DevTools", "Regression Testing", "API Testing"],
  },
  "qa-automation-engineer": {
    name: "Tester automatyzujący",
    nameInTitle: "testera automatyzującego",
    recruiters:
      "Rekruter szuka języka testów (Java, Python, JavaScript), frameworka (Selenium, Playwright, Cypress) i integracji testów z CI. Ważne są też testy API, wzorzec Page Object i pokrycie, które faktycznie zbudowałeś.",
    summaries: {
      junior:
        "Tester automatyzujący z rocznym doświadczeniem, Python, pytest, Selenium. Zautomatyzowałem 120 scenariuszy regresyjnych aplikacji webowej, co skróciło ręczną regresję z 2 dni do 3 godzin. Uruchamiam testy w GitHub Actions i generuję raporty w Allure.",
      middle:
        "QA Automation Engineer z 4 latami doświadczenia, TypeScript, Playwright, REST Assured. Zbudowałem od zera framework z 600 testami UI i API, które w trybie równoległym przechodzą w 15 minut. Zmniejszyłem odsetek flaky testów z 12 do 2% i podpiąłem testy pod każdy pull request.",
      senior:
        "Senior QA Automation Engineer z 8 latami doświadczenia, odpowiadam za strategię automatyzacji dla 6 zespołów. Wdrożyłem testy kontraktowe i środowiska testowe w Kubernetesie, co pozwoliło wydawać codziennie zamiast raz w tygodniu. Nauczyłem 5 testerów manualnych pisać testy automatyczne.",
    },
    tip: "Dodaj link do repozytorium z Twoim frameworkiem testowym i podaj czas przebiegu oraz odsetek flaky testów. Dla automatyka to główne miary jakości pracy.",
    skills: ["Playwright", "Selenium", "Cypress", "Python", "Java", "REST Assured", "CI/CD", "Allure"],
  },
  "devops-engineer": {
    name: "DevOps Engineer",
    nameInTitle: "inżyniera DevOps",
    recruiters:
      "Rekruter patrzy na chmurę (AWS, GCP, Azure), Kubernetes, Terraform i CI/CD. Ważne są monitoring, dyżury on-call i konkretne wyniki: szybkość wdrożeń, uptime, oszczędności na infrastrukturze.",
    summaries: {
      junior:
        "DevOps Engineer z rocznym doświadczeniem, Linux, Docker, GitHub Actions, AWS. Skonfigurowałem CI/CD dla 5 serwisów i czas wdrożenia spadł z 40 do 8 minut. Piszę skrypty w Bashu, konfiguruję Nginx i monitoring w Grafanie.",
      middle:
        "DevOps Engineer z 4 latami doświadczenia, AWS, Kubernetes, Terraform, ArgoCD. Opisałem całą infrastrukturę w Terraformie i przeniosłem 20 serwisów na EKS z GitOps. Zoptymalizowałem zasoby i instancje Spot, co obniżyło rachunek za AWS o 32%.",
      senior:
        "Senior DevOps Engineer z 8 latami doświadczenia, platform engineering i SRE. Zbudowałem wewnętrzną platformę dla 12 zespołów z automatycznymi środowiskami dla każdego pull requesta. Podniosłem uptime do 99,98% i skróciłem średni czas przywracania po incydentach z 2 godzin do 20 minut.",
    },
    tip: "Dodaj 2-3 metryki, którymi mierzy się DevOps: częstotliwość i czas wdrożeń, uptime, MTTR, oszczędności w chmurze. Bez liczb CV DevOpsa wygląda jak lista narzędzi.",
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Linux", "Prometheus", "Grafana"],
  },
  "data-analyst": {
    name: "Analityk danych",
    nameInTitle: "analityka danych",
    recruiters:
      "Rekruter sprawdza SQL, narzędzie BI (Tableau, Power BI, Looker) oraz Pythona lub Excela. Najważniejsze jest jednak to, czy Twoje analizy wpłynęły na decyzje biznesowe, a nie tylko czy budowałeś dashboardy.",
    summaries: {
      junior:
        "Analityk danych z rocznym doświadczeniem, SQL, Excel, Power BI. Zbudowałem 10 dashboardów dla działu sprzedaży, które zastąpiły cotygodniowe ręczne raporty i oszczędzają 6 godzin tygodniowo. Znam podstawy statystyki i testów A/B.",
      middle:
        "Analityk danych z 4 latami doświadczenia w e-commerce, SQL, Python, Tableau. Przeanalizowałem lejek zamówienia i znalazłem krok, na którym odpadało 18% użytkowników, po zmianach konwersja wzrosła o 7%. Prowadzę testy A/B i liczę ich istotność statystyczną.",
      senior:
        "Senior analityk danych z 7 latami doświadczenia, analityka produktowa aplikacji mobilnych. Zbudowałem system metryk i analizy kohortowej, na podstawie którego zespół zmienił onboarding i podniósł retencję 30-dniową z 11 do 16%. Prowadzę 3 analityków i ustalam standardy raportowania.",
    },
    tip: "Każdą analizę opisuj schematem „pytanie, co odkryłeś, jaką decyzję podjęto, jaki był wynik”. Rekruter szuka wpływu na biznes, a nie liczby dashboardów.",
    skills: ["SQL", "Python", "Excel", "Power BI", "Tableau", "A/B Testing", "Google Analytics", "Statistics"],
  },
  "data-scientist": {
    name: "Data Scientist",
    nameInTitle: "Data Scientista",
    recruiters:
      "Rekruter patrzy na Pythona, biblioteki ML (scikit-learn, PyTorch), doświadczenie z LLM i przede wszystkim na to, czy Twoje modele trafiły na produkcję. Liczą się metryki modeli i efekt biznesowy, a nie same certyfikaty z Kaggle.",
    summaries: {
      junior:
        "Data Scientist z rocznym doświadczeniem, Python, pandas, scikit-learn. Zbudowałem model przewidywania odejść klientów z ROC AUC 0,84, którego marketing używa w kampaniach retencyjnych. Mam 2 projekty na GitHubie z czytelnymi notebookami i wyjaśnieniem wyników.",
      middle:
        "Data Scientist z 4 latami doświadczenia, PyTorch, LightGBM, MLflow. Opracowałem model rekomendacji dla marketplace'u, który w teście A/B podniósł średnią wartość koszyka o 6%. Wdrożyłem 3 modele na produkcję przez FastAPI i skonfigurowałem monitoring dryfu danych.",
      senior:
        "Senior Data Scientist z 8 latami doświadczenia, NLP i LLM. Zbudowałem system klasyfikacji zgłoszeń supportu oparty na LLM z RAG, który automatycznie obsługuje 45% ticketów. Prowadzę zespół ML z 4 osób i odpowiadam za roadmapę ML w produkcie.",
    },
    tip: "Przy każdym modelu podaj metrykę jakości i wynik biznesowy na produkcji. Zdanie „model na produkcji dał +6% do koszyka” jest mocniejsze niż jakakolwiek lista algorytmów.",
    skills: ["Python", "pandas", "scikit-learn", "PyTorch", "SQL", "MLflow", "LLM", "Statistics"],
  },
  "data-engineer": {
    name: "Data Engineer",
    nameInTitle: "inżyniera danych",
    recruiters:
      "Rekruter szuka SQL, Pythona, orkiestracji (Airflow, Dagster), Sparka i chmurowych hurtowni danych (BigQuery, Snowflake, Redshift). Ważne są wolumeny danych, z jakimi pracowałeś, i niezawodność pipeline'ów.",
    summaries: {
      junior:
        "Data Engineer z rocznym doświadczeniem, Python, SQL, Airflow, PostgreSQL. Zbudowałem 8 pipeline'ów ETL, które codziennie ładują dane z CRM i kampanii reklamowych do hurtowni. Wdrożyłem testy jakości danych, które wyłapują braki, zanim trafią do raportów.",
      middle:
        "Data Engineer z 4 latami doświadczenia, Spark, Airflow, dbt, BigQuery. Przeniosłem hurtownię z PostgreSQL do BigQuery z modelami dbt i czas odświeżania raportów spadł z 6 godzin do 25 minut. Przetwarzam 2 TB danych dziennie.",
      senior:
        "Senior Data Engineer z 8 latami doświadczenia, architektura platform danych. Zaprojektowałem lakehouse na Databricks ze streamingiem z Kafki, co obniżyło koszty przetwarzania o 40%. Wprowadziłem data contracts między zespołami i prowadzę zespół 4 inżynierów danych.",
    },
    tip: "Podawaj wolumeny danych (GB lub TB dziennie, liczba zdarzeń) i czas odświeżania danych przed Twoją pracą i po niej. U Data Engineera skala i niezawodność liczą się bardziej niż lista narzędzi.",
    skills: ["SQL", "Python", "Apache Spark", "Airflow", "dbt", "BigQuery", "Kafka", "Snowflake"],
  },
  "product-manager": {
    name: "Product Manager",
    nameInTitle: "Product Managera",
    recruiters:
      "Rekruter szuka produktów, które prowadziłeś, i metryk, na które wpłynąłeś: przychód, retencja, konwersja. Patrzy też na doświadczenie w discovery, pracę z danymi i typ produktu (B2B, B2C, mobile).",
    summaries: {
      junior:
        "Product Manager z rocznym doświadczeniem w aplikacji mobilnej B2C. Przeprowadziłem 25 wywiadów z użytkownikami i wdrożyłem nowy onboarding, który podniósł aktywację w pierwszym tygodniu z 22 do 29%. Piszę PRD, pracuję w Amplitude i priorytetyzuję backlog metodą RICE.",
      middle:
        "Product Manager z 4 latami doświadczenia w B2B SaaS. Uruchomiłem plan cenowy dla małych zespołów, który w 6 miesięcy przyniósł 15% nowego MRR. Prowadzę discovery z klientami, testy A/B i roadmapę zespołu 8 inżynierów.",
      senior:
        "Senior Product Manager z 8 latami doświadczenia, mobilne produkty fintech z 2 mln użytkowników. Opracowałem strategię produktu, która podniosła retencję 90-dniową o 12 punktów, i prowadziłem wejście na 3 nowe rynki. Jestem mentorem dla 3 Product Managerów.",
    },
    tip: "Każdy punkt doświadczenia zaczynaj od metryki: co się zmieniło i o ile. Bez liczb CV Product Managera czyta się jak CV Project Managera.",
    skills: ["Product Discovery", "Roadmapping", "A/B Testing", "Amplitude", "SQL", "Jira", "User Interviews", "Unit Economics"],
  },
  "project-manager": {
    name: "Project Manager",
    nameInTitle: "Project Managera",
    recruiters:
      "Rekruter sprawdza, jak duże projekty i zespoły prowadziłeś, z jakim budżetem i w jakiej metodyce (Scrum, Kanban, Waterfall). Liczy się praca z klientem, zarządzanie ryzykiem i to, czy oddawałeś projekty na czas.",
    summaries: {
      junior:
        "Project Manager z rocznym doświadczeniem w software housie. Prowadziłem 2 projekty webowe z 5-osobowymi zespołami w Scrumie, oba oddane w terminie i w budżecie. Prowadzę Jirę, raporty dla klientów i codzienne spotkania zespołu.",
      middle:
        "Project Manager z 4 latami doświadczenia, projekty dla klientów z USA i Europy. Jednocześnie prowadziłem 3 projekty z budżetem do 400 tys. dolarów i zespołem 15 osób. Wprowadziłem proces zarządzania ryzykiem, który zmniejszył liczbę przekroczonych terminów o 60%.",
      senior:
        "Senior Project Manager z 9 latami doświadczenia, programy wielozespołowe w modelu fixed price. Kierowałem wdrożeniem platformy bankowej z 40 uczestnikami i budżetem 2 mln dolarów, start nastąpił 2 tygodnie przed planem. Mam certyfikaty PMP i PSM I.",
    },
    tip: "Przy każdym projekcie podaj wielkość zespołu, budżet i czas trwania. Te trzy liczby od razu pokazują poziom odpowiedzialności lepiej niż jakikolwiek opis.",
    skills: ["Scrum", "Kanban", "Jira", "Confluence", "Risk Management", "Budgeting", "Stakeholder Management", "PMP"],
  },
  "ui-ux-designer": {
    name: "Projektant UI/UX",
    nameInTitle: "projektanta UI/UX",
    recruiters:
      "Rekruter w pierwszej kolejności otwiera portfolio na Behance, Dribbble lub Twojej stronie. Dalej patrzy na Figmę, pracę z design systemami, badania z użytkownikami i to, czy projekt wpłynął na metryki produktu.",
    summaries: {
      junior:
        "Projektant UI/UX z rocznym doświadczeniem, Figma, prototypowanie, design systemy. Przeprojektowałem aplikację do zamawiania jedzenia na podstawie 5 testów użyteczności, czas składania zamówienia skrócił się o 25%. W portfolio mam 4 case study z procesem od badań do makiet.",
      middle:
        "Projektant UI/UX z 4 latami doświadczenia w produktach B2C. Przebudowałem onboarding banku mobilnego na podstawie 12 wywiadów i odsetek ukończonych rejestracji wzrósł z 54 do 71%. Razem z programistami utrzymuję w Figmie design system z 80 komponentami.",
      senior:
        "Senior Product Designer z 8 latami doświadczenia, B2B SaaS i złożone interfejsy danych. Zbudowałem design system dla 3 produktów, który skrócił czas tworzenia nowych ekranów o 30%. Prowadzę zespół 3 projektantów i wprowadziłem regularne badania użyteczności.",
    },
    tip: "Umieść link do portfolio w pierwszej linijce CV, a w każdym case study pokaż proces i wynik w liczbach. Rekruter często ogląda portfolio, zanim przeczyta samo CV.",
    skills: ["Figma", "Prototyping", "User Research", "Design Systems", "Usability Testing", "Wireframing", "Adobe Photoshop", "FigJam"],
  },
  "business-analyst": {
    name: "Analityk biznesowy",
    nameInTitle: "analityka biznesowego",
    recruiters:
      "Rekruter patrzy, jak zbierałeś i dokumentowałeś wymagania: user stories, BPMN, UML, specyfikacje. Ważne są domena (fintech, logistyka, e-commerce), praca z interesariuszami i podstawy SQL.",
    summaries: {
      junior:
        "Analityk biznesowy z rocznym doświadczeniem w projektach outsourcingowych. Opisałem 60 user stories z kryteriami akceptacji i przygotowałem diagramy BPMN procesów dla CRM. Prowadzę spotkania z klientem i robię prototypy w Figmie i Draw.io.",
      middle:
        "Analityk biznesowy z 4 latami doświadczenia w logistyce. Przeanalizowałem proces obsługi zwrotów i zaproponowałem automatyzację, która skróciła czas obsługi z 3 dni do 6 godzin. Piszę SRS, pracuję ze specyfikacjami API i zapytaniami SQL.",
      senior:
        "Senior analityk biznesowy z 8 latami doświadczenia w projektach bankowych. Prowadziłem analizę wdrożenia nowej platformy kredytowej z 15 integracjami i 200 wymaganiami bez większych zmian zakresu. Kieruję 3 analitykami i uporządkowałem zarządzanie wymaganiami w Confluence.",
    },
    tip: "Dodaj do CV link do przykładowego artefaktu: zanonimizowanej user story, diagramu BPMN lub fragmentu specyfikacji. To od razu pokazuje jakość Twojej dokumentacji.",
    skills: ["Requirements Gathering", "User Stories", "BPMN", "UML", "SQL", "Jira", "Confluence", "Figma"],
  },
  "it-recruiter": {
    name: "Rekruter IT",
    nameInTitle: "rekrutera IT",
    recruiters:
      "Hiring manager sprawdza, jakie role i poziomy zamykałeś, Twoje metryki (liczba zatrudnień, time to hire, offer acceptance rate) i kanały pozyskiwania kandydatów. Ważne są też rozumienie technologii i praca z ATS.",
    summaries: {
      junior:
        "Rekruter IT z rocznym doświadczeniem, zamykałem rekrutacje na testerów oraz programistów junior i mid. W ciągu roku zamknąłem 18 procesów ze średnim time to hire 28 dni. Szukam kandydatów przez LinkedIn i Just Join IT i prowadzę bazę w ATS.",
      middle:
        "Rekruter IT z 4 latami doświadczenia w firmach produktowych, role mid i senior w backendzie, mobile i DevOps. Zamykam 5-7 procesów miesięcznie z offer acceptance rate na poziomie 85%. Zbudowałem program poleceń, z którego pochodzi 30% zatrudnień.",
      senior:
        "Senior Rekruter IT z 8 latami doświadczenia, rekrutacje dla zespołów w całej Europie. Zamknąłem 40 procesów w rok przy wzroście firmy ze 120 do 200 osób, w tym na stanowiska tech leadów i C-level. Wprowadziłem ustrukturyzowane rozmowy i analitykę lejka rekrutacyjnego.",
    },
    tip: "Pokaż swoje metryki: liczbę zamkniętych procesów, time to hire, offer acceptance rate i udział kandydatów z Twoich kanałów. Rekrutera ocenia się tak samo, jak on ocenia kandydatów: po wynikach.",
    skills: ["Sourcing", "LinkedIn Recruiter", "Boolean Search", "ATS", "Technical Screening", "Employer Branding", "Recruitment Analytics", "Negotiation"],
  },
};

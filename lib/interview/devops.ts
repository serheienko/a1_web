import type { InterviewContent } from "./types";

const SRC = {
  manSignal: "https://man7.org/linux/man-pages/man7/signal.7.html",
  manChmod: "https://man7.org/linux/man-pages/man1/chmod.1.html",
  manSs: "https://man7.org/linux/man-pages/man8/ss.8.html",
  rfcDns: "https://www.rfc-editor.org/rfc/rfc1035",
  manNamespaces: "https://man7.org/linux/man-pages/man7/namespaces.7.html",
  dockerBestPractices: "https://docs.docker.com/build/building/best-practices/",
  dockerMultiStage: "https://docs.docker.com/get-started/docker-concepts/building-images/multi-stage-builds/",
  dockerVolumes: "https://docs.docker.com/engine/storage/volumes/",
  k8sDeployment: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
  k8sService: "https://kubernetes.io/docs/concepts/services-networking/service/",
  k8sProbes: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
  k8sResources: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
  ghWorkflows: "https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows",
  ghOidc: "https://docs.github.com/en/actions/concepts/security/openid-connect",
  ghSecureUse: "https://docs.github.com/en/actions/reference/security/secure-use",
  tfState: "https://developer.hashicorp.com/terraform/language/state",
  tfPlan: "https://developer.hashicorp.com/terraform/cli/commands/plan",
  tfModules: "https://developer.hashicorp.com/terraform/language/modules",
  awsIam: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
  awsVpcSecurity: "https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Security.html",
  awsAsg: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html",
  promMetricTypes: "https://prometheus.io/docs/concepts/metric_types/",
  sreMonitoring: "https://sre.google/sre-book/monitoring-distributed-systems/",
  sreSlo: "https://sre.google/sre-book/service-level-objectives/",
  sreIncidents: "https://sre.google/sre-book/managing-incidents/",
  srePostmortem: "https://sre.google/sre-book/postmortem-culture/",
  owaspSecrets: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
  gitRevert: "https://git-scm.com/docs/git-revert",
};

const CODE_CHMOD = "chmod 750 deploy.sh\nls -l deploy.sh\n# -rwxr-x--- 1 deploy ops ... deploy.sh";

const CODE_SS = "ss -tlnp\n# -t TCP, -l listening, -n numbers instead of names,\n# -p owning process";

const CODE_MULTISTAGE =
  "FROM golang:1.23 AS build\nCOPY . /src\nRUN CGO_ENABLED=0 go build -o /app /src/cmd/api\nFROM gcr.io/distroless/static\nCOPY --from=build /app /app\nUSER nonroot\nENTRYPOINT [\"/app\"]";

const CODE_ROLLOUT = "kubectl set image deployment/web web=web:1.4.2\nkubectl rollout status deployment/web\nkubectl rollout undo deployment/web";

const CODE_PROBES =
  "readinessProbe:\n  httpGet: { path: /ready, port: 8080 }\n  periodSeconds: 5\nlivenessProbe:\n  httpGet: { path: /healthz, port: 8080 }\n  failureThreshold: 3";

const CODE_RESOURCES =
  "resources:\n  requests: { cpu: 250m, memory: 256Mi }\n  limits:   { memory: 512Mi }";

const CODE_WORKFLOW =
  "on: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps: [{ uses: actions/checkout@v4 }, { run: make test }]\n  deploy:\n    needs: test";

const CODE_OIDC =
  "permissions:\n  id-token: write\n  contents: read\nsteps:\n  - uses: aws-actions/configure-aws-credentials@v4\n    with:\n      role-to-assume: arn:aws:iam::123456789012:role/deploy";

const CODE_TF = "terraform plan -out=tfplan\nterraform apply tfplan";

const CODE_TF_MODULE =
  "module \"network\" {\n  source     = \"./modules/vpc\"\n  cidr_block = \"10.0.0.0/16\"\n}\n# use: module.network.vpc_id";

const CODE_PROM = "# requests per second over the last 5 minutes\nrate(http_requests_total[5m])";

const CODE_GIT = "git revert <commit>\ngit push origin main";

export const DEVOPS_INTERVIEW: InterviewContent = {
  uk: {
    title: "Питання на співбесіді DevOps: 26 питань з відповідями",
    description:
      "Питання на співбесіді DevOps, SRE та Cloud-інженера з відповідями: Linux, мережі, Docker, Kubernetes, CI/CD, Terraform, AWS, моніторинг, SLO, безпека, Git.",
    h1: "Питання на співбесіді DevOps з відповідями",
    lead:
      "Ми відібрали питання за тим, що роботодавці справді вимагають в актуальних вакансіях DevOps, SRE та Cloud: Linux, Docker, Kubernetes, CI/CD, Terraform, AWS, моніторинг. Кожна відповідь звірена з офіційним джерелом — документацією Kubernetes, Docker, Terraform, AWS, GitHub Actions, Prometheus, книгою Google SRE та man-сторінками Linux.",
    categories: [
      {
        id: "linux-network",
        title: "Linux і мережі",
        items: [
          {
            id: "sigterm-vs-sigkill",
            q: "Чим SIGTERM відрізняється від SIGKILL і який сигнал надсилає kill за замовчуванням?",
            wants: "Чи розуміє кандидат, як коректно зупиняти сервіс і чому «kill -9» — крайній захід.",
            answer:
              "Команда kill за замовчуванням надсилає SIGTERM. Цей сигнал процес може перехопити і зробити graceful shutdown: закрити з'єднання, дописати дані, звільнити ресурси. SIGKILL процес не може ні перехопити, ні заблокувати, ні проігнорувати — ядро просто завершує його без жодного прибирання. Тому спершу надсилають SIGTERM і лише якщо процес не зупинився за таймаут — SIGKILL. Саме так працює зупинка контейнерів і подів.",
            tech: "Linux",
            source: { title: "Linux man-pages — signal(7)", url: SRC.manSignal },
          },
          {
            id: "file-permissions",
            q: "Як у Linux влаштовані права доступу до файлу і що означає chmod 750?",
            wants: "Чи вміє кандидат швидко читати й виставляти права, а не діяти навмання через chmod 777.",
            answer:
              "У кожного файлу є три набори прав — для власника, групи та решти, а в кожному наборі біти r (4), w (2) і x (1). Тож 750 означає: власник має rwx (7), група — r-x (5), решта не має нічого (0). Для скрипта деплою це типовий варіант: запускає власник, група може лише виконувати, сторонні не мають доступу. Права 777 віддають запис усім і майже завжди свідчать про непотрібно широкий доступ.",
            code: CODE_CHMOD,
            tech: "Linux",
            source: { title: "Linux man-pages — chmod(1)", url: SRC.manChmod },
          },
          {
            id: "listening-ports",
            q: "Сервіс не відповідає на порту. Як перевірити, чи хтось слухає цей порт і який процес?",
            wants: "Чи володіє кандидат базовим інструментарієм діагностики мережі на сервері.",
            answer:
              "Команда ss показує сокети. З ключами -tlnp вона виводить TCP-сокети в стані listening, з числовими адресами та портами і з процесом-власником. Якщо порт не слухає ніхто, проблема в самому сервісі: не стартував або слухає не на тій адресі (наприклад, лише на 127.0.0.1). Якщо слухає, дивимося далі: файрвол, security group, маршрутизацію.",
            code: CODE_SS,
            tech: "Linux",
            source: { title: "Linux man-pages — ss(8)", url: SRC.manSs },
          },
          {
            id: "dns-resolution",
            q: "Як працює DNS-розв'язання імені і що таке TTL?",
            wants: "Чи розуміє кандидат ланцюжок запитів і чому зміна DNS-запису поширюється не миттєво.",
            answer:
              "Застосунок звертається до локального резолвера, який питає рекурсивний DNS-сервер. Той, якщо відповіді немає в кеші, іде до кореневих серверів, далі до серверів зони верхнього рівня і зрештою до авторитетного сервера домену. Кожен запис має TTL — час у секундах, протягом якого відповідь можна тримати в кеші. Тому перед міграцією сервера TTL зазвичай заздалегідь зменшують, а після зміни запису частина клієнтів ще якийсь час бачить стару адресу.",
            source: { title: "RFC 1035 — Domain Names: Implementation and Specification", url: SRC.rfcDns },
          },
        ],
      },
      {
        id: "docker",
        title: "Docker",
        items: [
          {
            id: "container-vs-vm",
            q: "Чим контейнер відрізняється від віртуальної машини?",
            wants: "Чи розуміє кандидат, що контейнер — це ізольований процес на спільному ядрі, а не «легка ВМ».",
            answer:
              "Віртуальна машина має власну гостьову ОС із власним ядром поверх гіпервізора. Контейнери ділять ядро хоста; ізоляцію забезпечують простори імен (namespaces) — окремі погляди на PID, мережу, файлову систему, користувачів — та cgroups, які обмежують ресурси. Тому контейнер стартує за секунди й займає менше пам'яті, але ізоляція слабша, ніж у ВМ, і контейнеру потрібне ядро Linux.",
            tech: "Docker",
            source: { title: "Linux man-pages — namespaces(7)", url: SRC.manNamespaces },
          },
          {
            id: "multi-stage-build",
            q: "Що таке multi-stage build і як зменшити та убезпечити образ?",
            wants: "Чи вміє кандидат робити малі й безпечні образи, а не класти в прод компілятор і вихідники.",
            answer:
              "У Dockerfile можна мати кілька інструкцій FROM: на першому етапі збираємо застосунок з усіма інструментами, а в фінальний образ копіюємо лише результат через COPY --from. Так у прод не потрапляють компілятор, кеші та вихідний код. Додатково беруть мінімальну базу, фіксують версії тегів, додають .dockerignore і запускають процес не від root через USER.",
            code: CODE_MULTISTAGE,
            tech: "Docker",
            source: { title: "Docker Docs — Multi-stage builds", url: SRC.dockerMultiStage },
          },
          {
            id: "docker-volumes",
            q: "Куди зберігати дані контейнера, щоб вони пережили його видалення?",
            wants: "Чи знає кандидат, що файлова система контейнера тимчасова, і чим volume відрізняється від bind mount.",
            answer:
              "Шар запису контейнера зникає разом із ним. Для даних, які мають вижити, використовують volume: ним керує Docker, він існує окремо від контейнера і його можна підключати до інших контейнерів. Bind mount прямо монтує каталог хоста — зручно в розробці, але залежить від структури файлової системи хоста. Для постійних даних у проді зазвичай обирають volume або зовнішнє сховище.",
            tech: "Docker",
            source: { title: "Docker Docs — Volumes", url: SRC.dockerVolumes },
          },
        ],
      },
      {
        id: "kubernetes",
        title: "Kubernetes",
        items: [
          {
            id: "k8s-deployment-rolling",
            q: "Як Deployment оновлює поди без простою і як відкотити невдалий реліз?",
            wants: "Чи розуміє кандидат rolling update і вміє користуватися історією ревізій.",
            answer:
              "Deployment керує ReplicaSet-ами. За стратегії RollingUpdate він поступово створює поди нової версії і видаляє старі; швидкість обмежують параметри maxSurge та maxUnavailable. Прогрес видно через kubectl rollout status. Якщо новий реліз поганий, kubectl rollout undo повертає попередню ревізію. Щоб оновлення було без простою, потрібні коректні readiness-проби.",
            code: CODE_ROLLOUT,
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Deployments", url: SRC.k8sDeployment },
          },
          {
            id: "k8s-service-types",
            q: "Навіщо потрібен Service і чим відрізняються ClusterIP, NodePort та LoadBalancer?",
            wants: "Чи розуміє кандидат, що IP подів змінюються, і як трафік потрапляє всередину кластера.",
            answer:
              "Поди ефемерні й міняють IP, тому Service дає їм стабільну адресу та DNS-ім'я і розподіляє трафік між подами, обраними за мітками. ClusterIP (типовий) доступний лише всередині кластера. NodePort відкриває порт на кожному вузлі. LoadBalancer додатково просить у хмарного провайдера зовнішній балансувальник. Для HTTP-маршрутизації за хостом і шляхом зазвичай додають Ingress або Gateway.",
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Service", url: SRC.k8sService },
          },
          {
            id: "k8s-probes",
            q: "Чим liveness-проба відрізняється від readiness і startup?",
            wants: "Чи вміє кандидат налаштувати проби так, щоб не влаштувати каскад перезапусків.",
            answer:
              "Liveness визначає, чи треба перезапустити контейнер: kubelet перезапускає його, коли проба провалюється. Readiness визначає, чи готовий под приймати трафік: поки проба не проходить, под виключений з ендпоінтів Service, але не перезапускається. Startup-проба призначена для повільного старту: поки вона не пройшла, liveness і readiness не виконуються. Типова помилка — перевіряти в liveness зовнішні залежності, тоді збій бази перезапустить усі поди.",
            code: CODE_PROBES,
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Configure Liveness, Readiness and Startup Probes", url: SRC.k8sProbes },
          },
          {
            id: "k8s-requests-limits",
            q: "Що таке requests і limits і що буде, якщо контейнер перевищить ліміт пам'яті?",
            wants: "Чи розуміє кандидат різницю між резервуванням для планувальника та жорстким обмеженням.",
            answer:
              "Requests — це скільки ресурсів резервується: за ними планувальник обирає вузол. Limits — верхня межа, яку застосовує середовище виконання. Перевищення ліміту CPU призводить до тротлінгу, а ліміту пам'яті — до завершення контейнера через OOM (out of memory) з подальшим перезапуском. Тому для пам'яті ліміт ставлять із запасом і спираються на реальні метрики споживання.",
            code: CODE_RESOURCES,
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Resource Management for Pods and Containers", url: SRC.k8sResources },
          },
        ],
      },
      {
        id: "cicd",
        title: "CI/CD",
        items: [
          {
            id: "gha-workflow-structure",
            q: "Як побудований workflow у GitHub Actions: події, jobs, steps, runners?",
            wants: "Чи вміє кандидат читати і писати pipeline, а не лише копіювати готові приклади.",
            answer:
              "Workflow — це YAML-файл у .github/workflows, який запускається подією (push, pull_request, розклад, ручний запуск). Він складається з jobs, а кожен job — з кроків (steps) і виконується на своєму runner. За замовчуванням jobs виконуються паралельно; порядок задають через needs. Кроки — це shell-команди або готові дії (actions), як-от checkout.",
            code: CODE_WORKFLOW,
            tech: "CI/CD",
            source: { title: "GitHub Docs — Workflows", url: SRC.ghWorkflows },
          },
          {
            id: "gha-oidc",
            q: "Як дати pipeline доступ до хмари без довготривалих ключів у секретах?",
            wants: "Чи знає кандидат сучасний підхід до автентифікації CI у хмарі.",
            answer:
              "Через OpenID Connect: хмара довіряє токенам, які GitHub видає конкретному запуску workflow. Pipeline отримує короткоживучі облікові дані, а в репозиторії не зберігаються постійні ключі, які можуть витекти й потребують ротації. У workflow потрібен дозвіл id-token: write, а в хмарі — роль із trust policy, що обмежує, який репозиторій і гілка можуть її взяти.",
            code: CODE_OIDC,
            tech: "CI/CD",
            source: { title: "GitHub Docs — OpenID Connect", url: SRC.ghOidc },
          },
          {
            id: "gha-pin-actions",
            q: "Як убезпечити pipeline від шкідливих або скомпрометованих сторонніх actions?",
            wants: "Чи розглядає кандидат CI як частину ланцюга постачання й усвідомлює ризики.",
            answer:
              "Сторонню дію закріплюють за повним SHA коміту: це єдиний спосіб використовувати її як незмінний реліз, на відміну від тегу, який можна пересунути. Токену GITHUB_TOKEN дають мінімально потрібні права через permissions, секрети не виводять у логи, а код із форків та недовірені вхідні дані не підставляють у shell-команди без перевірки. Версії дій оновлюють свідомо, наприклад через Dependabot.",
            tech: "CI/CD",
            source: { title: "GitHub Docs — Secure use reference", url: SRC.ghSecureUse },
          },
        ],
      },
      {
        id: "iac-cloud",
        title: "Terraform та AWS",
        items: [
          {
            id: "tf-state",
            q: "Що таке state у Terraform і чому його не варто тримати локально чи в git?",
            wants: "Чи розуміє кандидат роль state і ризики командної роботи з ним.",
            answer:
              "State — це відображення ресурсів із конфігурації на реальні об'єкти в хмарі; за ним Terraform вирішує, що створити, змінити чи видалити. Він може містити чутливі значення, тому його не коммітять у git. Для команди state зберігають у віддаленому бекенді (наприклад, у S3) із блокуванням, щоб двоє людей не запускали apply одночасно, і з шифруванням та версіонуванням.",
            tech: "Terraform",
            source: { title: "Terraform Docs — State", url: SRC.tfState },
          },
          {
            id: "tf-plan-apply",
            q: "Для чого terraform plan і як зберегти план, щоб apply виконав саме його?",
            wants: "Чи дотримується кандидат безпечного процесу змін інфраструктури з рев'ю.",
            answer:
              "terraform plan порівнює конфігурацію зі state і реальним станом ресурсів та показує, що буде створено, змінено або знищено, нічого не змінюючи. Прапорець -out зберігає план у файл, і apply виконає рівно його, навіть якщо за час рев'ю щось змінилося. Це основа процесу в CI: plan у pull request, а apply — після схвалення. Розбіжність між кодом і реальним станом (drift) теж видно в plan.",
            code: CODE_TF,
            tech: "Terraform",
            source: { title: "Terraform Docs — terraform plan", url: SRC.tfPlan },
          },
          {
            id: "tf-modules",
            q: "Що таке модулі Terraform і коли їх варто створювати?",
            wants: "Чи вміє кандидат структурувати код інфраструктури та повторно його використовувати.",
            answer:
              "Модуль — це набір ресурсів у каталозі, який використовують як одну одиницю: вхідні змінні задають параметри, outputs віддають значення назовні. Кожна конфігурація сама є кореневим модулем і викликає інші через блок module. Модуль виправданий, коли той самий шаблон (мережа, кластер, база) потрібен у кількох середовищах. Створювати модуль заради однієї кнопки не варто — зайва абстракція ускладнює читання.",
            code: CODE_TF_MODULE,
            tech: "Terraform",
            source: { title: "Terraform Docs — Modules", url: SRC.tfModules },
          },
          {
            id: "aws-iam-best-practices",
            q: "Які основні практики безпеки IAM в AWS?",
            wants: "Чи знає кандидат принцип найменших привілеїв і чому статичні ключі — ризик.",
            answer:
              "Видавати лише потрібні права (least privilege) і уточнювати їх за фактичним використанням. Для робочих навантажень та людей віддавати перевагу ролям із тимчасовими обліковими даними замість довготривалих ключів доступу. Увімкнути MFA, не користуватися кореневим акаунтом для щоденної роботи, регулярно видаляти невикористані облікові дані та права.",
            tech: "AWS",
            source: { title: "AWS Docs — Security best practices in IAM", url: SRC.awsIam },
          },
          {
            id: "aws-sg-vs-nacl",
            q: "Чим security group відрізняється від network ACL у VPC?",
            wants: "Чи розуміє кандидат шари мережевого захисту в AWS і поняття stateful/stateless.",
            answer:
              "Security group працює на рівні мережевого інтерфейсу екземпляра, є stateful (відповідь на дозволений вхідний трафік дозволяється автоматично) і містить лише правила allow. Network ACL діє на рівні підмережі, є stateless — вхідний і вихідний трафік треба дозволяти окремо — і підтримує правила як allow, так і deny. Зазвичай основний захист будують на security groups, а NACL додають як додатковий шар.",
            tech: "AWS",
            source: { title: "AWS Docs — Security in Amazon VPC", url: SRC.awsVpcSecurity },
          },
          {
            id: "aws-ha-asg",
            q: "Як зробити веб-застосунок на EC2 стійким до відмови одного вузла чи зони доступності?",
            wants: "Чи мислить кандидат у термінах надлишковості та автоматичного відновлення.",
            answer:
              "Екземпляри розміщують у кількох зонах доступності в групі Auto Scaling. Вона підтримує задану кількість екземплярів, замінює несправні та масштабує групу за правилами. Перед групою ставлять балансувальник навантаження з health check, який спрямовує трафік лише на здорові екземпляри. Дані виносять зі стану вузла в керовані сховища, бо екземпляр може зникнути будь-якої миті.",
            tech: "AWS",
            source: { title: "AWS Docs — What is Amazon EC2 Auto Scaling?", url: SRC.awsAsg },
          },
        ],
      },
      {
        id: "sre",
        title: "Моніторинг, SLO та інциденти",
        items: [
          {
            id: "prometheus-metric-types",
            q: "Які є типи метрик у Prometheus і навіщо функція rate()?",
            wants: "Чи розрізняє кандидат лічильник, gauge і гістограму та вміє їх правильно читати.",
            answer:
              "Counter лише зростає (і скидається при перезапуску), gauge може йти вгору й вниз, histogram розкладає спостереження за кошиками і дає змогу рахувати квантилі, summary рахує квантилі на стороні клієнта. Сире значення лічильника мало що каже, тому для швидкості застосовують rate() за вікном часу; вона коректно обробляє скидання лічильника. Gauge, навпаки, читають як є.",
            code: CODE_PROM,
            source: { title: "Prometheus Docs — Metric types", url: SRC.promMetricTypes },
          },
          {
            id: "golden-signals",
            q: "Що таке чотири золоті сигнали моніторингу?",
            wants: "Чи вміє кандидат вибрати мінімальний набір показників для будь-якого сервісу.",
            answer:
              "Це затримка (latency), трафік (traffic), помилки (errors) і насичення (saturation). Затримку варто міряти окремо для успішних і невдалих запитів. Трафік показує попит, помилки — частку невдалих запитів, насичення — наскільки завантажений найдефіцитніший ресурс. Якщо можна виміряти лише чотири показники сервісу, обирають саме ці.",
            source: { title: "Google SRE Book — Monitoring Distributed Systems", url: SRC.sreMonitoring },
          },
          {
            id: "sli-slo-error-budget",
            q: "Чим відрізняються SLI, SLO та SLA і що таке error budget?",
            wants: "Чи розуміє кандидат, як надійність перетворюється на вимірювану ціль і керує пріоритетами.",
            answer:
              "SLI — виміряний показник якості (наприклад, частка успішних запитів), SLO — цільове значення SLI (скажімо, 99,9% за 30 днів), SLA — договір із наслідками за порушення, зазвичай слабший за внутрішній SLO. Error budget — це допустима частка збоїв, тобто 100% мінус SLO. Поки бюджет не вичерпано, команда може ризикувати й випускати зміни; коли бюджет закінчується, пріоритет переходить до надійності.",
            source: { title: "Google SRE Book — Service Level Objectives", url: SRC.sreSlo },
          },
          {
            id: "incident-postmortem",
            q: "Як ви дієте під час інциденту і що таке blameless postmortem?",
            wants: "Чи вміє кандидат працювати в команді під тиском: ролі, комунікація, висновки без пошуку винних.",
            answer:
              "Спершу відновлюємо сервіс (відкат, перемикання, масштабування), а причину з'ясовуємо потім. Під час інциденту розподіляють ролі, наприклад керівник інциденту та відповідальний за комунікацію, ведуть єдиний журнал і регулярно інформують зацікавлених. Після закриття пишуть postmortem без пошуку винних: що сталося, чому, що спрацювало й не спрацювало та конкретні дії з власниками й термінами, щоб ситуація не повторилася.",
            source: { title: "Google SRE Book — Managing Incidents", url: SRC.sreIncidents },
          },
        ],
      },
      {
        id: "security-git",
        title: "Безпека та Git",
        items: [
          {
            id: "secrets-management",
            q: "Де і як зберігати секрети та що робити, якщо секрет потрапив у репозиторій?",
            wants: "Чи має кандидат виважений підхід до секретів, а не «покладемо в змінні оточення і в git».",
            answer:
              "Секрети зберігають у спеціалізованому сховищі (Vault, AWS Secrets Manager та подібні) із контролем доступу та аудитом, а не в коді й образах. Секрет, що потрапив у git, вважають скомпрометованим: його негайно відкликають і ротують, бо видалення коміту не прибирає його з історії та клонів. Також корисні сканери секретів у pre-commit та CI і короткоживучі облікові дані замість постійних.",
            source: { title: "OWASP — Secrets Management Cheat Sheet", url: SRC.owaspSecrets },
          },
          {
            id: "git-revert-shared",
            q: "Як скасувати коміт, який уже в спільній гілці main?",
            wants: "Чи розуміє кандидат, чому не можна переписувати спільну історію.",
            answer:
              "Використовують git revert: він створює новий коміт, що скасовує зміни вказаного, і історія залишається незмінною, тож колеги можуть звичайно зробити pull. git reset з force push переписав би історію гілки, яку вже отримали інші, і зламав би їхні копії. Reset доречний лише для локальних, ще не опублікованих комітів.",
            code: CODE_GIT,
            tech: "Git",
            source: { title: "Git Docs — git-revert", url: SRC.gitRevert },
          },
        ],
      },
    ],
  },
  en: {
    title: "DevOps Interview Questions: 26 Questions with Answers",
    description:
      "DevOps, SRE and Cloud engineer interview questions with answers: Linux, networking, Docker, Kubernetes, CI/CD, Terraform, AWS, monitoring, SLOs, security, Git.",
    h1: "DevOps Interview Questions with Answers",
    lead:
      "We picked questions based on what employers actually ask for in current DevOps, SRE and Cloud job postings: Linux, Docker, Kubernetes, CI/CD, Terraform, AWS and monitoring. Every answer is checked against an official source: the Kubernetes, Docker, Terraform, AWS, GitHub Actions and Prometheus docs, the Google SRE book and Linux man pages.",
    categories: [
      {
        id: "linux-network",
        title: "Linux and networking",
        items: [
          {
            id: "sigterm-vs-sigkill",
            q: "How does SIGTERM differ from SIGKILL, and which signal does kill send by default?",
            wants: "Whether the candidate knows how to stop a service cleanly and why \"kill -9\" is a last resort.",
            answer:
              "By default kill sends SIGTERM. A process can catch it and shut down gracefully: close connections, flush data, release resources. SIGKILL can be neither caught, blocked nor ignored — the kernel just terminates the process with no cleanup. So you send SIGTERM first and only fall back to SIGKILL if the process hasn't stopped after a timeout. This is exactly how container and pod shutdown works.",
            tech: "Linux",
            source: { title: "Linux man-pages — signal(7)", url: SRC.manSignal },
          },
          {
            id: "file-permissions",
            q: "How do Linux file permissions work, and what does chmod 750 mean?",
            wants: "Whether the candidate can read and set permissions quickly instead of reaching for chmod 777.",
            answer:
              "Each file has three permission sets — for the owner, the group and everyone else — and each set has the bits r (4), w (2) and x (1). So 750 means the owner has rwx (7), the group has r-x (5), and others have nothing (0). That's a typical setup for a deploy script: the owner runs it, the group can only execute it, outsiders have no access. 777 gives everyone write access and almost always means access is broader than needed.",
            code: CODE_CHMOD,
            tech: "Linux",
            source: { title: "Linux man-pages — chmod(1)", url: SRC.manChmod },
          },
          {
            id: "listening-ports",
            q: "A service isn't responding on its port. How do you check whether anything is listening and which process owns it?",
            wants: "Whether the candidate has a basic server-side network troubleshooting toolkit.",
            answer:
              "The ss command shows sockets. With -tlnp it lists TCP sockets in the listening state, with numeric addresses and ports and the owning process. If nothing listens on the port, the problem is in the service itself: it didn't start, or it binds to the wrong address (for example only 127.0.0.1). If something does listen, move on to the firewall, security groups and routing.",
            code: CODE_SS,
            tech: "Linux",
            source: { title: "Linux man-pages — ss(8)", url: SRC.manSs },
          },
          {
            id: "dns-resolution",
            q: "How does DNS name resolution work, and what is TTL?",
            wants: "Whether the candidate knows the chain of queries and why a DNS change doesn't propagate instantly.",
            answer:
              "An application asks the local resolver, which queries a recursive DNS server. If the answer isn't cached, that server goes to the root servers, then the top-level domain servers, and finally the domain's authoritative server. Every record has a TTL — the number of seconds the answer may be cached. That's why TTL is usually lowered ahead of a server migration, and why after a record change some clients keep seeing the old address for a while.",
            source: { title: "RFC 1035 — Domain Names: Implementation and Specification", url: SRC.rfcDns },
          },
        ],
      },
      {
        id: "docker",
        title: "Docker",
        items: [
          {
            id: "container-vs-vm",
            q: "How is a container different from a virtual machine?",
            wants: "Whether the candidate understands a container is an isolated process on a shared kernel, not a \"lightweight VM\".",
            answer:
              "A virtual machine runs its own guest OS with its own kernel on top of a hypervisor. Containers share the host kernel; isolation comes from namespaces — separate views of PIDs, network, filesystem, users — and cgroups, which limit resources. So a container starts in seconds and uses less memory, but isolation is weaker than a VM's, and containers need a Linux kernel.",
            tech: "Docker",
            source: { title: "Linux man-pages — namespaces(7)", url: SRC.manNamespaces },
          },
          {
            id: "multi-stage-build",
            q: "What is a multi-stage build, and how do you make an image smaller and safer?",
            wants: "Whether the candidate builds small, secure images instead of shipping a compiler and source code to production.",
            answer:
              "A Dockerfile can have several FROM instructions: the first stage builds the app with all the tooling, and the final image copies only the result with COPY --from. That keeps compilers, caches and source code out of production. You also use a minimal base image, pin tag versions, add a .dockerignore and run the process as a non-root user with USER.",
            code: CODE_MULTISTAGE,
            tech: "Docker",
            source: { title: "Docker Docs — Multi-stage builds", url: SRC.dockerMultiStage },
          },
          {
            id: "docker-volumes",
            q: "Where do you store container data so it survives the container's removal?",
            wants: "Whether the candidate knows the container filesystem is ephemeral and how a volume differs from a bind mount.",
            answer:
              "A container's writable layer disappears with the container. For data that must survive you use a volume: Docker manages it, it exists independently of any container, and it can be attached to other containers. A bind mount maps a host directory directly — handy in development but dependent on the host's filesystem layout. For persistent data in production you normally pick a volume or external storage.",
            tech: "Docker",
            source: { title: "Docker Docs — Volumes", url: SRC.dockerVolumes },
          },
        ],
      },
      {
        id: "kubernetes",
        title: "Kubernetes",
        items: [
          {
            id: "k8s-deployment-rolling",
            q: "How does a Deployment update pods without downtime, and how do you roll back a bad release?",
            wants: "Whether the candidate understands rolling updates and can use revision history.",
            answer:
              "A Deployment manages ReplicaSets. With the RollingUpdate strategy it gradually creates pods of the new version and removes old ones; the pace is bounded by maxSurge and maxUnavailable. You follow progress with kubectl rollout status. If the new release is bad, kubectl rollout undo returns to the previous revision. For the update to be truly zero-downtime you need correct readiness probes.",
            code: CODE_ROLLOUT,
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Deployments", url: SRC.k8sDeployment },
          },
          {
            id: "k8s-service-types",
            q: "Why do you need a Service, and how do ClusterIP, NodePort and LoadBalancer differ?",
            wants: "Whether the candidate knows pod IPs change and how traffic reaches the inside of a cluster.",
            answer:
              "Pods are ephemeral and change IPs, so a Service gives them a stable address and DNS name and spreads traffic across the pods selected by labels. ClusterIP (the default) is reachable only inside the cluster. NodePort opens a port on every node. LoadBalancer additionally asks the cloud provider for an external load balancer. For HTTP routing by host and path you typically add an Ingress or Gateway.",
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Service", url: SRC.k8sService },
          },
          {
            id: "k8s-probes",
            q: "How does a liveness probe differ from readiness and startup probes?",
            wants: "Whether the candidate can configure probes without causing a restart cascade.",
            answer:
              "Liveness decides whether a container should be restarted: the kubelet restarts it when the probe fails. Readiness decides whether a pod can receive traffic: while it fails, the pod is removed from the Service endpoints but not restarted. A startup probe is for slow-starting apps: until it succeeds, liveness and readiness checks don't run. A common mistake is checking external dependencies in liveness — then a database outage restarts every pod.",
            code: CODE_PROBES,
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Configure Liveness, Readiness and Startup Probes", url: SRC.k8sProbes },
          },
          {
            id: "k8s-requests-limits",
            q: "What are requests and limits, and what happens when a container exceeds its memory limit?",
            wants: "Whether the candidate knows the difference between a scheduler reservation and a hard cap.",
            answer:
              "Requests are the resources reserved for the container: the scheduler uses them to pick a node. Limits are the upper bound enforced by the container runtime. Exceeding the CPU limit leads to throttling, while exceeding the memory limit gets the container killed with OOM (out of memory) and then restarted. That's why memory limits are set with headroom and based on real consumption metrics.",
            code: CODE_RESOURCES,
            tech: "Kubernetes",
            source: { title: "Kubernetes Docs — Resource Management for Pods and Containers", url: SRC.k8sResources },
          },
        ],
      },
      {
        id: "cicd",
        title: "CI/CD",
        items: [
          {
            id: "gha-workflow-structure",
            q: "How is a GitHub Actions workflow structured: events, jobs, steps, runners?",
            wants: "Whether the candidate can read and write a pipeline instead of just copying ready-made examples.",
            answer:
              "A workflow is a YAML file in .github/workflows that is triggered by an event (push, pull_request, a schedule, a manual run). It consists of jobs, and each job consists of steps and runs on its own runner. Jobs run in parallel by default; you set the order with needs. Steps are shell commands or reusable actions such as checkout.",
            code: CODE_WORKFLOW,
            tech: "CI/CD",
            source: { title: "GitHub Docs — Workflows", url: SRC.ghWorkflows },
          },
          {
            id: "gha-oidc",
            q: "How do you give a pipeline access to the cloud without long-lived keys in secrets?",
            wants: "Whether the candidate knows the modern approach to authenticating CI in the cloud.",
            answer:
              "Use OpenID Connect: the cloud trusts tokens that GitHub issues to a specific workflow run. The pipeline gets short-lived credentials, and no permanent keys sit in the repository that could leak or need rotating. The workflow needs the id-token: write permission, and the cloud needs a role whose trust policy restricts which repository and branch may assume it.",
            code: CODE_OIDC,
            tech: "CI/CD",
            source: { title: "GitHub Docs — OpenID Connect", url: SRC.ghOidc },
          },
          {
            id: "gha-pin-actions",
            q: "How do you protect a pipeline from malicious or compromised third-party actions?",
            wants: "Whether the candidate treats CI as part of the supply chain and understands the risks.",
            answer:
              "Pin a third-party action to a full-length commit SHA: it is the only way to use an action as an immutable release, unlike a tag, which can be moved. Give GITHUB_TOKEN only the permissions it needs via permissions, keep secrets out of logs, and never put code from forks or untrusted input into shell commands without sanitizing it. Update action versions deliberately, for example through Dependabot.",
            tech: "CI/CD",
            source: { title: "GitHub Docs — Secure use reference", url: SRC.ghSecureUse },
          },
        ],
      },
      {
        id: "iac-cloud",
        title: "Terraform and AWS",
        items: [
          {
            id: "tf-state",
            q: "What is Terraform state, and why shouldn't you keep it locally or in git?",
            wants: "Whether the candidate understands the role of state and the risks of sharing it in a team.",
            answer:
              "State maps the resources in your configuration to real objects in the cloud; Terraform uses it to decide what to create, change or destroy. It can contain sensitive values, so it is never committed to git. For a team, state is kept in a remote backend (for example S3) with locking so two people can't run apply at once, plus encryption and versioning.",
            tech: "Terraform",
            source: { title: "Terraform Docs — State", url: SRC.tfState },
          },
          {
            id: "tf-plan-apply",
            q: "What is terraform plan for, and how do you make apply run exactly the plan you reviewed?",
            wants: "Whether the candidate follows a safe, reviewable process for infrastructure changes.",
            answer:
              "terraform plan compares the configuration with the state and the real resources and shows what would be created, changed or destroyed without changing anything. The -out flag saves the plan to a file, and apply executes exactly that, even if something changed during review. This is the basis of the CI flow: plan on the pull request, apply after approval. Drift between code and real state also shows up in the plan.",
            code: CODE_TF,
            tech: "Terraform",
            source: { title: "Terraform Docs — terraform plan", url: SRC.tfPlan },
          },
          {
            id: "tf-modules",
            q: "What are Terraform modules, and when should you create one?",
            wants: "Whether the candidate can structure infrastructure code and reuse it.",
            answer:
              "A module is a set of resources in a directory that you use as a single unit: input variables set parameters and outputs return values. Every configuration is itself a root module and calls others with a module block. A module is justified when the same pattern (network, cluster, database) is needed in several environments. Don't wrap a single resource in a module — needless abstraction makes code harder to read.",
            code: CODE_TF_MODULE,
            tech: "Terraform",
            source: { title: "Terraform Docs — Modules", url: SRC.tfModules },
          },
          {
            id: "aws-iam-best-practices",
            q: "What are the main IAM security practices in AWS?",
            wants: "Whether the candidate knows least privilege and why static keys are a risk.",
            answer:
              "Grant only the permissions that are needed (least privilege) and refine them based on actual usage. For workloads and people, prefer roles with temporary credentials over long-term access keys. Enable MFA, avoid using the root account for daily work, and regularly remove unused credentials and permissions.",
            tech: "AWS",
            source: { title: "AWS Docs — Security best practices in IAM", url: SRC.awsIam },
          },
          {
            id: "aws-sg-vs-nacl",
            q: "How does a security group differ from a network ACL in a VPC?",
            wants: "Whether the candidate understands the layers of network protection in AWS and stateful vs stateless.",
            answer:
              "A security group works at the instance's network interface, is stateful (return traffic for allowed inbound traffic is allowed automatically) and has only allow rules. A network ACL works at the subnet level, is stateless — inbound and outbound traffic must be allowed separately — and supports both allow and deny rules. Main protection is usually built on security groups, with NACLs as an additional layer.",
            tech: "AWS",
            source: { title: "AWS Docs — Security in Amazon VPC", url: SRC.awsVpcSecurity },
          },
          {
            id: "aws-ha-asg",
            q: "How do you make a web app on EC2 survive the failure of a single node or an Availability Zone?",
            wants: "Whether the candidate thinks in terms of redundancy and automatic recovery.",
            answer:
              "Place instances in several Availability Zones inside an Auto Scaling group. It maintains the desired number of instances, replaces unhealthy ones and scales the group by policy. Put a load balancer with health checks in front, so traffic goes only to healthy instances. Move data out of the node into managed storage, since an instance can disappear at any moment.",
            tech: "AWS",
            source: { title: "AWS Docs — What is Amazon EC2 Auto Scaling?", url: SRC.awsAsg },
          },
        ],
      },
      {
        id: "sre",
        title: "Monitoring, SLOs and incidents",
        items: [
          {
            id: "prometheus-metric-types",
            q: "What metric types does Prometheus have, and why do you need rate()?",
            wants: "Whether the candidate tells counters, gauges and histograms apart and reads them correctly.",
            answer:
              "A counter only goes up (and resets on restart), a gauge can go up and down, a histogram puts observations into buckets and lets you compute quantiles, and a summary computes quantiles on the client side. A raw counter value says little, so you apply rate() over a time window to get a per-second rate; it handles counter resets correctly. A gauge, by contrast, is read as is.",
            code: CODE_PROM,
            source: { title: "Prometheus Docs — Metric types", url: SRC.promMetricTypes },
          },
          {
            id: "golden-signals",
            q: "What are the four golden signals of monitoring?",
            wants: "Whether the candidate can pick a minimal set of indicators for any service.",
            answer:
              "They are latency, traffic, errors and saturation. Latency should be measured separately for successful and failed requests. Traffic shows demand, errors show the rate of failed requests, and saturation shows how full the most constrained resource is. If you can measure only four things about a service, these are the ones.",
            source: { title: "Google SRE Book — Monitoring Distributed Systems", url: SRC.sreMonitoring },
          },
          {
            id: "sli-slo-error-budget",
            q: "How do SLI, SLO and SLA differ, and what is an error budget?",
            wants: "Whether the candidate understands how reliability becomes a measurable target that drives priorities.",
            answer:
              "An SLI is a measured quality indicator (for example, the share of successful requests), an SLO is a target value for it (say, 99.9% over 30 days), and an SLA is a contract with consequences for missing it, usually looser than the internal SLO. The error budget is the allowed share of failures, i.e. 100% minus the SLO. While budget remains, the team can take risks and ship changes; when it runs out, priority shifts to reliability work.",
            source: { title: "Google SRE Book — Service Level Objectives", url: SRC.sreSlo },
          },
          {
            id: "incident-postmortem",
            q: "How do you act during an incident, and what is a blameless postmortem?",
            wants: "Whether the candidate can work in a team under pressure: roles, communication, lessons without blame.",
            answer:
              "First restore the service (roll back, fail over, scale), and find the root cause afterwards. During the incident, assign roles such as an incident commander and a communications lead, keep a single log and update stakeholders regularly. After it is resolved, write a postmortem without blame: what happened, why, what worked and what didn't, and concrete action items with owners and deadlines so it doesn't repeat.",
            source: { title: "Google SRE Book — Managing Incidents", url: SRC.sreIncidents },
          },
        ],
      },
      {
        id: "security-git",
        title: "Security and Git",
        items: [
          {
            id: "secrets-management",
            q: "Where and how do you store secrets, and what do you do if a secret ends up in a repository?",
            wants: "Whether the candidate has a sound approach to secrets, not just \"put it in env vars and git\".",
            answer:
              "Keep secrets in a dedicated store (Vault, AWS Secrets Manager and the like) with access control and auditing, not in code or images. A secret that reached git is considered compromised: revoke and rotate it immediately, because deleting the commit doesn't remove it from history and existing clones. Secret scanners in pre-commit and CI and short-lived credentials instead of permanent ones also help.",
            source: { title: "OWASP — Secrets Management Cheat Sheet", url: SRC.owaspSecrets },
          },
          {
            id: "git-revert-shared",
            q: "How do you undo a commit that is already on the shared main branch?",
            wants: "Whether the candidate understands why shared history must not be rewritten.",
            answer:
              "Use git revert: it creates a new commit that undoes the changes of the given one, leaving history intact, so colleagues can simply pull. git reset followed by a force push would rewrite the history of a branch others already have and break their copies. Reset is appropriate only for local commits that haven't been published.",
            code: CODE_GIT,
            tech: "Git",
            source: { title: "Git Docs — git-revert", url: SRC.gitRevert },
          },
        ],
      },
    ],
  },
};

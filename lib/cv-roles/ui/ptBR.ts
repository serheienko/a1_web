import type { RoleUi } from "@/lib/cv-roles/types";

// Português (Brasil). Textos comuns das páginas "Exemplo de currículo por cargo" (28.10.2026).
export const ptBR: RoleUi = {
  breadcrumbExamples: "Exemplos de currículo",
  titleTpl: "Currículo de {role}: exemplo {year} | A1",
  descriptionTpl:
    "Currículo de {role}: exemplo {year} com habilidades e salários de vagas reais do A1, modelos de resumo e dicas. Currículo grátis em PDF.",
  h1Tpl: "Currículo de {role}: exemplo {year}",
  leadTpl:
    "O que colocar no currículo de {role}, quais habilidades as empresas pedem e quanto pagam, com base em vagas reais publicadas no A1. Crie um currículo assim em PDF de graça a partir do seu perfil.",
  ctaCreate: "Criar meu currículo grátis",
  ctaDownload: "Baixar meu currículo",
  ctaFill: "Completar o perfil",
  signedInHint: "Seu currículo é montado a partir do seu perfil. Quanto mais completo o perfil, mais forte o currículo.",
  h2Recruiters: "O que o recrutador olha primeiro",
  h2Skills: "O que pedem {n} vagas do A1",
  skillsNote: "Porcentagem das vagas desse cargo no A1 que mencionam a habilidade.",
  skillsFallback: "Habilidades-chave para esse cargo",
  h2Salary: "Salários nas vagas do A1",
  salaryNote: "Mediana das faixas salariais nas vagas que informam salário, em USD por mês.",
  salaryFrom: "de",
  salaryTo: "até",
  h2Summaries: "Exemplos de resumo profissional",
  levels: { junior: "Júnior", middle: "Pleno", senior: "Sênior" },
  h2Tip: "Dica para esse cargo",
  h2Github: "Como mostrar projetos e GitHub",
  githubText:
    "Links para 2 ou 3 projetos reais convencem mais do que uma longa lista de tecnologias: explique rapidamente o que você mesmo fez e qual foi o resultado. Verifique o GitHub no seu perfil do A1 entrando na sua conta do GitHub, e o currículo ganha um bloco com o calendário de atividade e o número real de contribuições.",
  h2Mistakes: "Erros comuns em currículos de TI",
  mistakes: [
    "Listar tarefas em vez de resultados. Em vez de \"trabalhei no backend\", diga o que mudou: velocidade, número de usuários, menos bugs.",
    "Citar toda tecnologia que você já tocou. Mantenha só aquelas sobre as quais consegue conversar na entrevista e mostre seu nível.",
    "Mandar o mesmo currículo para todas as vagas. Use os mesmos nomes de habilidades da vaga para ser encontrado pelo recrutador e pelo sistema ATS.",
    "Faltar links para código ou portfólio, ou links quebrados. Abra cada link antes de enviar o currículo.",
    "Erros de digitação e nomes de tecnologias inconsistentes, como \"javascript\", \"JS\" e \"JavaScript\" no mesmo documento. Escreva como na documentação oficial.",
  ],
  h2Faq: "Perguntas frequentes",
  faq: [
    {
      q: "Qual deve ser o tamanho do currículo de {role}?",
      a: "Para júnior e pleno, uma página basta; para sênior, duas são aceitáveis. O currículo do A1 cabe em uma página e, se o seu perfil for grande, continua de forma organizada na segunda.",
    },
    {
      q: "Como fazer um currículo de {role} sem experiência?",
      a: "Mostre projetos de estudo e pessoais, cursos, hackathons e trabalho voluntário. Um GitHub verificado com calendário de atividade no currículo do A1 mostra claramente que você pratica com frequência.",
    },
    {
      q: "Quais habilidades colocar no currículo de {role}?",
      a: "As que mais aparecem nas vagas: veja as estatísticas acima. O nível de cada habilidade no currículo do A1 vem do controle deslizante do seu perfil, então se avalie com honestidade.",
    },
    {
      q: "Preciso de um currículo de {role} em inglês?",
      a: "Para empresas internacionais e vagas no exterior, sim. O A1 detecta o idioma do currículo pelo texto do seu perfil: preencha o perfil em inglês e os títulos também ficarão em inglês.",
    },
  ],
  h2Related: "Cargos relacionados",
  h2Jobs: "Vagas recentes de {role}",
  jobsMore: "Todas as vagas",
  hubTitle: "Exemplos de currículo por profissão",
  hubLead:
    "O que os recrutadores olham, quais habilidades as vagas do A1 pedem e quanto pagam. Escolha seu cargo.",
};

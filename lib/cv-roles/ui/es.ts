import type { RoleUi } from "@/lib/cv-roles/types";

// Español. Textos comunes de las páginas «Ejemplo de CV por puesto» (28.10.2026).
export const es: RoleUi = {
  breadcrumbExamples: "Ejemplos de CV",
  titleTpl: "CV de {role}: ejemplo {year} + PDF | A1",
  descriptionTpl:
    "CV de {role}: ejemplo {year} con habilidades y salarios de ofertas reales de A1, perfiles de muestra y consejos. Cree su CV gratis en PDF.",
  h1Tpl: "CV de {role}: ejemplo {year}",
  leadTpl:
    "Qué poner en un CV de {role}, qué habilidades piden las empresas y cuánto pagan, según ofertas reales publicadas en A1. Cree un CV así en PDF gratis a partir de su perfil.",
  ctaCreate: "Crear mi CV gratis",
  ctaDownload: "Descargar mi CV",
  ctaFill: "Completar el perfil",
  signedInHint: "Su CV se genera a partir de su perfil. Cuanto más completo el perfil, más fuerte el CV.",
  h2Recruiters: "Lo primero que mira el reclutador",
  h2Skills: "Lo que piden {n} ofertas de A1",
  skillsNote: "Porcentaje de ofertas de este puesto en A1 que mencionan la habilidad.",
  skillsFallback: "Habilidades clave para este puesto",
  h2Salary: "Salarios en las ofertas de A1",
  salaryNote: "Mediana de las bandas salariales en ofertas que publican salario, USD al mes.",
  salaryFrom: "desde",
  salaryTo: "hasta",
  h2Summaries: "Ejemplos de perfil profesional",
  levels: { junior: "Junior", middle: "Middle", senior: "Senior" },
  h2Tip: "Consejo para este puesto",
  h2Github: "Cómo mostrar proyectos y GitHub",
  githubText:
    "Los enlaces a 2-3 proyectos reales convencen más que una larga lista de tecnologías: explique brevemente qué hizo usted y qué resultado logró. Verifique GitHub en su perfil de A1 iniciando sesión en GitHub, y su CV mostrará un bloque con el calendario de actividad y el número real de contribuciones.",
  h2Mistakes: "Errores comunes en un CV de IT",
  mistakes: [
    "Enumerar tareas en lugar de resultados. En vez de «trabajé en el backend», indique qué cambió: velocidad, número de usuarios, menos errores.",
    "Listar todas las tecnologías que alguna vez probó. Deje solo aquellas de las que puede hablar en una entrevista y muestre su nivel.",
    "Enviar el mismo CV a todas las ofertas. Use los mismos nombres de habilidades que la oferta para que lo encuentren el reclutador y el software ATS.",
    "No incluir enlaces a código o portafolio, o que no funcionen. Abra cada enlace antes de enviar el CV.",
    "Erratas y nombres de tecnologías inconsistentes, como «javascript», «JS» y «JavaScript» en un mismo documento. Escríbalos como en la documentación oficial.",
  ],
  h2Faq: "Preguntas frecuentes",
  faq: [
    {
      q: "¿Cuánto debe ocupar un CV de {role}?",
      a: "Para perfiles junior y middle basta una página; para senior se aceptan dos. El CV de A1 cabe en una página y, si su perfil es extenso, continúa de forma ordenada en una segunda.",
    },
    {
      q: "¿Cómo hacer un CV de {role} sin experiencia?",
      a: "Muestre proyectos de estudio y personales, cursos, hackatones y voluntariado. Un GitHub verificado con calendario de actividad en el CV de A1 demuestra que practica con regularidad.",
    },
    {
      q: "¿Qué habilidades poner en un CV de {role}?",
      a: "Las que más aparecen en las ofertas: vea las estadísticas de arriba. El nivel de cada habilidad en el CV de A1 sale del control deslizante de su perfil, así que evalúese con honestidad.",
    },
    {
      q: "¿Necesito el CV de {role} en inglés?",
      a: "Para empresas internacionales y ofertas en el extranjero, sí. A1 detecta el idioma del CV por el texto de su perfil: complete el perfil en inglés y los títulos también saldrán en inglés.",
    },
  ],
  h2Related: "Puestos relacionados",
  h2Jobs: "Ofertas recientes de {role}",
  jobsMore: "Todas las ofertas",
  hubTitle: "Ejemplos de CV por profesión",
  hubLead:
    "Qué miran los reclutadores, qué habilidades piden las ofertas de A1 y cuánto pagan. Elija su puesto.",
};

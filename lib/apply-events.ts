// lib/apply-events.ts
//
// 14.10.2026. Связка кнопок отклика на странице вакансии с вопросами (Screening Questions):
//   * APPLY_EVENT -- кнопка в блоке «Питання до відгуку» (components/apply-questions-cta.tsx) просит
//     строку действий (components/post-viewer-menu.tsx) сделать то же, что её «Відгукнутися»;
//   * APPLY_AFTER_LOGIN_KEY -- гость нажал отклик и пошёл входить: после входа окно с вопросами
//     этой вакансии откроется само (значение -- id вакансии, sessionStorage).

export const APPLY_EVENT = "a1:apply";
export const APPLY_AFTER_LOGIN_KEY = "a1:apply-after-login";

export function requestApply(postId: string): void {
  window.dispatchEvent(new CustomEvent(APPLY_EVENT, { detail: { postId } }));
}

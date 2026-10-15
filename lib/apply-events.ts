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

// 15.10.2026 (Александр: «нажимаю эту кнопку и ничего не происходит, но делаю это на свой же пост.
// По идее для себя эта кнопка должна быть скрыта»). Кто смотрит -- автор или нет, знает только строка
// действий (она спрашивает whoami). Она отмечает пост как «свой», а кнопка под вопросами прячется.
export const OWN_POST_EVENT = "a1:own-post";
const ownPosts = new Set<string>();

export function markOwnPost(postId: string): void {
  if (ownPosts.has(postId)) return;
  ownPosts.add(postId);
  window.dispatchEvent(new CustomEvent(OWN_POST_EVENT, { detail: { postId } }));
}

export function isOwnPost(postId: string): boolean {
  return ownPosts.has(postId);
}

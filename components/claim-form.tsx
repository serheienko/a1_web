// components/claim-form.tsx
//
// 2026-09-11: the page a company lands on when we hand it the profile the
// vacancy import created for it. Three steps over the backend's claim methods
// (spec: docs/superpowers/specs/2026-09-11-company-account-claim-design.md in
// aone-api-private):
//
//   1. the company types its own work address;
//   2. it types the short code we email there;
//   3. it picks a password — and the API answers with a session, so the last
//      thing this form does is send it straight into its own profile.
//
// Nothing about the account changes besides the address and the password: the
// same user id keeps every vacancy, chat and application it already had.
"use client";

import { track } from "@/lib/track";
import { useEffect, useState, type FormEvent } from "react";
import { type Locale } from "@/components/t";
import { useActiveLocale } from "@/lib/use-active-locale";

type StringKey =
  | "title"
  | "intro"
  | "emailLabel"
  | "emailHint"
  | "continue"
  | "codeSent"
  | "codeLabel"
  | "passwordLabel"
  | "passwordHint"
  | "finish"
  | "working"
  | "doneTitle"
  | "doneBody"
  | "openProfile"
  | "errLinkInvalid"
  | "errAlreadyClaimed"
  | "errEmailTaken"
  | "errWrongCode"
  | "errNeedsOtherProof"
  | "errManualReview"
  | "errTooMany"
  | "errUnknown";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  // 2026-09-19: три причины отказа, которых не было у ссылочного
  // сценария — они появляются только когда компания пришла сама, со
  // страницы вакансии (app/api/claim/request).
  errNeedsOtherProof: {
    uk: "Ця адреса не збігається ні з доменом сайту компанії, ні з контактом у самому оголошенні. Спробуйте робочу пошту на домені компанії.",
    en: "This address matches neither the company website domain nor the contact printed in the vacancy. Try a work address on the company's own domain.",
    ru: "Этот адрес не совпадает ни с доменом сайта компании, ни с контактом в самом объявлении. Попробуйте рабочую почту на домене компании.",
    de: "Diese Adresse passt weder zur Domain der Unternehmenswebsite noch zum Kontakt in der Anzeige. Nutzen Sie eine Arbeitsadresse auf der eigenen Domain des Unternehmens.",
    es: "Esta direccion no coincide ni con el dominio del sitio de la empresa ni con el contacto indicado en la oferta. Prueba un correo de trabajo en el dominio de la empresa.",
    fr: "Cette adresse ne correspond ni au domaine du site de l'entreprise ni au contact indique dans l'offre. Essayez une adresse professionnelle sur le domaine de l'entreprise.",
    pl: "Ten adres nie pasuje ani do domeny strony firmy, ani do kontaktu podanego w ogloszeniu. Sprobuj sluzbowego adresu w domenie firmy.",
    ptBR: "Este endereco nao corresponde nem ao dominio do site da empresa nem ao contato indicado na vaga. Tente um e-mail de trabalho no dominio da empresa.",
    zh: "\u8be5\u90ae\u7bb1\u65e2\u4e0d\u5c5e\u4e8e\u516c\u53f8\u7f51\u7ad9\u57df\u540d\uff0c\u4e5f\u4e0d\u662f\u804c\u4f4d\u4e2d\u516c\u5e03\u7684\u8054\u7cfb\u65b9\u5f0f\u3002\u8bf7\u4f7f\u7528\u516c\u53f8\u81ea\u6709\u57df\u540d\u7684\u5de5\u4f5c\u90ae\u7bb1\u3002",
  },
  errManualReview: {
    uk: "Не змогли звірити профіль автоматично. Напишіть нам, і ми передамо його вручну.",
    en: "We could not match this profile automatically. Write to us and we will hand it over by hand.",
    ru: "Не смогли сверить профиль автоматически. Напишите нам, и мы передадим его вручную.",
    de: "Wir konnten dieses Profil nicht automatisch zuordnen. Schreiben Sie uns, wir uebergeben es manuell.",
    es: "No pudimos verificar el perfil automaticamente. Escribenos y lo transferiremos a mano.",
    fr: "Nous n'avons pas pu verifier ce profil automatiquement. Ecrivez-nous et nous le transfererons manuellement.",
    pl: "Nie udalo sie zweryfikowac profilu automatycznie. Napisz do nas, przekazemy go recznie.",
    ptBR: "Nao conseguimos verificar o perfil automaticamente. Escreva para nos e faremos a transferencia manualmente.",
    zh: "\u6211\u4eec\u65e0\u6cd5\u81ea\u52a8\u6838\u5bf9\u8be5\u4e3b\u9875\u3002\u8bf7\u8054\u7cfb\u6211\u4eec\uff0c\u6211\u4eec\u4f1a\u624b\u52a8\u79fb\u4ea4\u3002",
  },
  errTooMany: {
    uk: "Забагато спроб. Спробуйте за годину.",
    en: "Too many attempts. Try again in an hour.",
    ru: "Слишком много попыток. Попробуйте через час.",
    de: "Zu viele Versuche. Versuchen Sie es in einer Stunde erneut.",
    es: "Demasiados intentos. Intentalo dentro de una hora.",
    fr: "Trop de tentatives. Reessayez dans une heure.",
    pl: "Zbyt wiele prob. Sprobuj za godzine.",
    ptBR: "Tentativas demais. Tente novamente em uma hora.",
    zh: "\u5c1d\u8bd5\u6b21\u6570\u8fc7\u591a\uff0c\u8bf7\u4e00\u5c0f\u65f6\u540e\u518d\u8bd5\u3002",
  },
  title: {
    uk: "Профіль вашої компанії на A1",
    en: "Your company profile on A1",
    ru: "Профиль вашей компании на A1",
    de: "Ihr Unternehmensprofil auf A1",
    es: "El perfil de tu empresa en A1",
    fr: "Le profil de votre entreprise sur A1",
    pl: "Profil Twojej firmy w A1",
    ptBR: "O perfil da sua empresa no A1",
    zh: "贵公司在 A1 的主页",
  },
  intro: {
    uk: "Ваші вакансії вже опубліковані на A1. Вкажіть робочу пошту — і профіль стане вашим разом з усіма відгуками.",
    en: "Your vacancies are already published on A1. Enter your work email and the profile becomes yours, applications included.",
    ru: "Ваши вакансии уже опубликованы на A1. Укажите рабочую почту — и профиль станет вашим вместе со всеми откликами.",
    de: "Ihre Stellen sind bereits auf A1 veröffentlicht. Geben Sie Ihre Arbeits-E-Mail an, und das Profil gehört Ihnen — samt Bewerbungen.",
    es: "Tus vacantes ya están publicadas en A1. Indica tu correo de trabajo y el perfil será tuyo, con las candidaturas incluidas.",
    fr: "Vos offres sont déjà publiées sur A1. Indiquez votre e-mail professionnel et le profil devient le vôtre, candidatures comprises.",
    pl: "Twoje oferty są już opublikowane w A1. Podaj służbowy e-mail, a profil stanie się Twój razem ze zgłoszeniami.",
    ptBR: "Suas vagas já estão publicadas no A1. Informe seu e-mail de trabalho e o perfil passa a ser seu, com as candidaturas.",
    zh: "贵公司的职位已经发布在 A1。填写工作邮箱，主页和所有申请就归你了。",
  },
  emailLabel: {
    uk: "Робоча пошта", en: "Work email", ru: "Рабочая почта", de: "Arbeits-E-Mail", es: "Correo de trabajo",
    fr: "E-mail professionnel", pl: "Służbowy e-mail", ptBR: "E-mail de trabalho", zh: "工作邮箱",
  },
  emailHint: {
    uk: "На цю адресу ви входитимете надалі.",
    en: "This becomes the address you sign in with.",
    ru: "С этого адреса вы будете входить дальше.",
    de: "Mit dieser Adresse melden Sie sich künftig an.",
    es: "Con esta dirección iniciarás sesión a partir de ahora.",
    fr: "C'est l'adresse avec laquelle vous vous connecterez ensuite.",
    pl: "Tym adresem będziesz się logować.",
    ptBR: "Este passa a ser o endereço de acesso.",
    zh: "以后用这个邮箱登录。",
  },
  continue: {
    uk: "Продовжити", en: "Continue", ru: "Продолжить", de: "Weiter", es: "Continuar",
    fr: "Continuer", pl: "Dalej", ptBR: "Continuar", zh: "继续",
  },
  codeSent: {
    uk: "Ми надіслали код на цю адресу.",
    en: "We sent a code to that address.",
    ru: "Мы отправили код на этот адрес.",
    de: "Wir haben einen Code an diese Adresse geschickt.",
    es: "Enviamos un código a esa dirección.",
    fr: "Nous avons envoyé un code à cette adresse.",
    pl: "Wysłaliśmy kod na ten adres.",
    ptBR: "Enviamos um código para esse endereço.",
    zh: "我们已把验证码发到该邮箱。",
  },
  codeLabel: {
    uk: "Код з листа", en: "Code from the email", ru: "Код из письма", de: "Code aus der E-Mail",
    es: "Código del correo", fr: "Code reçu par e-mail", pl: "Kod z e-maila", ptBR: "Código do e-mail", zh: "邮件中的验证码",
  },
  passwordLabel: {
    uk: "Новий пароль", en: "New password", ru: "Новый пароль", de: "Neues Passwort", es: "Nueva contraseña",
    fr: "Nouveau mot de passe", pl: "Nowe hasło", ptBR: "Nova senha", zh: "新密码",
  },
  passwordHint: {
    uk: "Щонайменше 8 символів.", en: "At least 8 characters.", ru: "Минимум 8 символов.",
    de: "Mindestens 8 Zeichen.", es: "Al menos 8 caracteres.", fr: "Au moins 8 caractères.",
    pl: "Co najmniej 8 znaków.", ptBR: "Pelo menos 8 caracteres.", zh: "至少 8 个字符。",
  },
  finish: {
    uk: "Забрати профіль", en: "Take over the profile", ru: "Забрать профиль", de: "Profil übernehmen",
    es: "Reclamar el perfil", fr: "Récupérer le profil", pl: "Przejmij profil", ptBR: "Assumir o perfil", zh: "接管主页",
  },
  working: {
    uk: "Хвилинку…", en: "One moment…", ru: "Минутку…", de: "Einen Moment…", es: "Un momento…",
    fr: "Un instant…", pl: "Chwileczkę…", ptBR: "Um momento…", zh: "请稍候…",
  },
  doneTitle: {
    uk: "Готово!", en: "Done!", ru: "Готово!", de: "Fertig!", es: "¡Listo!",
    fr: "C'est fait !", pl: "Gotowe!", ptBR: "Pronto!", zh: "完成！",
  },
  doneBody: {
    uk: "Профіль тепер ваш. Вакансії, чати та відгуки на місці.",
    en: "The profile is yours now. Vacancies, chats and applications are all there.",
    ru: "Профиль теперь ваш. Вакансии, чаты и отклики на месте.",
    de: "Das Profil gehört jetzt Ihnen. Stellen, Chats und Bewerbungen sind alle da.",
    es: "El perfil ya es tuyo. Las vacantes, los chats y las candidaturas siguen ahí.",
    fr: "Le profil est à vous. Offres, discussions et candidatures sont toutes là.",
    pl: "Profil jest już Twój. Oferty, czaty i zgłoszenia są na miejscu.",
    ptBR: "O perfil já é seu. Vagas, conversas e candidaturas estão lá.",
    zh: "主页已归你所有，职位、聊天和申请都在。",
  },
  openProfile: {
    uk: "Відкрити профіль", en: "Open the profile", ru: "Открыть профиль", de: "Profil öffnen",
    es: "Abrir el perfil", fr: "Ouvrir le profil", pl: "Otwórz profil", ptBR: "Abrir o perfil", zh: "打开主页",
  },
  errLinkInvalid: {
    uk: "Це посилання вже недійсне. Напишіть нам, і ми надішлемо нове.",
    en: "This link is no longer valid. Write to us and we will send a new one.",
    ru: "Эта ссылка больше не действует. Напишите нам, и мы пришлём новую.",
    de: "Dieser Link ist nicht mehr gültig. Schreiben Sie uns, wir senden einen neuen.",
    es: "Este enlace ya no es válido. Escríbenos y te enviamos uno nuevo.",
    fr: "Ce lien n'est plus valide. Écrivez-nous et nous en enverrons un nouveau.",
    pl: "Ten link jest już nieważny. Napisz do nas, wyślemy nowy.",
    ptBR: "Este link não é mais válido. Escreva para nós e enviaremos outro.",
    zh: "此链接已失效。请联系我们，我们会重新发送。",
  },
  errAlreadyClaimed: {
    uk: "Цей профіль уже активовано. Увійдіть своєю поштою та паролем.",
    en: "This profile has already been activated. Sign in with your email and password.",
    ru: "Этот профиль уже активирован. Войдите своей почтой и паролем.",
    de: "Dieses Profil wurde bereits aktiviert. Melden Sie sich mit E-Mail und Passwort an.",
    es: "Este perfil ya fue activado. Inicia sesión con tu correo y contraseña.",
    fr: "Ce profil a déjà été activé. Connectez-vous avec votre e-mail et votre mot de passe.",
    pl: "Ten profil został już aktywowany. Zaloguj się e-mailem i hasłem.",
    ptBR: "Este perfil já foi ativado. Entre com seu e-mail e senha.",
    zh: "该主页已被激活，请用邮箱和密码登录。",
  },
  errEmailTaken: {
    uk: "Ця пошта вже зареєстрована на A1. Спробуйте іншу.",
    en: "That email is already registered on A1. Try another one.",
    ru: "Эта почта уже зарегистрирована на A1. Попробуйте другую.",
    de: "Diese E-Mail ist auf A1 bereits registriert. Versuchen Sie eine andere.",
    es: "Ese correo ya está registrado en A1. Prueba con otro.",
    fr: "Cet e-mail est déjà enregistré sur A1. Essayez-en un autre.",
    pl: "Ten e-mail jest już zarejestrowany w A1. Spróbuj innego.",
    ptBR: "Esse e-mail já está cadastrado no A1. Tente outro.",
    zh: "该邮箱已在 A1 注册，请换一个。",
  },
  errWrongCode: {
    uk: "Код не підійшов. Перевірте лист і спробуйте ще раз.",
    en: "That code did not work. Check the email and try again.",
    ru: "Код не подошёл. Проверьте письмо и попробуйте ещё раз.",
    de: "Der Code hat nicht gepasst. Prüfen Sie die E-Mail und versuchen Sie es erneut.",
    es: "El código no sirvió. Revisa el correo e inténtalo de nuevo.",
    fr: "Ce code n'a pas fonctionné. Vérifiez l'e-mail et réessayez.",
    pl: "Kod nie zadziałał. Sprawdź e-mail i spróbuj ponownie.",
    ptBR: "O código não funcionou. Confira o e-mail e tente de novo.",
    zh: "验证码不正确。请查看邮件后重试。",
  },
  errUnknown: {
    uk: "Щось пішло не так. Спробуйте ще раз.",
    en: "Something went wrong. Please try again.",
    ru: "Что-то пошло не так. Попробуйте ещё раз.",
    de: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    es: "Algo salió mal. Inténtalo de nuevo.",
    fr: "Une erreur s'est produite. Réessayez.",
    pl: "Coś poszło nie tak. Spróbuj ponownie.",
    ptBR: "Algo deu errado. Tente novamente.",
    zh: "出错了，请重试。",
  },
};

// 11.10.2026. Клейм открыли на весь мир, и у трёх компаний из десяти сайта
// в профиле нет -- правилу не с чем сверять адрес. Им здесь кнопка: оставить
// заявку человеку (app/api/claim/manual -> /admin/claims).
type ManualKey = "ask" | "open" | "siteLabel" | "noteLabel" | "send" | "sent" | "failed";

const MANUAL: Record<ManualKey, Record<Locale, string>> = {
  ask: {
    uk: "Немає робочої пошти на домені компанії?",
    en: "No work address on the company's domain?",
    ru: "Нет рабочей почты на домене компании?",
    de: "Keine Arbeitsadresse auf der Firmendomain?",
    es: "¿No tienes correo de trabajo en el dominio de la empresa?",
    fr: "Pas d'adresse professionnelle sur le domaine de l'entreprise ?",
    pl: "Nie masz służbowego adresu w domenie firmy?",
    ptBR: "Sem e-mail de trabalho no domínio da empresa?",
    zh: "没有公司域名的工作邮箱？",
  },
  open: {
    uk: "Залишити заявку",
    en: "Send a request",
    ru: "Оставить заявку",
    de: "Anfrage senden",
    es: "Enviar solicitud",
    fr: "Envoyer une demande",
    pl: "Wyślij zgłoszenie",
    ptBR: "Enviar solicitação",
    zh: "提交申请",
  },
  siteLabel: {
    uk: "Сайт компанії",
    en: "Company website",
    ru: "Сайт компании",
    de: "Unternehmenswebsite",
    es: "Sitio de la empresa",
    fr: "Site de l'entreprise",
    pl: "Strona firmy",
    ptBR: "Site da empresa",
    zh: "公司网站",
  },
  noteLabel: {
    uk: "Хто ви в компанії (необов'язково)",
    en: "Your role at the company (optional)",
    ru: "Кто вы в компании (необязательно)",
    de: "Ihre Rolle im Unternehmen (optional)",
    es: "Tu puesto en la empresa (opcional)",
    fr: "Votre rôle dans l'entreprise (facultatif)",
    pl: "Twoja rola w firmie (opcjonalnie)",
    ptBR: "Seu cargo na empresa (opcional)",
    zh: "您在公司的职位（选填）",
  },
  send: {
    uk: "Надіслати",
    en: "Send",
    ru: "Отправить",
    de: "Senden",
    es: "Enviar",
    fr: "Envoyer",
    pl: "Wyślij",
    ptBR: "Enviar",
    zh: "发送",
  },
  sent: {
    uk: "Дякуємо. Ми перевіримо вручну й надішлемо посилання на цю пошту.",
    en: "Thank you. We will check by hand and send the link to this address.",
    ru: "Спасибо. Проверим вручную и пришлём ссылку на эту почту.",
    de: "Danke. Wir prüfen das manuell und senden den Link an diese Adresse.",
    es: "Gracias. Lo revisaremos a mano y enviaremos el enlace a este correo.",
    fr: "Merci. Nous vérifierons manuellement et enverrons le lien à cette adresse.",
    pl: "Dziękujemy. Sprawdzimy ręcznie i wyślemy link na ten adres.",
    ptBR: "Obrigado. Vamos verificar manualmente e enviar o link para este e-mail.",
    zh: "谢谢。我们会人工核对，并把链接发到该邮箱。",
  },
  failed: {
    uk: "Не вдалося надіслати заявку. Спробуйте ще раз.",
    en: "Could not send the request. Try again.",
    ru: "Не удалось отправить заявку. Попробуйте ещё раз.",
    de: "Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.",
    es: "No se pudo enviar la solicitud. Inténtalo de nuevo.",
    fr: "Impossible d'envoyer la demande. Réessayez.",
    pl: "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
    ptBR: "Não foi possível enviar a solicitação. Tente novamente.",
    zh: "提交失败，请重试。",
  },
};

const REASON_TO_KEY: Record<string, StringKey> = {
  link_invalid: "errLinkInvalid",
  already_claimed: "errAlreadyClaimed",
  email_taken: "errEmailTaken",
  wrong_code: "errWrongCode",
  needs_other_proof: "errNeedsOtherProof",
  manual_review: "errManualReview",
  too_many_attempts: "errTooMany",
};

// 2026-09-19: экспортируется ради components/claim-company-prompt.tsx —
// вход со страницы вакансии подписан на тот же язык, что и сама форма.

type Step = "email" | "code" | "done";

// 2026-09-19: та же форма обслуживает два входа. Ссылочный — компания
// получила от нас /claim/<key>/<code> и сразу имеет право на передачу.
// Самостоятельный — она пришла со страницы вакансии, и права ещё нет:
// его выдаёт app/api/claim/request, сверив адрес с тем, что компания
// сама опубликовала. Дальше оба идут одним и тем же вторым шагом,
// поэтому дублировать форму незачем.
export type ClaimFormProps = (
  | { claimKey: string; claimCode: string }
  | { postId: string }
  | { username: string }
) & {
  /** 11.10.2026: только для счётчика кликов, см. lib/track.ts. */
  stats?: { company?: string | null; post?: string | null };
};

export function ClaimForm(props: ClaimFormProps) {
  const lang = useActiveLocale();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpKey, setOtpKey] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<StringKey | null>(null);
  // Заявка человеку -- появляется только после отказа правила.
  const [manual, setManual] = useState<"hidden" | "form" | "sent" | "failed">("hidden");
  const [site, setSite] = useState("");
  const [note, setNote] = useState("");

  async function post(url: string, body: unknown): Promise<{ ok: boolean; reason?: string; otpKey?: string }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; reason?: string; otpKey?: string };
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const data =
        "postId" in props
          ? await post("/api/claim/request", { postId: props.postId, email: email.trim() })
          : "username" in props
            ? await post("/api/claim/request", { username: props.username, email: email.trim() })
            : await post("/api/claim/verify-email", {
                key: props.claimKey,
                code: props.claimCode,
                email: email.trim(),
              });
      if (data.ok && data.otpKey) {
        track("claim_sent", { company: props.stats?.company, post: props.stats?.post });
        setOtpKey(data.otpKey);
        setStep("code");
      } else {
        const key = REASON_TO_KEY[data.reason ?? ""] ?? "errUnknown";
        setErrorKey(key);
        // Заявку предлагаем только там, где она что-то решает: правило не
        // нашло домена. «Пошта вже зайнята» или «не той код» человеком не
        // лечатся.
        if ((key === "errNeedsOtherProof" || key === "errManualReview") && !("claimKey" in props)) {
          setManual((v) => (v === "hidden" ? "form" : v));
        }
      }
    } catch {
      setErrorKey("errUnknown");
    } finally {
      setBusy(false);
    }
  }

  async function submitManual(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const body =
        "postId" in props
          ? { postId: props.postId, email: email.trim(), site: site.trim(), note: note.trim() }
          : "username" in props
            ? { username: props.username, email: email.trim(), site: site.trim(), note: note.trim() }
            : null;
      if (!body) return;
      const data = await post("/api/claim/manual", body);
      setManual(data.ok ? "sent" : "failed");
    } catch {
      setManual("failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const data = await post("/api/claim/confirm", {
        otpKey,
        code: code.trim(),
        email: email.trim(),
        password,
      });
      if (data.ok) {
        track("claim_done", { company: props.stats?.company, post: props.stats?.post });
        setStep("done");
      } else {
        setErrorKey(REASON_TO_KEY[data.reason ?? ""] ?? "errUnknown");
      }
    } catch {
      setErrorKey("errUnknown");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
  const buttonClass =
    "w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h1 className="text-xl font-semibold text-ink dark:text-neutral-100">{STRINGS.title[lang]}</h1>

      {step !== "done" && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{STRINGS.intro[lang]}</p>
      )}

      {step === "email" && (
        <form className="mt-6 flex flex-col gap-3" onSubmit={submitEmail}>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink dark:text-neutral-200">{STRINGS.emailLabel[lang]}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-500">{STRINGS.emailHint[lang]}</span>
          </label>
          <button type="submit" className={buttonClass} disabled={busy}>
            {busy ? STRINGS.working[lang] : STRINGS.continue[lang]}
          </button>
        </form>
      )}

      {step === "code" && (
        <form className="mt-6 flex flex-col gap-3" onSubmit={submitCode}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {STRINGS.codeSent[lang]} <span className="font-medium text-ink dark:text-neutral-200">{email}</span>
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink dark:text-neutral-200">{STRINGS.codeLabel[lang]}</span>
            <input
              inputMode="numeric"
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink dark:text-neutral-200">{STRINGS.passwordLabel[lang]}</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-500">{STRINGS.passwordHint[lang]}</span>
          </label>
          <button type="submit" className={buttonClass} disabled={busy}>
            {busy ? STRINGS.working[lang] : STRINGS.finish[lang]}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-base font-semibold text-ink dark:text-neutral-100">{STRINGS.doneTitle[lang]}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{STRINGS.doneBody[lang]}</p>
          <a href="/" className={buttonClass + " text-center"}>
            {STRINGS.openProfile[lang]}
          </a>
        </div>
      )}

      {errorKey && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {STRINGS[errorKey][lang]}
        </p>
      )}

      {manual === "sent" ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {MANUAL.sent[lang]}
        </p>
      ) : manual !== "hidden" ? (
        <form className="mt-4 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-800/60" onSubmit={submitManual}>
          <p className="text-sm font-medium text-ink dark:text-neutral-200">{MANUAL.ask[lang]}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{MANUAL.siteLabel[lang]}</span>
            <input
              type="url"
              required
              placeholder="https://"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{MANUAL.noteLabel[lang]}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
          </label>
          <button type="submit" className={buttonClass} disabled={busy}>
            {busy ? STRINGS.working[lang] : MANUAL.send[lang]}
          </button>
          {manual === "failed" && <p className="text-sm text-red-600">{MANUAL.failed[lang]}</p>}
        </form>
      ) : null}
    </div>
  );
}

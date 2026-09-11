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

import { useEffect, useState, type FormEvent } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";

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
  | "errUnknown";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
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

const REASON_TO_KEY: Record<string, StringKey> = {
  link_invalid: "errLinkInvalid",
  already_claimed: "errAlreadyClaimed",
  email_taken: "errEmailTaken",
  wrong_code: "errWrongCode",
};

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

type Step = "email" | "code" | "done";

export function ClaimForm({ claimKey, claimCode }: { claimKey: string; claimCode: string }) {
  const lang = useActiveLocale();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpKey, setOtpKey] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<StringKey | null>(null);

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
      const data = await post("/api/claim/verify-email", { key: claimKey, code: claimCode, email: email.trim() });
      if (data.ok && data.otpKey) {
        setOtpKey(data.otpKey);
        setStep("code");
      } else {
        setErrorKey(REASON_TO_KEY[data.reason ?? ""] ?? "errUnknown");
      }
    } catch {
      setErrorKey("errUnknown");
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
    </div>
  );
}

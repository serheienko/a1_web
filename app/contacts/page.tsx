// app/contacts/page.tsx — "contact book" (Aleksandr, 2026-08-31: "давай
// где-то что-то накидаешь... где-то у нас какую-то контактную книгу. Но
// я пока не сильно знаю UI, где и как это расположить").
//
// Explicitly a rough first pass per his own framing ("накидаешь, потом
// пересделаем") — both the page's own layout AND its entry point
// (components/avatar-menu.tsx's new "Контакти" row) are placeholders to
// react to live, not a settled design.
//
// Client component, not a server one: unlike every feed/profile page in
// this app, a contact list is inherently visitor-specific (it's "my"
// contacts, no ISR-cacheable public version exists) and needs the
// visitor's own session cookie — same reasoning components/edit-profile-
// button.tsx's whoami call documents for why that's a client-side
// concern here, not a server one.
//
// Each Contact (lib/a1/schemas.ts's ContactSchema) only ever carries
// firstName/lastName/phone — no photo, and only a raw `user` id, not a
// username. 2026-08-31, live-testing feedback ("Арина в контактах
// сохраняется почему то с другим аватаром"): app/api/contacts/list/
// route.ts now separately resolves every platform-linked contact's real
// profile (contacts.search's own `users` array, confirmed live against
// aone-api-private's source — see that route's comment) and returns it
// here as `contactUsers`, keyed by user id. A contact with no match
// there (a phone-book entry with no linked user, or a linked account
// that no longer resolves) falls back to the same generated
// pickDefaultCatAvatar placeholder as before.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { T } from "@/components/t";
import type { Contact } from "@/lib/a1/schemas";

type LoadState = "loading" | "signed-out" | "error" | "ready";

type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
};

function contactName(contact: Contact, linkedUser: ContactUserSummary | undefined): string {
  if (linkedUser?.fullName) return linkedUser.fullName;
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  if (name) return name;
  if (contact.phone) return contact.phone;
  return "—";
}

export default function ContactsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactUsers, setContactUsers] = useState<Record<string, ContactUserSummary>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/contacts/list")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setState("error");
          return;
        }
        setContacts(data.contacts ?? []);
        setContactUsers(data.contactUsers ?? {});
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T uk="Контакти" en="Contacts" ru="Контакты" de="Kontakte" es="Contactos" fr="Contacts" pl="Kontakty" ptBR="Contatos" zh="联系人" />
      </h1>

      {state === "loading" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
        </p>
      )}

      {state === "signed-out" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Увійдіть, щоб побачити свої контакти."
            en="Sign in to see your contacts."
            ru="Войдите, чтобы увидеть свои контакты."
            de="Melde dich an, um deine Kontakte zu sehen."
            es="Inicia sesión para ver tus contactos."
            fr="Connectez-vous pour voir vos contacts."
            pl="Zaloguj się, aby zobaczyć swoje kontakty."
            ptBR="Entre para ver seus contatos."
            zh="登录以查看您的联系人。"
          />
        </p>
      )}

      {state === "error" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Не вдалося завантажити контакти."
            en="Couldn't load contacts."
            ru="Не удалось загрузить контакты."
            de="Kontakte konnten nicht geladen werden."
            es="No se pudieron cargar los contactos."
            fr="Impossible de charger les contacts."
            pl="Nie udało się załadować kontaktów."
            ptBR="Não foi possível carregar os contatos."
            zh="无法加载联系人。"
          />
        </p>
      )}

      {state === "ready" && contacts.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Поки немає жодного контакту. Додайте когось із профілю."
            en="No contacts yet. Add someone from their profile."
            ru="Пока нет ни одного контакта. Добавьте кого-нибудь с его профиля."
            de="Noch keine Kontakte. Füge jemanden über sein Profil hinzu."
            es="Aún no hay contactos. Añade a alguien desde su perfil."
            fr="Aucun contact pour l'instant. Ajoutez quelqu'un depuis son profil."
            pl="Brak kontaktów. Dodaj kogoś z jego profilu."
            ptBR="Ainda sem contatos. Adicione alguém pelo perfil dele."
            zh="暂无联系人。可在对方主页添加。"
          />
        </p>
      )}

      {state === "ready" && contacts.length > 0 && (
        <div className="mt-6 flex flex-col gap-1">
          {contacts.map((contact) => {
            const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
            const avatarSrc = linkedUser?.avatarUrl ?? pickDefaultCatAvatar(contact._id);
            const row = (
              <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {contactName(contact, linkedUser)}
                  </div>
                  {contact.phone && <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{contact.phone}</div>}
                </div>
              </div>
            );
            return linkedUser?.username ? (
              <Link key={contact._id} href={profileHref(linkedUser.username)}>
                {row}
              </Link>
            ) : (
              <div key={contact._id}>{row}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}

// lib/a1/group-chat.ts
//
// Группы в чатах на сайте (волна 1, 2026-10-03). Общие для сервера и
// клиента константы флагов, разбор служебных сообщений группы
// («Alex added Ivan») и переводы на 9 языков. Переводы служебных строк
// взяты из приложения (lib/l10n/app_*.arb, ключи groupNote*), чтобы на
// сайте и в приложении это читалось одинаково.
//
// Флаги подтверждены по packages/constants/src/chats.constants.ts и
// messages.constants.ts бэкенда: PERSONAL=1<<0, GROUP=1<<1, PUBLIC=1<<2,
// THREAD=1<<3; служебное сообщение = флаг сообщения 1<<30.
export const CHAT_FLAG_GROUP = 1 << 1;
export const CHAT_FLAG_PUBLIC = 1 << 2;
export const CHAT_FLAG_THREAD = 1 << 3;
export const MESSAGE_FLAG_SERVICE = 1 << 30;

export type GroupLang = "uk" | "ru" | "en" | "de" | "es" | "fr" | "pl" | "ptBR" | "zh";

export function isGroupFlags(flags: number | undefined | null): boolean {
  return ((flags ?? 0) & CHAT_FLAG_GROUP) !== 0;
}

export function isServiceFlags(flags: number | undefined | null): boolean {
  // Флаг 1<<30 помещается в int32, битовые операции JS безопасны.
  return ((flags ?? 0) & MESSAGE_FLAG_SERVICE) !== 0;
}

const NOTES: Record<GroupLang, Record<string, string>> = {
 "uk": {
  "groupNoteCreated": "{actor} створив(ла) групу",
  "groupCreatedByYou": "Ви створили групу",
  "groupNoteAdded": "{actor} додав(ла) {users}",
  "groupNoteAddedByYou": "Ви додали {users}",
  "groupNoteJoined": "{actor} приєднався(-лася) до групи за посиланням",
  "groupNoteJoinedByYou": "Ви приєдналися до групи за посиланням",
  "groupNoteLeft": "{actor} покинув(ла) групу",
  "groupNoteLeftByYou": "Ви покинули групу",
  "groupNoteRemoved": "{actor} видалив(ла) {users}",
  "groupNoteRemovedByYou": "Ви видалили {users}",
  "groupNoteRenamed": "{actor} змінив(ла) назву групи на «{title}»",
  "groupNoteRenamedByYou": "Ви змінили назву групи на «{title}»",
  "groupNotePhotoChanged": "{actor} змінив(ла) фото групи",
  "groupNotePhotoChangedByYou": "Ви змінили фото групи",
  "groupNotePhotoRemoved": "{actor} видалив(ла) фото групи",
  "groupNotePhotoRemovedByYou": "Ви видалили фото групи",
  "groupNoteAnd": " і ",
  "groupNoteYouObject": "вас"
 },
 "ru": {
  "groupNoteCreated": "{actor} создал(а) группу",
  "groupCreatedByYou": "Вы создали группу",
  "groupNoteAdded": "{actor} добавил(а) {users}",
  "groupNoteAddedByYou": "Вы добавили {users}",
  "groupNoteJoined": "{actor} присоединился(-ась) к группе по ссылке",
  "groupNoteJoinedByYou": "Вы присоединились к группе по ссылке",
  "groupNoteLeft": "{actor} покинул(а) группу",
  "groupNoteLeftByYou": "Вы покинули группу",
  "groupNoteRemoved": "{actor} удалил(а) {users}",
  "groupNoteRemovedByYou": "Вы удалили {users}",
  "groupNoteRenamed": "{actor} изменил(а) название группы на «{title}»",
  "groupNoteRenamedByYou": "Вы изменили название группы на «{title}»",
  "groupNotePhotoChanged": "{actor} изменил(а) фото группы",
  "groupNotePhotoChangedByYou": "Вы изменили фото группы",
  "groupNotePhotoRemoved": "{actor} удалил(а) фото группы",
  "groupNotePhotoRemovedByYou": "Вы удалили фото группы",
  "groupNoteAnd": " и ",
  "groupNoteYouObject": "вас"
 },
 "en": {
  "groupNoteCreated": "{actor} created the group",
  "groupCreatedByYou": "You created the group",
  "groupNoteAdded": "{actor} added {users}",
  "groupNoteAddedByYou": "You added {users}",
  "groupNoteJoined": "{actor} joined the group via invite link",
  "groupNoteJoinedByYou": "You joined the group via invite link",
  "groupNoteLeft": "{actor} left the group",
  "groupNoteLeftByYou": "You left the group",
  "groupNoteRemoved": "{actor} removed {users}",
  "groupNoteRemovedByYou": "You removed {users}",
  "groupNoteRenamed": "{actor} changed the group name to «{title}»",
  "groupNoteRenamedByYou": "You changed the group name to «{title}»",
  "groupNotePhotoChanged": "{actor} changed the group photo",
  "groupNotePhotoChangedByYou": "You changed the group photo",
  "groupNotePhotoRemoved": "{actor} removed the group photo",
  "groupNotePhotoRemovedByYou": "You removed the group photo",
  "groupNoteAnd": " and ",
  "groupNoteYouObject": "you"
 },
 "de": {
  "groupNoteCreated": "{actor} hat die Gruppe erstellt",
  "groupCreatedByYou": "Du hast die Gruppe erstellt",
  "groupNoteAdded": "{actor} hat {users} hinzugefügt",
  "groupNoteAddedByYou": "Du hast {users} hinzugefügt",
  "groupNoteJoined": "{actor} ist der Gruppe über den Einladungslink beigetreten",
  "groupNoteJoinedByYou": "Du bist der Gruppe über den Einladungslink beigetreten",
  "groupNoteLeft": "{actor} hat die Gruppe verlassen",
  "groupNoteLeftByYou": "Du hast die Gruppe verlassen",
  "groupNoteRemoved": "{actor} hat {users} entfernt",
  "groupNoteRemovedByYou": "Du hast {users} entfernt",
  "groupNoteRenamed": "{actor} hat den Gruppennamen in „{title}“ geändert",
  "groupNoteRenamedByYou": "Du hast den Gruppennamen in „{title}“ geändert",
  "groupNotePhotoChanged": "{actor} hat das Gruppenbild geändert",
  "groupNotePhotoChangedByYou": "Du hast das Gruppenbild geändert",
  "groupNotePhotoRemoved": "{actor} hat das Gruppenbild entfernt",
  "groupNotePhotoRemovedByYou": "Du hast das Gruppenbild entfernt",
  "groupNoteAnd": " und ",
  "groupNoteYouObject": "dich"
 },
 "es": {
  "groupNoteCreated": "{actor} creó el grupo",
  "groupCreatedByYou": "Creaste el grupo",
  "groupNoteAdded": "{actor} añadió a {users}",
  "groupNoteAddedByYou": "Añadiste a {users}",
  "groupNoteJoined": "{actor} se unió al grupo con el enlace de invitación",
  "groupNoteJoinedByYou": "Te uniste al grupo con el enlace de invitación",
  "groupNoteLeft": "{actor} salió del grupo",
  "groupNoteLeftByYou": "Saliste del grupo",
  "groupNoteRemoved": "{actor} eliminó a {users}",
  "groupNoteRemovedByYou": "Eliminaste a {users}",
  "groupNoteRenamed": "{actor} cambió el nombre del grupo a «{title}»",
  "groupNoteRenamedByYou": "Cambiaste el nombre del grupo a «{title}»",
  "groupNotePhotoChanged": "{actor} cambió la foto del grupo",
  "groupNotePhotoChangedByYou": "Cambiaste la foto del grupo",
  "groupNotePhotoRemoved": "{actor} eliminó la foto del grupo",
  "groupNotePhotoRemovedByYou": "Eliminaste la foto del grupo",
  "groupNoteAnd": " y ",
  "groupNoteYouObject": "ti"
 },
 "fr": {
  "groupNoteCreated": "{actor} a créé le groupe",
  "groupCreatedByYou": "Vous avez créé le groupe",
  "groupNoteAdded": "{actor} a ajouté {users}",
  "groupNoteAddedByYou": "Vous avez ajouté {users}",
  "groupNoteJoined": "{actor} a rejoint le groupe via le lien d'invitation",
  "groupNoteJoinedByYou": "Vous avez rejoint le groupe via le lien d'invitation",
  "groupNoteLeft": "{actor} a quitté le groupe",
  "groupNoteLeftByYou": "Vous avez quitté le groupe",
  "groupNoteRemoved": "{actor} a retiré {users}",
  "groupNoteRemovedByYou": "Vous avez retiré {users}",
  "groupNoteRenamed": "{actor} a renommé le groupe en « {title} »",
  "groupNoteRenamedByYou": "Vous avez renommé le groupe en « {title} »",
  "groupNotePhotoChanged": "{actor} a changé la photo du groupe",
  "groupNotePhotoChangedByYou": "Vous avez changé la photo du groupe",
  "groupNotePhotoRemoved": "{actor} a supprimé la photo du groupe",
  "groupNotePhotoRemovedByYou": "Vous avez supprimé la photo du groupe",
  "groupNoteAnd": " et ",
  "groupNoteYouObject": "vous"
 },
 "pl": {
  "groupNoteCreated": "{actor} utworzył(a) grupę",
  "groupCreatedByYou": "Utworzyłeś(-aś) grupę",
  "groupNoteAdded": "{actor} dodał(a) {users}",
  "groupNoteAddedByYou": "Dodałeś(-aś) {users}",
  "groupNoteJoined": "{actor} dołączył(a) do grupy przez link",
  "groupNoteJoinedByYou": "Dołączyłeś(-aś) do grupy przez link",
  "groupNoteLeft": "{actor} opuścił(a) grupę",
  "groupNoteLeftByYou": "Opuściłeś(-aś) grupę",
  "groupNoteRemoved": "{actor} usunął(-ęła) {users}",
  "groupNoteRemovedByYou": "Usunąłeś(-ęłaś) {users}",
  "groupNoteRenamed": "{actor} zmienił(a) nazwę grupy na „{title}”",
  "groupNoteRenamedByYou": "Zmieniłeś(-aś) nazwę grupy na „{title}”",
  "groupNotePhotoChanged": "{actor} zmienił(a) zdjęcie grupy",
  "groupNotePhotoChangedByYou": "Zmieniłeś(-aś) zdjęcie grupy",
  "groupNotePhotoRemoved": "{actor} usunął(-ęła) zdjęcie grupy",
  "groupNotePhotoRemovedByYou": "Usunąłeś(-ęłaś) zdjęcie grupy",
  "groupNoteAnd": " i ",
  "groupNoteYouObject": "ciebie"
 },
 "ptBR": {
  "groupNoteCreated": "{actor} criou o grupo",
  "groupCreatedByYou": "Você criou o grupo",
  "groupNoteAdded": "{actor} adicionou {users}",
  "groupNoteAddedByYou": "Você adicionou {users}",
  "groupNoteJoined": "{actor} entrou no grupo pelo link de convite",
  "groupNoteJoinedByYou": "Você entrou no grupo pelo link de convite",
  "groupNoteLeft": "{actor} saiu do grupo",
  "groupNoteLeftByYou": "Você saiu do grupo",
  "groupNoteRemoved": "{actor} removeu {users}",
  "groupNoteRemovedByYou": "Você removeu {users}",
  "groupNoteRenamed": "{actor} alterou o nome do grupo para «{title}»",
  "groupNoteRenamedByYou": "Você alterou o nome do grupo para «{title}»",
  "groupNotePhotoChanged": "{actor} alterou a foto do grupo",
  "groupNotePhotoChangedByYou": "Você alterou a foto do grupo",
  "groupNotePhotoRemoved": "{actor} removeu a foto do grupo",
  "groupNotePhotoRemovedByYou": "Você removeu a foto do grupo",
  "groupNoteAnd": " e ",
  "groupNoteYouObject": "você"
 },
 "zh": {
  "groupNoteCreated": "{actor} 创建了群组",
  "groupCreatedByYou": "你创建了群组",
  "groupNoteAdded": "{actor} 添加了 {users}",
  "groupNoteAddedByYou": "你添加了 {users}",
  "groupNoteJoined": "{actor} 通过邀请链接加入了群组",
  "groupNoteJoinedByYou": "你通过邀请链接加入了群组",
  "groupNoteLeft": "{actor} 离开了群组",
  "groupNoteLeftByYou": "你离开了群组",
  "groupNoteRemoved": "{actor} 移除了 {users}",
  "groupNoteRemovedByYou": "你移除了 {users}",
  "groupNoteRenamed": "{actor} 将群组名称改为“{title}”",
  "groupNoteRenamedByYou": "你将群组名称改为“{title}”",
  "groupNotePhotoChanged": "{actor} 更换了群组头像",
  "groupNotePhotoChangedByYou": "你更换了群组头像",
  "groupNotePhotoRemoved": "{actor} 移除了群组头像",
  "groupNotePhotoRemovedByYou": "你移除了群组头像",
  "groupNoteAnd": "和",
  "groupNoteYouObject": "你"
 }
};

const UI: Record<string, Record<GroupLang, string>> = {
 "newGroup": {
  "uk": "Нова група",
  "ru": "Новая группа",
  "en": "New group",
  "de": "Neue Gruppe",
  "es": "Nuevo grupo",
  "fr": "Nouveau groupe",
  "pl": "Nowa grupa",
  "ptBR": "Novo grupo",
  "zh": "新建群组"
 },
 "groupName": {
  "uk": "Назва групи",
  "ru": "Название группы",
  "en": "Group name",
  "de": "Gruppenname",
  "es": "Nombre del grupo",
  "fr": "Nom du groupe",
  "pl": "Nazwa grupy",
  "ptBR": "Nome do grupo",
  "zh": "群组名称"
 },
 "createGroup": {
  "uk": "Створити",
  "ru": "Создать",
  "en": "Create",
  "de": "Erstellen",
  "es": "Crear",
  "fr": "Créer",
  "pl": "Utwórz",
  "ptBR": "Criar",
  "zh": "创建"
 },
 "leaveGroup": {
  "uk": "Вийти з групи",
  "ru": "Выйти из группы",
  "en": "Leave group",
  "de": "Gruppe verlassen",
  "es": "Salir del grupo",
  "fr": "Quitter le groupe",
  "pl": "Opuść grupę",
  "ptBR": "Sair do grupo",
  "zh": "退出群组"
 },
 "leaveGroupConfirm": {
  "uk": "Вийти з «{title}»? Ви більше не бачитимете повідомлення цієї групи.",
  "ru": "Выйти из «{title}»? Вы больше не будете видеть сообщения этой группы.",
  "en": "Leave “{title}”? You will no longer see messages from this group.",
  "de": "„{title}“ verlassen? Du siehst keine Nachrichten dieser Gruppe mehr.",
  "es": "¿Salir de «{title}»? Ya no verás los mensajes de este grupo.",
  "fr": "Quitter « {title} » ? Vous ne verrez plus les messages de ce groupe.",
  "pl": "Opuścić „{title}”? Nie będziesz już widzieć wiadomości z tej grupy.",
  "ptBR": "Sair de «{title}»? Você não verá mais as mensagens deste grupo.",
  "zh": "退出“{title}”？你将不再看到此群组的消息。"
 },
 "groupMembers": {
  "uk": "Учасники",
  "ru": "Участники",
  "en": "Members",
  "de": "Mitglieder",
  "es": "Miembros",
  "fr": "Membres",
  "pl": "Uczestnicy",
  "ptBR": "Membros",
  "zh": "成员"
 },
 "groupOwner": {
  "uk": "творець",
  "ru": "создатель",
  "en": "owner",
  "de": "Ersteller",
  "es": "creador",
  "fr": "créateur",
  "pl": "twórca",
  "ptBR": "criador",
  "zh": "创建者"
 },
 "groupCreateFailed": {
  "uk": "Не вдалося створити групу. Спробуйте ще раз.",
  "ru": "Не удалось создать группу. Попробуйте ещё раз.",
  "en": "Could not create the group. Try again.",
  "de": "Gruppe konnte nicht erstellt werden. Versuche es erneut.",
  "es": "No se pudo crear el grupo. Inténtalo de nuevo.",
  "fr": "Impossible de créer le groupe. Réessayez.",
  "pl": "Nie udało się utworzyć grupy. Spróbuj ponownie.",
  "ptBR": "Não foi possível criar o grupo. Tente novamente.",
  "zh": "无法创建群组，请重试。"
 },
 "groupPickerHint": {
  "uk": "Кого ви хочете додати?",
  "ru": "Кого вы хотите добавить?",
  "en": "Who would you like to add?",
  "de": "Wen möchtest du hinzufügen?",
  "es": "¿A quién quieres añadir?",
  "fr": "Qui souhaitez-vous ajouter ?",
  "pl": "Kogo chcesz dodać?",
  "ptBR": "Quem você quer adicionar?",
  "zh": "你想添加谁？"
 },
 "groupSelected": {
  "uk": "Обрано {n}",
  "ru": "Выбрано {n}",
  "en": "{n} selected",
  "de": "{n} ausgewählt",
  "es": "{n} seleccionados",
  "fr": "{n} sélectionnés",
  "pl": "Wybrano: {n}",
  "ptBR": "{n} selecionados",
  "zh": "已选 {n}"
 },
 "groupSelectPeople": {
  "uk": "Оберіть людей",
  "ru": "Выберите людей",
  "en": "Select people",
  "de": "Personen auswählen",
  "es": "Selecciona personas",
  "fr": "Choisissez des personnes",
  "pl": "Wybierz osoby",
  "ptBR": "Selecione pessoas",
  "zh": "选择成员"
 },
 "groupSearch": {
  "uk": "Пошук серед контактів",
  "ru": "Поиск по контактам",
  "en": "Search contacts",
  "de": "Kontakte durchsuchen",
  "es": "Buscar contactos",
  "fr": "Rechercher des contacts",
  "pl": "Szukaj kontaktów",
  "ptBR": "Buscar contatos",
  "zh": "搜索联系人"
 },
 "groupNoContacts": {
  "uk": "Спершу додайте контакти — вони з’являться тут.",
  "ru": "Сначала добавьте контакты — они появятся здесь.",
  "en": "Add contacts first — they will show up here.",
  "de": "Füge zuerst Kontakte hinzu – sie erscheinen hier.",
  "es": "Primero añade contactos: aparecerán aquí.",
  "fr": "Ajoutez d’abord des contacts : ils apparaîtront ici.",
  "pl": "Najpierw dodaj kontakty – pojawią się tutaj.",
  "ptBR": "Adicione contatos primeiro — eles aparecerão aqui.",
  "zh": "请先添加联系人，他们会显示在这里。"
 },
 "groupYou": {
  "uk": "Ви",
  "ru": "Вы",
  "en": "You",
  "de": "Du",
  "es": "Tú",
  "fr": "Vous",
  "pl": "Ty",
  "ptBR": "Você",
  "zh": "你"
 },
 "groupUnknownUser": {
  "uk": "Користувач",
  "ru": "Пользователь",
  "en": "User",
  "de": "Nutzer",
  "es": "Usuario",
  "fr": "Utilisateur",
  "pl": "Użytkownik",
  "ptBR": "Usuário",
  "zh": "用户"
 },
 "groupCancel": {
  "uk": "Скасувати",
  "ru": "Отмена",
  "en": "Cancel",
  "de": "Abbrechen",
  "es": "Cancelar",
  "fr": "Annuler",
  "pl": "Anuluj",
  "ptBR": "Cancelar",
  "zh": "取消"
 },
 "groupLeftToast": {
  "uk": "Ви вийшли з групи",
  "ru": "Вы вышли из группы",
  "en": "You left the group",
  "de": "Du hast die Gruppe verlassen",
  "es": "Saliste del grupo",
  "fr": "Vous avez quitté le groupe",
  "pl": "Opuściłeś(-aś) grupę",
  "ptBR": "Você saiu do grupo",
  "zh": "你已退出群组"
 }
};

const MEMBERS: Record<GroupLang, Record<string, string>> = {
 "uk": {
  "one": "{n} учасник",
  "few": "{n} учасники",
  "other": "{n} учасників",
  "many": "{n} учасників"
 },
 "ru": {
  "one": "{n} участник",
  "few": "{n} участника",
  "other": "{n} участников",
  "many": "{n} участников"
 },
 "en": {
  "one": "{n} member",
  "other": "{n} members"
 },
 "de": {
  "one": "{n} Mitglied",
  "other": "{n} Mitglieder"
 },
 "es": {
  "one": "{n} miembro",
  "other": "{n} miembros"
 },
 "fr": {
  "one": "{n} membre",
  "other": "{n} membres"
 },
 "pl": {
  "one": "{n} uczestnik",
  "few": "{n} uczestników",
  "other": "{n} uczestników",
  "many": "{n} uczestników"
 },
 "ptBR": {
  "one": "{n} membro",
  "other": "{n} membros"
 },
 "zh": {
  "other": "{n} 位成员"
 }
};

const UI_W2: Record<string, Record<GroupLang, string>> = {
 "addMembers": {
  "uk": "Додати учасників",
  "ru": "Добавить участников",
  "en": "Add members",
  "de": "Mitglieder hinzufügen",
  "es": "Añadir miembros",
  "fr": "Ajouter des membres",
  "pl": "Dodaj uczestników",
  "ptBR": "Adicionar membros",
  "zh": "添加成员"
 },
 "addAction": {
  "uk": "Додати",
  "ru": "Добавить",
  "en": "Add",
  "de": "Hinzufügen",
  "es": "Añadir",
  "fr": "Ajouter",
  "pl": "Dodaj",
  "ptBR": "Adicionar",
  "zh": "添加"
 },
 "removeMember": {
  "uk": "Видалити з групи",
  "ru": "Удалить из группы",
  "en": "Remove from group",
  "de": "Aus Gruppe entfernen",
  "es": "Eliminar del grupo",
  "fr": "Retirer du groupe",
  "pl": "Usuń z grupy",
  "ptBR": "Remover do grupo",
  "zh": "移出群组"
 },
 "removeMemberConfirm": {
  "uk": "Видалити {name} з групи?",
  "ru": "Удалить {name} из группы?",
  "en": "Remove {name} from the group?",
  "de": "{name} aus der Gruppe entfernen?",
  "es": "¿Eliminar a {name} del grupo?",
  "fr": "Retirer {name} du groupe ?",
  "pl": "Usunąć {name} z grupy?",
  "ptBR": "Remover {name} do grupo?",
  "zh": "将 {name} 移出群组？"
 },
 "editGroup": {
  "uk": "Змінити групу",
  "ru": "Изменить группу",
  "en": "Edit group",
  "de": "Gruppe bearbeiten",
  "es": "Editar grupo",
  "fr": "Modifier le groupe",
  "pl": "Edytuj grupę",
  "ptBR": "Editar grupo",
  "zh": "编辑群组"
 },
 "groupDescription": {
  "uk": "Опис",
  "ru": "Описание",
  "en": "Description",
  "de": "Beschreibung",
  "es": "Descripción",
  "fr": "Description",
  "pl": "Opis",
  "ptBR": "Descrição",
  "zh": "简介"
 },
 "groupType": {
  "uk": "Тип групи",
  "ru": "Тип группы",
  "en": "Group type",
  "de": "Gruppentyp",
  "es": "Tipo de grupo",
  "fr": "Type de groupe",
  "pl": "Typ grupy",
  "ptBR": "Tipo de grupo",
  "zh": "群组类型"
 },
 "groupTypePrivate": {
  "uk": "Приватна",
  "ru": "Приватная",
  "en": "Private",
  "de": "Privat",
  "es": "Privado",
  "fr": "Privé",
  "pl": "Prywatna",
  "ptBR": "Privado",
  "zh": "私密"
 },
 "groupTypePublic": {
  "uk": "Публічна",
  "ru": "Публичная",
  "en": "Public",
  "de": "Öffentlich",
  "es": "Público",
  "fr": "Public",
  "pl": "Publiczna",
  "ptBR": "Público",
  "zh": "公开"
 },
 "groupTypePrivateHint": {
  "uk": "Приєднатися можуть лише ті, кого запросили учасники.",
  "ru": "Присоединиться могут только те, кого пригласили участники.",
  "en": "Only people invited by members can join.",
  "de": "Nur von Mitgliedern eingeladene Personen können beitreten.",
  "es": "Solo pueden unirse las personas invitadas por los miembros.",
  "fr": "Seules les personnes invitées par des membres peuvent rejoindre.",
  "pl": "Dołączyć mogą tylko osoby zaproszone przez uczestników.",
  "ptBR": "Só entram pessoas convidadas pelos membros.",
  "zh": "只有被成员邀请的人才能加入。"
 },
 "groupTypePublicHint": {
  "uk": "Будь-хто з посиланням може знайти групу і приєднатися.",
  "ru": "Любой со ссылкой может найти группу и присоединиться.",
  "en": "Anyone with the link can find and join the group.",
  "de": "Jeder mit dem Link kann die Gruppe finden und beitreten.",
  "es": "Cualquiera con el enlace puede encontrar el grupo y unirse.",
  "fr": "Toute personne avec le lien peut trouver le groupe et le rejoindre.",
  "pl": "Każdy z linkiem może znaleźć grupę i dołączyć.",
  "ptBR": "Qualquer pessoa com o link pode encontrar o grupo e entrar.",
  "zh": "任何拥有链接的人都可以找到并加入群组。"
 },
 "groupSave": {
  "uk": "Зберегти",
  "ru": "Сохранить",
  "en": "Save",
  "de": "Speichern",
  "es": "Guardar",
  "fr": "Enregistrer",
  "pl": "Zapisz",
  "ptBR": "Salvar",
  "zh": "保存"
 },
 "groupSaveFailed": {
  "uk": "Не вдалося зберегти зміни. Спробуйте ще раз.",
  "ru": "Не удалось сохранить изменения. Попробуйте ещё раз.",
  "en": "Could not save the changes. Try again.",
  "de": "Änderungen konnten nicht gespeichert werden. Versuche es erneut.",
  "es": "No se pudieron guardar los cambios. Inténtalo de nuevo.",
  "fr": "Impossible d’enregistrer les modifications. Réessayez.",
  "pl": "Nie udało się zapisać zmian. Spróbuj ponownie.",
  "ptBR": "Não foi possível salvar as alterações. Tente novamente.",
  "zh": "无法保存更改，请重试。"
 },
 "groupNoPermission": {
  "uk": "Для цього потрібні права адміністратора.",
  "ru": "Для этого нужны права администратора.",
  "en": "This needs admin rights.",
  "de": "Dafür sind Admin-Rechte nötig.",
  "es": "Esto requiere derechos de administrador.",
  "fr": "Cela nécessite les droits d’administrateur.",
  "pl": "Wymaga to uprawnień administratora.",
  "ptBR": "Isso exige direitos de administrador.",
  "zh": "此操作需要管理员权限。"
 },
 "groupChangePhoto": {
  "uk": "Змінити фото",
  "ru": "Изменить фото",
  "en": "Change photo",
  "de": "Foto ändern",
  "es": "Cambiar foto",
  "fr": "Changer la photo",
  "pl": "Zmień zdjęcie",
  "ptBR": "Alterar foto",
  "zh": "更换头像"
 },
 "groupRemovePhoto": {
  "uk": "Прибрати фото",
  "ru": "Убрать фото",
  "en": "Remove photo",
  "de": "Foto entfernen",
  "es": "Quitar foto",
  "fr": "Supprimer la photo",
  "pl": "Usuń zdjęcie",
  "ptBR": "Remover foto",
  "zh": "移除头像"
 },
 "groupMute": {
  "uk": "Вимкнути сповіщення",
  "ru": "Отключить уведомления",
  "en": "Mute notifications",
  "de": "Benachrichtigungen stummschalten",
  "es": "Silenciar notificaciones",
  "fr": "Couper les notifications",
  "pl": "Wycisz powiadomienia",
  "ptBR": "Silenciar notificações",
  "zh": "关闭通知"
 },
 "groupUnmute": {
  "uk": "Увімкнути сповіщення",
  "ru": "Включить уведомления",
  "en": "Unmute notifications",
  "de": "Benachrichtigungen aktivieren",
  "es": "Activar notificaciones",
  "fr": "Réactiver les notifications",
  "pl": "Włącz powiadomienia",
  "ptBR": "Ativar notificações",
  "zh": "开启通知"
 },
 "chatPin": {
  "uk": "Закріпити чат",
  "ru": "Закрепить чат",
  "en": "Pin chat",
  "de": "Chat anheften",
  "es": "Fijar chat",
  "fr": "Épingler le chat",
  "pl": "Przypnij czat",
  "ptBR": "Fixar conversa",
  "zh": "置顶聊天"
 },
 "chatUnpin": {
  "uk": "Відкріпити чат",
  "ru": "Открепить чат",
  "en": "Unpin chat",
  "de": "Chat lösen",
  "es": "Desfijar chat",
  "fr": "Désépingler le chat",
  "pl": "Odepnij czat",
  "ptBR": "Desafixar conversa",
  "zh": "取消置顶"
 },
 "chatPinLimit": {
  "uk": "Можна закріпити до 5 чатів.",
  "ru": "Можно закрепить до 5 чатов.",
  "en": "You can pin up to 5 chats.",
  "de": "Du kannst bis zu 5 Chats anheften.",
  "es": "Puedes fijar hasta 5 chats.",
  "fr": "Vous pouvez épingler jusqu’à 5 chats.",
  "pl": "Możesz przypiąć do 5 czatów.",
  "ptBR": "Você pode fixar até 5 conversas.",
  "zh": "最多可置顶 5 个聊天。"
 },
 "inviteLink": {
  "uk": "Посилання-запрошення",
  "ru": "Ссылка-приглашение",
  "en": "Invite link",
  "de": "Einladungslink",
  "es": "Enlace de invitación",
  "fr": "Lien d’invitation",
  "pl": "Link zapraszający",
  "ptBR": "Link de convite",
  "zh": "邀请链接"
 },
 "copyLink": {
  "uk": "Скопіювати",
  "ru": "Скопировать",
  "en": "Copy",
  "de": "Kopieren",
  "es": "Copiar",
  "fr": "Copier",
  "pl": "Kopiuj",
  "ptBR": "Copiar",
  "zh": "复制"
 },
 "linkCopied": {
  "uk": "Скопійовано",
  "ru": "Скопировано",
  "en": "Copied",
  "de": "Kopiert",
  "es": "Copiado",
  "fr": "Copié",
  "pl": "Skopiowano",
  "ptBR": "Copiado",
  "zh": "已复制"
 },
 "revokeLink": {
  "uk": "Створити нове посилання",
  "ru": "Создать новую ссылку",
  "en": "Create a new link",
  "de": "Neuen Link erstellen",
  "es": "Crear un enlace nuevo",
  "fr": "Créer un nouveau lien",
  "pl": "Utwórz nowy link",
  "ptBR": "Criar novo link",
  "zh": "生成新链接"
 },
 "revokeLinkHint": {
  "uk": "Старе посилання перестане працювати.",
  "ru": "Старая ссылка перестанет работать.",
  "en": "The old link will stop working.",
  "de": "Der alte Link funktioniert nicht mehr.",
  "es": "El enlace anterior dejará de funcionar.",
  "fr": "L’ancien lien ne fonctionnera plus.",
  "pl": "Stary link przestanie działać.",
  "ptBR": "O link antigo deixará de funcionar.",
  "zh": "旧链接将失效。"
 },
 "deleteGroup": {
  "uk": "Видалити групу",
  "ru": "Удалить группу",
  "en": "Delete group",
  "de": "Gruppe löschen",
  "es": "Eliminar grupo",
  "fr": "Supprimer le groupe",
  "pl": "Usuń grupę",
  "ptBR": "Excluir grupo",
  "zh": "删除群组"
 },
 "deleteGroupConfirm": {
  "uk": "Видалити «{title}» для всіх учасників? Усі повідомлення буде втрачено.",
  "ru": "Удалить «{title}» для всех участников? Все сообщения будут потеряны.",
  "en": "Delete “{title}” for all members? All messages will be lost.",
  "de": "„{title}“ für alle Mitglieder löschen? Alle Nachrichten gehen verloren.",
  "es": "¿Eliminar «{title}» para todos los miembros? Se perderán todos los mensajes.",
  "fr": "Supprimer « {title} » pour tous les membres ? Tous les messages seront perdus.",
  "pl": "Usunąć „{title}” dla wszystkich uczestników? Wszystkie wiadomości zostaną utracone.",
  "ptBR": "Excluir «{title}» para todos os membros? Todas as mensagens serão perdidas.",
  "zh": "为所有成员删除“{title}”？所有消息将丢失。"
 },
 "joinGroup": {
  "uk": "Приєднатися до групи",
  "ru": "Присоединиться к группе",
  "en": "Join group",
  "de": "Gruppe beitreten",
  "es": "Unirse al grupo",
  "fr": "Rejoindre le groupe",
  "pl": "Dołącz do grupy",
  "ptBR": "Entrar no grupo",
  "zh": "加入群组"
 },
 "openGroup": {
  "uk": "Відкрити групу",
  "ru": "Открыть группу",
  "en": "Open group",
  "de": "Gruppe öffnen",
  "es": "Abrir grupo",
  "fr": "Ouvrir le groupe",
  "pl": "Otwórz grupę",
  "ptBR": "Abrir grupo",
  "zh": "打开群组"
 },
 "groupInviteTitle": {
  "uk": "Запрошення до групи",
  "ru": "Приглашение в группу",
  "en": "Group invitation",
  "de": "Gruppeneinladung",
  "es": "Invitación al grupo",
  "fr": "Invitation au groupe",
  "pl": "Zaproszenie do grupy",
  "ptBR": "Convite para o grupo",
  "zh": "群组邀请"
 },
 "groupInviteAlreadyMember": {
  "uk": "Ви вже в цій групі",
  "ru": "Вы уже в этой группе",
  "en": "You are already in this group",
  "de": "Du bist bereits in dieser Gruppe",
  "es": "Ya estás en este grupo",
  "fr": "Vous êtes déjà dans ce groupe",
  "pl": "Jesteś już w tej grupie",
  "ptBR": "Você já está neste grupo",
  "zh": "你已在此群组中"
 },
 "groupInviteInvalid": {
  "uk": "Посилання недійсне або застаріло.",
  "ru": "Ссылка недействительна или устарела.",
  "en": "This invite link is invalid or has expired.",
  "de": "Dieser Einladungslink ist ungültig oder abgelaufen.",
  "es": "Este enlace de invitación no es válido o ha caducado.",
  "fr": "Ce lien d’invitation est invalide ou a expiré.",
  "pl": "Ten link jest nieprawidłowy lub wygasł.",
  "ptBR": "Este link de convite é inválido ou expirou.",
  "zh": "此邀请链接无效或已过期。"
 },
 "groupInviteHint": {
  "uk": "Учасники групи побачать, що ви приєдналися.",
  "ru": "Участники группы увидят, что вы присоединились.",
  "en": "Anyone in the group can see that you joined.",
  "de": "Alle in der Gruppe sehen, dass du beigetreten bist.",
  "es": "Todos en el grupo verán que te uniste.",
  "fr": "Tout le monde dans le groupe verra que vous avez rejoint.",
  "pl": "Wszyscy w grupie zobaczą, że dołączyłeś(-aś).",
  "ptBR": "Todos no grupo verão que você entrou.",
  "zh": "群组成员会看到你已加入。"
 },
 "groupSignInToJoin": {
  "uk": "Увійдіть, щоб приєднатися",
  "ru": "Войдите, чтобы присоединиться",
  "en": "Sign in to join",
  "de": "Zum Beitreten anmelden",
  "es": "Inicia sesión para unirte",
  "fr": "Connectez-vous pour rejoindre",
  "pl": "Zaloguj się, aby dołączyć",
  "ptBR": "Entre para participar",
  "zh": "登录后加入"
 },
 "groupDeletedToast": {
  "uk": "Групу видалено",
  "ru": "Группа удалена",
  "en": "Group deleted",
  "de": "Gruppe gelöscht",
  "es": "Grupo eliminado",
  "fr": "Groupe supprimé",
  "pl": "Grupa usunięta",
  "ptBR": "Grupo excluído",
  "zh": "群组已删除"
 },
 "groupMore": {
  "uk": "Ще",
  "ru": "Ещё",
  "en": "More",
  "de": "Mehr",
  "es": "Más",
  "fr": "Plus",
  "pl": "Więcej",
  "ptBR": "Mais",
  "zh": "更多"
 },
 "groupAbout": {
  "uk": "Про групу",
  "ru": "О группе",
  "en": "About",
  "de": "Info",
  "es": "Acerca de",
  "fr": "À propos",
  "pl": "O grupie",
  "ptBR": "Sobre",
  "zh": "关于"
 }
};

export type GroupUiKey = string;

export function groupText(lang: GroupLang, key: GroupUiKey, vars?: Record<string, string | number>): string {
  const row = UI[key] ?? UI_W2[key];
  let s = (row && (row[lang] || row.en)) || "";
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
  return s;
}

/** «5 учасників» / «1 member» -- по правилам множественного числа языка. */
export function membersCountText(lang: GroupLang, n: number): string {
  const forms = MEMBERS[lang] || MEMBERS.en;
  const tag = lang === "ptBR" ? "pt-BR" : lang === "zh" ? "zh" : lang;
  let cat = "other";
  try {
    cat = new Intl.PluralRules(tag).select(n);
  } catch {
    /* other */
  }
  const tpl = forms[cat] || forms.other || "{n}";
  return tpl.split("{n}").join(String(n));
}

export type NotePart = { text: string; userId?: string };

type RawEntity = { object?: string; text?: string; userId?: unknown };

type NoteKind = "created" | "added" | "joined" | "left" | "removed" | "renamed" | "photoChanged" | "photoRemoved";

type ParsedNote = { kind: NoteKind; actor: { text: string; userId: string }; users: { text: string; userId: string }[]; title: string };

const RENAME_PREFIX = "changed the group name to «";

function mentionOf(e: RawEntity | undefined): { text: string; userId: string } | null {
  if (!e || e.object !== "entity-mention") return null;
  return { text: String(e.text ?? ""), userId: e.userId == null ? "" : String(e.userId) };
}

/** Разбор сущностей служебного сообщения группы (та же логика, что GroupNote.parse в приложении). */
export function parseGroupNote(entities: unknown): ParsedNote | null {
  if (!Array.isArray(entities) || entities.length < 2) return null;
  const actor = mentionOf(entities[0] as RawEntity);
  if (!actor) return null;
  const verbEnt = entities[1] as RawEntity;
  if (!verbEnt || verbEnt.object === "entity-mention") return null;
  const verb = String(verbEnt.text ?? "").trim();
  const users = (entities as RawEntity[])
    .slice(2)
    .map(mentionOf)
    .filter((x): x is { text: string; userId: string } => x !== null);
  switch (verb) {
    case "created the group":
      return { kind: "created", actor, users: [], title: "" };
    case "joined the group via invite link":
      return { kind: "joined", actor, users: [], title: "" };
    case "left the group":
      return { kind: "left", actor, users: [], title: "" };
    case "changed the group photo":
      return { kind: "photoChanged", actor, users: [], title: "" };
    case "removed the group photo":
      return { kind: "photoRemoved", actor, users: [], title: "" };
    case "added":
      return users.length ? { kind: "added", actor, users, title: "" } : null;
    case "removed":
      return users.length ? { kind: "removed", actor, users, title: "" } : null;
  }
  if (verb.startsWith(RENAME_PREFIX) && verb.endsWith("»")) {
    return { kind: "renamed", actor, users: [], title: verb.slice(RENAME_PREFIX.length, -1) };
  }
  return null;
}

const KEYS: Record<NoteKind, [string, string]> = {
  created: ["groupNoteCreated", "groupCreatedByYou"],
  added: ["groupNoteAdded", "groupNoteAddedByYou"],
  joined: ["groupNoteJoined", "groupNoteJoinedByYou"],
  left: ["groupNoteLeft", "groupNoteLeftByYou"],
  removed: ["groupNoteRemoved", "groupNoteRemovedByYou"],
  renamed: ["groupNoteRenamed", "groupNoteRenamedByYou"],
  photoChanged: ["groupNotePhotoChanged", "groupNotePhotoChangedByYou"],
  photoRemoved: ["groupNotePhotoRemoved", "groupNotePhotoRemovedByYou"],
};

/**
 * Служебное сообщение группы на языке пользователя в виде кусков
 * (текст + userId для имён). Если распознать не удалось -- null, и
 * вызывающий рисует сырой текст как есть.
 */
export function localizeGroupNote(entities: unknown, lang: GroupLang, myUserId: string | null): NotePart[] | null {
  const note = parseGroupNote(entities);
  if (!note) return null;
  const table = NOTES[lang] || NOTES.en;
  const me = !!myUserId && note.actor.userId === myUserId;
  const tpl = (table[KEYS[note.kind][me ? 1 : 0]] ?? NOTES.en[KEYS[note.kind][me ? 1 : 0]]) || "";
  const and = table.groupNoteAnd ?? " and ";
  const you = table.groupNoteYouObject ?? "you";
  const usersParts: NotePart[] = [];
  note.users.forEach((u, i) => {
    if (i > 0) usersParts.push({ text: i === note.users.length - 1 ? and : ", " });
    // Если убрали/добавили самого читателя -- «вас», как в приложении.
    usersParts.push(myUserId && u.userId === myUserId ? { text: you, userId: u.userId } : { text: u.text, userId: u.userId });
  });
  const out: NotePart[] = [];
  const rx = /\{(actor|users|title)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(tpl))) {
    if (m.index > last) out.push({ text: tpl.slice(last, m.index) });
    if (m[1] === "actor") out.push({ text: note.actor.text, userId: note.actor.userId });
    else if (m[1] === "users") out.push(...usersParts);
    else out.push({ text: note.title });
    last = m.index + m[0].length;
  }
  if (last < tpl.length) out.push({ text: tpl.slice(last) });
  return out;
}

export function groupNotePlainText(entities: unknown, lang: GroupLang, myUserId: string | null): string | null {
  const parts = localizeGroupNote(entities, lang, myUserId);
  return parts ? parts.map((p) => p.text).join("") : null;
}

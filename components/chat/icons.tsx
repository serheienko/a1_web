// components/chat/icons.tsx
//
// Chat UI redesign (Aleksandr, 2026-09-02: "хочу использовать
// определённый UI для чатов, такой же, как у нас в приложении").
// These are the app's own exported vectors, pulled live via the Figma
// MCP from https://figma.com/design/Oj0YzUaOvfRdxtqGXUp4TE/A1-Claude
// (node 24360:7305's chat frames) -- NOT hand-drawn approximations.
// Path data is verbatim from that export; only fill values were changed
// from a hardcoded hex to currentColor/theme classes so each icon can
// follow this page's own light/dark palette instead of being locked to
// the dark-mode-only mockup frames they were exported from.
//
// Colors used throughout this file are the confirmed Figma variables
// (get_variable_defs on the same node):
//   Brand Colors/Primary Light #335ef7   / Primary Dark  #0c8ce9
//   Texts/Light               #989aa6   / Texts/Light Dark #adafbb
//   Backgrounds/Inputs,BGs,Popups Dark #1c1c1e, outline #2b2b2b
// A light-mode equivalent for the dark input/button chrome (bg #1c1c1e,
// border #2b2b2b) has no Figma counterpart -- inferred as white/
// neutral-200, same as the rest of this app's existing input styling.

import type { ReactNode } from "react";

export function ChatBackArrow({ className = "h-3 w-[7px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 21" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.40462 10.5028L4.76142 11.8429C7.00535 14.0557 9.24899 16.2694 11.4923 18.4841C12.1932 19.1769 12.1134 20.2527 11.3292 20.7728C10.7795 21.137 10.0934 21.0606 9.58857 20.5632C8.74663 19.7403 7.91203 18.9107 7.07376 18.084L0.553592 11.656C-0.17932 10.9275 -0.187566 10.0818 0.547178 9.35892C3.56617 6.38671 6.58546 3.41544 9.60506 0.445116C10.2042 -0.144734 11.0608 -0.148507 11.6123 0.434736C12.1638 1.01798 12.1226 1.89945 11.5161 2.49874C9.26914 4.72098 7.02001 6.94038 4.76875 9.15696L3.40462 10.5028Z"
        fill="currentColor"
      />
    </svg>
  );
}

// The double-checkmark ("read") -- two overlapping check strokes, exact
// path data from the app's own "Read" component. Single-check
// ("delivered", not yet read) reuses only the second, larger stroke.
export function MessageTicks({
  state,
  className,
}: {
  state: "read" | "delivered";
  className?: string;
}) {
  const singleCheck =
    "M9.63477 0.153527C9.82352 -0.0420838 10.1403 -0.0520851 10.3418 0.131066C10.5209 0.294136 10.5486 0.55579 10.4199 0.74923L10.3652 0.818566L3.80371 7.61837C3.62916 7.79927 3.34709 7.82011 3.14746 7.68087L3.07617 7.6213L0.137696 4.62228C-0.0526453 4.42803 -0.0445907 4.12072 0.155274 3.93575C0.33301 3.77139 0.602469 3.7591 0.793946 3.89474L0.862306 3.95236L3.43555 6.57833L9.63477 0.153527Z";
  const secondCheck =
    "M13.1338 0.15548C13.3216 -0.0409828 13.6375 -0.0522708 13.8398 0.130089C14.0197 0.292341 14.0496 0.553253 13.9219 0.747277L13.8662 0.816613L7.36621 7.61642C7.17836 7.81285 6.86249 7.82414 6.66016 7.64181C6.4803 7.47957 6.45046 7.21864 6.57813 7.02462L6.63379 6.95528L13.1338 0.15548Z";
  return (
    <svg viewBox="0 0 14 7.7717" className={className ?? "h-[7.77px] w-3.5"} fill="none" aria-hidden="true">
      <path d={singleCheck} fill="currentColor" />
      {state === "read" && <path d={secondCheck} fill="currentColor" />}
    </svg>
  );
}

// "Our cat" glyph shown inside the message input pill (Aleksandr:
// "с котом нашим иконкой в input field"). The two eye-pupil shapes are
// cut out against whatever the pill's own background is, so they take
// a separate fill matching that background rather than currentColor.
export function ChatCatFieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20.4999 20.5057" fill="none" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5408 3.84723C12.5711 3.60322 12.25 3.35922 11.8198 3.33482C11.3896 3.31652 11.0139 3.52392 10.9776 3.76793C10.9473 4.01193 11.2684 4.22543 11.6986 4.24983C12.1288 4.27423 12.5045 4.09123 12.5408 3.84723Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.51051 3.84716C9.5408 3.60315 9.21966 3.35915 8.78946 3.33475C8.35925 3.31645 7.98358 3.52385 7.94722 3.76786C7.91693 4.01186 8.23807 4.22536 8.66827 4.24976C9.09848 4.27416 9.47415 4.09116 9.51051 3.84716Z"
        fill="currentColor"
      />
      <path
        d="M12.0692 11.2762C12.0389 11.2335 12.0207 11.1847 12.0025 11.1359C12.0207 11.1481 12.0449 11.1542 12.0631 11.1542C12.5175 11.2579 12.972 10.9651 13.075 10.5076C13.178 10.0501 12.8872 9.59261 12.4327 9.4889C12.1964 9.434 11.9601 9.4889 11.7783 9.61701C11.8874 8.8179 12.3661 8.07368 13.1295 7.65888C14.4141 6.94517 16.0258 7.42097 16.7227 8.72029C17.4255 10.0196 16.959 11.6361 15.6683 12.3376C14.3777 13.0453 12.766 12.5694 12.0692 11.2762Z"
        fill="currentColor"
      />
      <path
        d="M3.73713 11.2762C3.70684 11.2335 3.68866 11.1847 3.67048 11.1359C3.68866 11.1481 3.7129 11.1542 3.73107 11.1542C4.18552 11.2579 4.63996 10.9651 4.74296 10.5076C4.84597 10.0501 4.55513 9.59261 4.10069 9.4889C3.86438 9.434 3.62807 9.4889 3.44629 9.61701C3.55536 8.8179 4.03403 8.07368 4.7975 7.65888C6.08205 6.94517 7.69381 7.42097 8.39062 8.72029C9.09349 10.0196 8.62693 11.6361 7.33631 12.3376C6.0457 13.0453 4.43394 12.5694 3.73713 11.2762Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.74134 12.6373C9.68075 12.7593 10.0322 13.5157 10.2261 13.5096C10.4079 13.5035 10.8199 12.7715 10.7411 12.6373C10.6684 12.5031 9.82617 12.4665 9.74134 12.6373Z"
        fill="currentColor"
      />
      <path
        d="M10.2254 19.7202C-2.31113 20.4827 1.00933 8.73392 1.54254 7.4529"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.0771 7.76923C20.1678 11.0328 21.3554 19.7193 10.2246 19.7193"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.1494 5.07381C11.6521 5.07381 13.2093 5.18971 14.5727 5.38492"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.89746 5.40322C7.2002 5.18971 8.67259 5.07381 10.145 5.07381"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.56055 7.40349C1.79686 4.35955 2.8451 2.43192 5.25668 0.790996C5.38998 0.699495 5.57176 0.797096 5.58387 0.955699L5.95955 5.53686"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.0404 7.67799C18.8041 4.63405 17.6347 2.43192 15.2231 0.790996C15.0898 0.699495 14.908 0.797096 14.9019 0.955699L14.6475 5.47586"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.92855 13.815C8.75283 14.5836 9.75866 14.8581 10.2798 14.2237C10.8372 14.9313 11.8309 14.6202 11.5098 13.7662"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.3877 12.6496C15.8434 12.6496 17.0235 11.4616 17.0235 9.99608C17.0235 8.53058 15.8434 7.34255 14.3877 7.34255C12.932 7.34255 11.752 8.53058 11.752 9.99608C11.752 11.4616 12.932 12.6496 14.3877 12.6496Z"
        fill="currentColor"
      />
      <path
        d="M6.05764 12.6496C7.51333 12.6496 8.6934 11.4616 8.6934 9.99608C8.6934 8.53058 7.51333 7.34255 6.05764 7.34255C4.60195 7.34255 3.42188 8.53058 3.42188 9.99608C3.42188 11.4616 4.60195 12.6496 6.05764 12.6496Z"
        fill="currentColor"
      />
      {/* Pupils -- cut out against the input pill's own background.
          chat-cat-pupil: 2026-09-02 (Aleksandr: "анимацию на кота, чтобы
          он глазками двигал") -- app/globals.css's own
          `.group:hover .chat-cat-pupil` darts these side to side; the
          icon needs a `group` wrapper at its call site for that to
          fire (see app/chats/[chatId]/page.tsx's own compose bar). */}
      <path
        d="M12.9032 11.7348C13.539 11.7348 14.0545 11.2159 14.0545 10.5758C14.0545 9.93565 13.539 9.41674 12.9032 9.41674C12.2674 9.41674 11.752 9.93565 11.752 10.5758C11.752 11.2159 12.2674 11.7348 12.9032 11.7348Z"
        className="fill-white dark:fill-[#1c1c1e] chat-cat-pupil"
      />
      <path
        d="M4.54188 11.765C5.1777 11.765 5.69313 11.2461 5.69313 10.606C5.69313 9.96588 5.1777 9.44697 4.54188 9.44697C3.90606 9.44697 3.39062 9.96588 3.39062 10.606C3.39062 11.2461 3.90606 11.765 4.54188 11.765Z"
        className="fill-white dark:fill-[#1c1c1e] chat-cat-pupil"
      />
    </svg>
  );
}

export function ChatPaperclipGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21.6 22.6" fill="none" className={className ?? "h-[13px] w-[13px]"} aria-hidden="true">
      <path
        d="M14.3859 0.289258C15.3543 0.0729643 16.3674 0.109276 17.3156 0.39375C18.264 0.678261 19.1123 1.2005 19.7678 1.90547C20.4226 2.60979 20.8592 3.46964 21.0305 4.3918H21.0314C21.2017 5.21253 21.1463 6.06057 20.8713 6.85566C20.5967 7.6493 20.1112 8.36261 19.4631 8.93184L19.4641 8.93281C17.0135 11.2366 14.5575 13.5376 12.0959 15.8352C11.5791 16.3157 11.0662 16.8117 10.5383 17.2844L10.5393 17.2854C10.1481 17.6631 9.6513 17.9284 9.10762 18.052C8.56389 18.1754 7.99353 18.1528 7.46309 17.9855V17.9846C6.93025 17.8444 6.44927 17.5661 6.07734 17.1789C5.70347 16.7897 5.45477 16.3072 5.3625 15.7883V15.7873C5.25438 15.3463 5.26589 14.8869 5.39668 14.4514C5.52837 14.0128 5.77586 13.6134 6.11543 13.2902C7.03506 12.3893 7.99277 11.5187 8.93184 10.6398L13.8859 6.00312C13.9551 5.93131 14.0313 5.86583 14.1135 5.80781L14.1154 5.80586C14.2642 5.70562 14.4461 5.66026 14.6262 5.67695C14.8059 5.6937 14.975 5.77148 15.1008 5.89766C15.2231 6.0189 15.2985 6.1779 15.3117 6.34785C15.3248 6.51804 15.2754 6.68699 15.1721 6.82441L15.1662 6.83125C15.0967 6.91288 15.0211 6.98974 14.9406 7.06172L7.34688 14.1838L7.34297 14.1877C7.04676 14.4484 6.875 14.8063 6.8625 15.1818C6.85002 15.5574 6.99758 15.9243 7.27559 16.2014C7.55402 16.4787 7.94108 16.6434 8.35176 16.6555C8.76256 16.6674 9.16041 16.5258 9.45723 16.2648L9.45918 16.2629C9.81892 15.9568 10.1579 15.6144 10.5168 15.2785L18.3674 7.90156L18.3693 7.89961C19.0823 7.25007 19.5092 6.37737 19.5715 5.45234L19.5764 5.17305C19.5603 4.52268 19.3595 3.88535 18.9904 3.32832C18.5687 2.69179 17.9473 2.19 17.2092 1.8918C16.471 1.59363 15.652 1.5141 14.8635 1.66426C14.075 1.81449 13.3553 2.18671 12.802 2.72969L12.8 2.73262L12.6975 2.62324L12.799 2.73262L3.47578 11.4582L3.4748 11.4592C2.75829 12.1147 2.23137 12.9282 1.9416 13.8234C1.65186 14.7186 1.60881 15.6674 1.81563 16.5822C2.02247 17.4971 2.47253 18.3497 3.12617 19.0598C3.77976 19.7697 4.61557 20.3144 5.55586 20.6428C6.24979 20.881 6.98535 20.9982 7.7248 20.9875C8.50908 20.9802 9.2845 20.826 10.0041 20.5354C10.7234 20.2448 11.3731 19.8235 11.9152 19.2961L11.9172 19.2941L19.9758 11.7521C20.0375 11.6944 20.1136 11.6164 20.1936 11.5549C20.3414 11.4391 20.5294 11.3805 20.7189 11.3889C20.9082 11.3973 21.0889 11.4723 21.2248 11.6008L21.3146 11.7023C21.3945 11.8115 21.4424 11.9413 21.4494 12.0773C21.4587 12.2585 21.3953 12.435 21.2746 12.5725C21.2253 12.6287 21.171 12.6809 21.1145 12.7307L21.1154 12.7316C18.3991 15.2717 15.6886 17.8099 12.9855 20.3479C12.232 21.0761 11.3178 21.6407 10.3068 22.0002C9.29589 22.3597 8.2129 22.5068 7.13496 22.4309V22.4299C5.49977 22.3271 3.94491 21.7228 2.71211 20.7082C1.47968 19.6938 0.637102 18.3261 0.317578 16.8156C0.0537943 15.6863 0.102352 14.5125 0.457227 13.4055C0.811871 12.2992 1.46038 11.2963 2.34199 10.4914C5.47994 7.51757 8.63974 4.56106 11.8195 1.62227C12.5298 0.966322 13.4177 0.505584 14.3859 0.289258Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChatMicGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 38" fill="none" className={className ?? "h-5 w-5"} aria-hidden="true">
      <path
        d="M27.2093 17.8774C27.646 17.8774 28.0036 18.2321 27.9652 18.6671C27.7801 20.7592 26.8642 22.7301 25.364 24.2269C23.6761 25.9109 21.3869 26.857 19 26.857C16.6131 26.857 14.3239 25.9109 12.636 24.2269C11.1358 22.7301 10.2199 20.7592 10.0348 18.6671C9.99637 18.2321 10.354 17.8774 10.7907 17.8774V17.8774C11.2273 17.8774 11.5769 18.2324 11.6236 18.6666C11.8033 20.3396 12.5506 21.9105 13.7542 23.1113C15.1455 24.4995 17.0324 25.2793 19 25.2793C20.9676 25.2793 22.8545 24.4995 24.2458 23.1113C25.4494 21.9105 26.1967 20.3395 26.3764 18.6666C26.4231 18.2324 26.7727 17.8774 27.2093 17.8774V17.8774Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="14.6384" y="8.85" width="8.72105" height="13.5653" rx="4.36053" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M18.1996 29.9994C18.1996 30.4413 18.5578 30.7994 18.9996 30.7994C19.4415 30.7994 19.7996 30.4413 19.7996 29.9994L18.9996 29.9994L18.1996 29.9994ZM18.9996 25.9586L18.1996 25.9586L18.1996 29.9994L18.9996 29.9994L19.7996 29.9994L19.7996 25.9586L18.9996 25.9586Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Shared round-button chrome for the paperclip/mic buttons flanking the
// message input -- matches the input pill's own light/dark surface
// (see this file's header re: the light-mode chrome having no Figma
// counterpart, inferred from this app's existing input styling).
function ChatRoundIconButton({
  children,
  onClick,
  disabled,
  label,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-400 backdrop-blur-sm transition hover:border-neutral-300 hover:text-neutral-600 disabled:opacity-40 dark:border-[#2b2b2b] dark:bg-[#1c1c1e]/80 dark:text-[#adafbb] dark:hover:border-[#3a3a3a] dark:hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}

// 2026-09-02 (Aleksandr: "увеличь иконки скрепки и микрофона на 50%")
// -- both glyphs above are already verbatim Figma exports (node
// 24360:8468 for the paperclip, 24360:8469 for the mic -- confirmed
// live against the file this session, same path data, same viewBox),
// so there's no shape to re-pull, only size: 13px -> 19.5px (paperclip)
// and 20px -> 30px (mic), each exactly x1.5 of what they were. The 44px
// round button they sit in (ChatRoundIconButton, unchanged) still has
// comfortable padding around either at this size.
export function ChatPaperclipButton(props: { onClick?: () => void; disabled?: boolean }) {
  return (
    <ChatRoundIconButton label="Attach" {...props}>
      <ChatPaperclipGlyph className="h-[19.5px] w-[19.5px] animate-paperclip-wiggle" />
    </ChatRoundIconButton>
  );
}

export function ChatMicButton(props: { onClick?: () => void; disabled?: boolean }) {
  return (
    <ChatRoundIconButton label="Voice message" {...props}>
      {/* 2026-09-02 (Aleksandr: "добавь анимацию микрофону") -- same
          `.group:hover .animate-X` convention (app/globals.css) as the
          paperclip right next to it. */}
      <ChatMicGlyph className="h-[30px] w-[30px] animate-mic-pulse" />
    </ChatRoundIconButton>
  );
}

// "typing…" pulse -- three CSS-animated dots (the exported Figma asset
// was a static PNG/SVG snapshot of one animation frame; three bouncing
// dots is the standard rendering of that same glyph and needed to
// actually animate, so this one shape is hand-built rather than traced
// from the export -- see this file's header for the "everything else is
// a real export" rule this is the one exception to).
export function ChatTypingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[4.5px] w-[4.5px] animate-bounce rounded-full bg-current"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  );
}

// Attachment feature (2026-09-02, Aleksandr: "поискать теперь в коде
// всё что у нас живет на скрепке и приготовиться к имплементации") --
// no Figma export exists for these (the reference was a native app
// screenshot, not a design file node), so the three below are hand-built
// like ChatTypingDots above, kept simple and line-based to sit
// comfortably next to the real Figma exports elsewhere in this file.

// Attach-menu row icon: a picture frame with a small "peak" (mountain +
// sun), the universal "photo" glyph.
export function ChatPhotoAttachIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" />
      <path
        d="M4.5 16.5 9 12l3.2 3.2L15.5 12 19.5 16.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Attach-menu row icon + message-bubble file-chip icon: a dog-eared
// document page.
export function ChatFileAttachIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.5 3.5h7l4 4v12.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.5 3.5V7a1 1 0 0 0 1 1H17.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// Small circular spinner overlaid on an uploading attachment preview --
// same two-arc construction as app/chats/[chatId]/page.tsx's own
// SendingSpinner (kept as a separate copy here rather than exported
// cross-file, same "self-contained, don't risk a shared regression"
// convention this session's other new components already follow).
export function ChatAttachmentSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Attach-popover corner icon: opens the "Daily Uploads" quota screen
// (components/daily-uploads-modal.tsx). Same stack/disk glyph as the
// reference native-app attach sheet's own top-right icon
// (2026-09-02, Aleksandr: "как ты UI отрисуешь? ... попапы +- совпадали
// с мобом"), hand-built like the other attach icons above -- no Figma
// export for it either.
export function ChatStorageIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 6.5v5c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4.5 11.5v5c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Contact-attachment feature (2026-09-02, Aleksandr: native-app
// Contacts-picker + "sent contact" card screenshots, "Функциональный тап
// только по кнопке message, если у пользователя нет телефона, то мы
// просто его не показываем"). Three more hand-built line icons, same
// convention as ChatPhotoAttachIcon/ChatFileAttachIcon above -- no Figma
// export exists for any of these either.

// Attach-menu row icon: a simple contact card / id badge.
export function ChatContactAttachIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10.2" r="2.1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.8 15.8c.6-1.7 2-2.6 3.2-2.6s2.6.9 3.2 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.5 9.5h4M14.5 12.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Contact-card phone row icon.
export function ChatPhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.6 4.5h2.3l1.2 3.6-1.7 1.4a11.5 11.5 0 0 0 5.8 5.8l1.4-1.7 3.6 1.2v2.3c0 1-.9 1.7-1.9 1.5-4.9-.9-9.9-5.9-10.8-10.8-.2-1 .5-1.9 1.5-1.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Contact-card expertise/"about" row icon -- the reference screenshot
// uses a rocket glyph for this row (profile.expertise, same freeform
// field app/u/[username]/page.tsx already shows next to occupation).
export function ChatExpertiseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3c2.8 1 4.8 3.8 4.8 7.5 0 2-.6 3.7-1.6 5.1l-3.2 3.4-3.2-3.4c-1-1.4-1.6-3.1-1.6-5.1C7.2 6.8 9.2 4 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 17.5 7.5 21M15 17.5 16.5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

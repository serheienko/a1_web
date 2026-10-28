"use client";

// 28.10.2026 (Александр: «как пользователь проскакивает заполнение роли? она
// же обязательная»). На сайте шаг «Я...» (роль) обязателен в самой форме
// app/onboarding/profile, но с него можно было просто уйти на любую другую
// страницу -- и жить без роли. Теперь вошедший человек без роли с любой
// страницы возвращается на этот шаг. Так же в приложении.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";

const FREE = ["/onboarding", "/sign-in", "/privacy", "/terms", "/claim", "/join", "/invite"];

let checked = false;

export function RequireRole() {
  const pathname = usePathname() ?? "/";
  useEffect(() => {
    if (checked) return;
    if (FREE.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    checked = true;
    authFetch("/api/account/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok || !d.userId) return;
        const occ = typeof d.occupation === "string" ? d.occupation.trim().toLowerCase() : "";
        if (occ && occ !== "none") return;
        // Не чаще раза за визит -- на случай, если сервер почему-то не отдал
        // роль, человек не застрянет в кругу переадресаций.
        try {
          if (sessionStorage.getItem("a1-role-redirect")) return;
          sessionStorage.setItem("a1-role-redirect", "1");
        } catch {
          return;
        }
        window.location.href = "/onboarding/profile";
      })
      .catch(() => {});
  }, [pathname]);
  return null;
}

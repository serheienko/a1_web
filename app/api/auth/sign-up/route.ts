// app/api/auth/sign-up/route.ts
//
// Phase 5a (PLAN.md §6.6): email+password sign-up, the smallest possible
// slice of Stage 2. Calls the one public endpoint documented for this in
// §6.1 — `users.createUser` — which per that table already logs the new
// account in (`{ user, accessToken, refreshToken }`), so there is no
// separate auth.email call to make afterwards.
//
// Deliberately collects only the three fields users.createUser actually
// requires (§6.1: "email, firstName, lastName, password ... only these
// three plus password are required") — the rest of its accepted field
// surface belongs to Phase 6's profile editor, not sign-up.

// 2026-09-13 (Александр: "как сделать, чтобы эти никнеймы на все новые
// профили предлагались более красивые ... на те, которые пользователи
// создают вручную") -- without a `username` in this payload the backend
// names the account `a1_<userId>` (createUser.ts's own
// `if (!data.username)`), which is what every profile created through
// this app has been getting. One derived from the person's own name is
// sent instead; see lib/username-slug.ts. Sign-ups made in the MOBILE
// app don't pass through this route at all and still need the backend's
// own default changed.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { setSession } from "@/lib/a1/session";
import { pickAvailableUsername } from "@/lib/username-slug";

export const runtime = "nodejs";

const SignUpInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

// PLAN.md §6.1's documented response shape for users.createUser has no
// expiresAt field (unlike auth.email) — typed as optional, not assumed.
type CreateUserResponse = {
  user?: { _id?: string; email?: string };
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
};

export async function POST(request: NextRequest) {
  const parsed = SignUpInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const input = parsed.data;

  // account.checkUsername is public (its own `security: []`) and returns
  // true when the name is free. Any failure in here resolves to null and
  // the sign-up proceeds exactly as it did before -- a nicer handle is
  // never worth a failed registration.
  const username = await pickAvailableUsername(
    `${input.firstName} ${input.lastName}`,
    (candidate) => call<boolean>("account.checkUsername", { username: candidate }, { skipAuth: true }),
  );

  try {
    const data = await call<CreateUserResponse>(
      "users.createUser",
      {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(username ? { username } : {}),
      },
      { skipAuth: true },
    );

    const response = NextResponse.json({ ok: true, email: input.email });
    setSession(response, {
      userId: data.user?._id ?? "",
      email: data.user?.email ?? input.email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt ? data.expiresAt * 1000 : null,
    });
    return response;
  } catch (err) {
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/auth/sign-up] users.createUser failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/auth/sign-up] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "sign_up_failed", detail }, { status: 400 });
  }
}

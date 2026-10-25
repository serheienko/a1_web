// lib/desktop/release-auth.ts -- подпись запросов Codemagic: HMAC-SHA256(DESKTOP_RELEASE_SECRET, тело).
import { createHmac, timingSafeEqual } from "node:crypto";

export function releaseSecret(): string {
  return (process.env.DESKTOP_RELEASE_SECRET ?? "").trim();
}

export function signatureOk(body: Buffer, header: string | null): boolean {
  const secret = releaseSecret();
  if (!secret) return false;
  const given = Buffer.from((header ?? "").trim(), "utf8");
  const want = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"), "utf8");
  return given.length === want.length && timingSafeEqual(given, want);
}

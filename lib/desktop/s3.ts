// lib/desktop/s3.ts
//
// 25.10.2026: сборки A1 для Mac лежат в бакете Railway «a1-desktop» (S3-совместимый). Сайт выдаёт
// ссылки с подписью (presigned): Codemagic кладёт архив напрямую в бакет, приложение скачивает
// обновление напрямую из бакета -- 90 МБ через сайт не проходят. Подпись AWS SigV4 без SDK.
import { createHash, createHmac } from "node:crypto";

type Cfg = { endpoint: URL; bucket: string; region: string; key: string; secret: string };

function cfg(): Cfg | null {
  const endpoint = (process.env.DESKTOP_S3_ENDPOINT ?? "").trim();
  const bucket = (process.env.DESKTOP_S3_BUCKET ?? "").trim();
  const key = (process.env.DESKTOP_S3_KEY ?? "").trim();
  const secret = (process.env.DESKTOP_S3_SECRET ?? "").trim();
  if (!endpoint || !bucket || !key || !secret) return null;
  return {
    endpoint: new URL(endpoint),
    bucket,
    region: (process.env.DESKTOP_S3_REGION ?? "").trim() || "auto",
    key,
    secret,
  };
}

export function desktopStoreConfigured(): boolean {
  return cfg() !== null;
}

const hmac = (k: Buffer | string, s: string) => createHmac("sha256", k).update(s, "utf8").digest();
const sha256hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const enc = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** Ссылка с подписью на объект [objectKey] (GET или PUT), живёт [expires] секунд. */
export function presign(method: "GET" | "PUT", objectKey: string, expires = 3600): string | null {
  const c = cfg();
  if (!c) return null;
  const host = `${c.bucket}.${c.endpoint.host}`; // virtual-host style
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${c.region}/s3/aws4_request`;
  const path = "/" + objectKey.split("/").map(enc).join("/");
  const q: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${c.key}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };
  const query = Object.keys(q)
    .sort()
    .map((k) => `${enc(k)}=${enc(q[k] ?? "")}`)
    .join("&");
  const canonical = [method, path, query, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonical)].join("\n");
  const kDate = hmac("AWS4" + c.secret, day);
  const kSigning = hmac(hmac(hmac(kDate, c.region), "s3"), "aws4_request");
  const sig = createHmac("sha256", kSigning).update(toSign, "utf8").digest("hex");
  return `${c.endpoint.protocol}//${host}${path}?${query}&X-Amz-Signature=${sig}`;
}

export type DesktopRelease = {
  build: number;
  version: string;
  sha256: string;
  size: number;
  key: string;
  notes?: string;
  publishedAt: string;
};

export const MANIFEST_KEY = "mac/latest.json";

export async function readManifest(): Promise<DesktopRelease | null> {
  const url = presign("GET", MANIFEST_KEY, 300);
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  try {
    return (await res.json()) as DesktopRelease;
  } catch {
    return null;
  }
}

export async function writeManifest(m: DesktopRelease): Promise<boolean> {
  const url = presign("PUT", MANIFEST_KEY, 300);
  if (!url) return false;
  const res = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(m),
    headers: { "content-type": "application/json" },
  });
  return res.ok;
}

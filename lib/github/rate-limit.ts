// lib/github/rate-limit.ts
//
// Заслон от перебора для /api/github/{verify/*,callback}. Память одного инстанса: это
// защита от ручного перебора, а не от распределённой атаки. Настоящие заслоны -- у бэкенда
// (10 стартов в час на пользователя, одноразовое состояние на 10 минут).
const hits = new Map<string, { count: number; since: number }>();

export function tooManyRequests(bucket: string, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const id = `${bucket}:${key}`;
  const seen = hits.get(id);
  if (!seen || now - seen.since > windowMs) {
    if (hits.size > 5000) hits.clear();
    hits.set(id, { count: 1, since: now });
    return false;
  }
  seen.count += 1;
  return seen.count > max;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// app/api/events/ics/[slug]/route.ts -- «Додати в календар»: файл .ics для одного события.
import { loadEvents } from "@/lib/events/store";
import { SITE_URL } from "@/lib/events/util";

export const runtime = "nodejs";
export const revalidate = 600;

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function plusOne(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const e = (await loadEvents()).find((x) => x.slug === slug);
  if (!e) return new Response("not found", { status: 404 });
  const where = e.online && !e.city ? "Online" : [e.city, e.country].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//A1 Jobs//Events//UK",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.slug}@jobs.a1appp.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
    `DTSTART;VALUE=DATE:${e.start.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${plusOne(e.end)}`,
    `SUMMARY:${esc(e.name)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc(`${e.summary.uk}\n${e.url}`)}`,
    `URL:${SITE_URL}/events/${e.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${e.slug}.ics"` },
  });
}

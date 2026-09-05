import type { CalendarEvent } from "./types";

function icsDateTime(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split("-");
  const [hh, mm] = (time || "00:00").split(":");
  return `${y}${m}${d}T${(hh || "00").padStart(2, "0")}${(mm || "00").padStart(2, "0")}00`;
}

function icsEscape(s: string): string {
  return (s || "").replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

// RFC 5545 requires DTSTAMP on every VEVENT (when this .ics was generated,
// not the event's own time) — we'd been omitting it. Using "now" also means
// the payload for the same event is never byte-identical twice, which
// matters for how it gets opened (see downloadEventIcs below).
function icsTimestampUtc(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildIcs(event: CalendarEvent): string {
  const start = icsDateTime(event.dateKey, event.start);
  const end = icsDateTime(event.endDateKey || event.dateKey, event.end || event.start);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//中正國小直笛團//教師工作台//ZH",
    "BEGIN:VEVENT",
    `UID:${event.id}@recorder-teaching`,
    `DTSTAMP:${icsTimestampUtc()}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(event.title)}`,
    event.location ? `LOCATION:${icsEscape(event.location)}` : "",
    event.note ? `DESCRIPTION:${icsEscape(event.note)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.filter(Boolean).join("\r\n");
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "Macintosh" but still has touch support, unlike
  // an actual Mac — that's the standard way to tell them apart.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return isIOS;
}

function icsRouteUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    id: event.id,
    title: event.title || "",
    dateKey: event.dateKey,
    endDateKey: event.endDateKey || event.dateKey,
    start: event.start || "00:00",
    end: event.end || event.start || "00:00",
  });
  if (event.location) params.set("location", event.location);
  if (event.note) params.set("note", event.note);
  return `/api/ics?${params.toString()}`;
}

/**
 * Downloads a single event as a .ics file — tapping it on a phone opens the
 * native "add to calendar" flow, no backend or calendar-account integration
 * needed.
 */
export function downloadEventIcs(event: CalendarEvent) {
  if (isIOSSafari()) {
    // Both client-only tricks tried before this turned out to be dead ends
    // on iOS Safari: a data: URI gets its top-level navigation silently
    // blocked (anti-phishing), and a blob: URL navigation hits the same
    // "Safari 無法下載此檔案" error as <a download> did originally — blob
    // URLs are scoped to the page that created them and don't survive a
    // real navigation. The only technique that reliably triggers iOS's
    // native add-to-calendar sheet is navigating to an actual HTTP resource
    // with a real text/calendar Content-Type, so /api/ics serves that.
    window.location.href = icsRouteUrl(event);
    return;
  }

  const ics = buildIcs(event);
  const filename = `${event.title || "event"}.ics`;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking immediately can race the browser actually starting the
  // download on some platforms — give it a moment first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

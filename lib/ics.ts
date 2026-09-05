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
    // Technically optional per RFC 5545, but commonly required in practice
    // for iOS to accept a client-generated .ics as a real importable event
    // rather than rejecting it outright.
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
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
  // The path itself has to end in .ics — iOS Safari's file-type
  // recognition for triggering the calendar-add flow looks at the URL's
  // extension, not just the Content-Type header, and a query-string-only
  // endpoint (no .ics in the path) was consistently hitting "Safari 無法
  // 下載此檔案" even with every response header already verified correct.
  return `/api/ics/event.ics?${params.toString()}`;
}

/**
 * Downloads a single event as a .ics file — tapping it on a phone opens the
 * native "add to calendar" flow, no backend or calendar-account integration
 * needed.
 */
export function downloadEventIcs(event: CalendarEvent) {
  if (isIOSSafari()) {
    // Headers, body content, and URL path have all been independently
    // verified correct against the deployed endpoint, and https: still
    // fails identically every time — so the one thing never actually
    // tried is *how* the navigation fires. Every attempt so far has been
    // a script-driven `window.location.href = ...` reassignment; iOS
    // Safari's download permission checks are known to sometimes treat
    // that differently from a genuine <a> tag click, even one dispatched
    // synchronously from the same click handler.
    const a = document.createElement("a");
    a.href = icsRouteUrl(event);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

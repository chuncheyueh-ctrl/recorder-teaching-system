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

function buildIcs(event: CalendarEvent): string {
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

/**
 * Downloads a single event as a .ics file — tapping it on a phone opens the
 * native "add to calendar" flow, no backend or calendar-account integration
 * needed.
 */
export function downloadEventIcs(event: CalendarEvent) {
  const ics = buildIcs(event);
  const filename = `${event.title || "event"}.ics`;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  if (isIOSSafari()) {
    // iOS Safari has no generic "download this blob" support — an
    // <a download> pointing at a blob: URL fails with "Safari 無法下載此
    // 檔案". It only recognizes text/calendar and opens the native
    // add-to-calendar sheet on an actual top-level navigation, which rules
    // out target=_blank (just shows the raw text). A data: URI seemed like
    // the standard trick here, but Safari now silently blocks top-level
    // navigation to data: URLs outright (anti-phishing) — nothing happens
    // at all, no error. blob: URLs aren't subject to that block and still
    // get the same content-type recognition on direct navigation.
    window.location.href = url;
    // Deliberately not revoking this one — the navigation/sheet can still
    // be reading it after this function returns, and it's a few hundred
    // bytes; not worth risking pulling it out from under Safari.
    return;
  }

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

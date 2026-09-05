import type { CalendarEvent } from "./types";

function icsDateTime(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split("-");
  const [hh, mm] = (time || "00:00").split(":");
  return `${y}${m}${d}T${(hh || "00").padStart(2, "0")}${(mm || "00").padStart(2, "0")}00`;
}

function icsEscape(s: string): string {
  return (s || "").replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
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

  if (isIOSSafari()) {
    // iOS Safari has no generic "download this blob" support — an
    // <a download> pointing at a blob: URL fails with "Safari 無法下載此
    // 檔案". A data: URI opened in a new tab lets it recognize the
    // text/calendar type and open the native add-to-calendar sheet instead.
    // (Setting window.location.href directly works once, but Safari treats
    // re-assigning it to an identical string — the same event clicked again
    // — as a no-op, so the second tap silently does nothing.)
    const a = document.createElement("a");
    a.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

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

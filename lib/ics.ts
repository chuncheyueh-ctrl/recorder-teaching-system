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
  const end = icsDateTime(event.dateKey, event.end || event.start);
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

/**
 * Downloads a single event as a .ics file — tapping it on a phone opens the
 * native "add to calendar" flow (iOS Safari especially), no backend or
 * calendar-account integration needed.
 */
export function downloadEventIcs(event: CalendarEvent) {
  const ics = buildIcs(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

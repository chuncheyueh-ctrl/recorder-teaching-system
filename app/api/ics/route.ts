import type { NextRequest } from "next/server";
import { buildIcs } from "@/lib/ics";
import type { CalendarEvent } from "@/lib/types";

// A real HTTP resource with a genuine text/calendar Content-Type — the only
// technique that reliably triggers iOS Safari's native "add to calendar"
// sheet on a top-level navigation. Client-only data: and blob: URLs were
// both tried first and both failed on iOS for different reasons (see
// lib/ics.ts).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const dateKey = sp.get("dateKey") || "";
  const event: CalendarEvent = {
    id: sp.get("id") || "event",
    title: sp.get("title") || "",
    type: "",
    dateKey,
    endDateKey: sp.get("endDateKey") || dateKey,
    start: sp.get("start") || "00:00",
    end: sp.get("end") || "00:00",
    location: sp.get("location") || "",
    note: sp.get("note") || "",
  };
  const ics = buildIcs(event);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // "attachment" forces iOS Safari's generic file-download flow, which
      // is exactly the "Safari 無法下載此檔案" error this has been hitting
      // — iOS Safari's native add-to-calendar recognition only fires when
      // it renders the text/calendar body inline, not as a download.
      "Content-Disposition": 'inline; filename="event.ics"',
    },
  });
}

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
  // Serialize to bytes ourselves so we can send a real Content-Length —
  // returning a plain string here gets sent chunked (no Content-Length) by
  // both `next dev` and Vercel's Node runtime, and iOS Safari's download
  // manager throws "Safari 無法下載此檔案" when it can't learn the file
  // size upfront.
  const body = new TextEncoder().encode(ics);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="event.ics"',
      "Content-Length": String(body.byteLength),
    },
  });
}

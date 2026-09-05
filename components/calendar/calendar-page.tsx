"use client";

import { useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { addMonths, calendarWeeks, displayDate, timeRange, toDateKey } from "@/lib/date-utils";
import { colorValueOf } from "@/lib/event-colors";
import { downloadEventIcs } from "@/lib/ics";
import type { CalendarEvent } from "@/lib/types";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return `${y} 年 ${Number(m)} 月`;
}

export function CalendarPage() {
  const { state, openEventDialog, remove, openMoreSection } = useAppState();
  // Local to this page — state.events already holds everything regardless
  // of month, so browsing a different month here needs no extra fetch.
  const [month, setMonth] = useState(() => state.dateKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthEvents = state.events.filter((e) => e.dateKey.startsWith(month));
  const eventsByDate = new Map<string, CalendarEvent[]>();
  monthEvents.forEach((e) => {
    if (!eventsByDate.has(e.dateKey)) eventsByDate.set(e.dateKey, []);
    eventsByDate.get(e.dateKey)!.push(e);
  });
  const weeks = calendarWeeks(month);
  const today = toDateKey(new Date());

  function colorOf(type: string): string {
    return colorValueOf(state.config.eventTypeColor?.[type]);
  }

  async function handleDelete(id: string) {
    if (!confirm("刪除事件？")) return;
    await remove("events", "event.delete", id);
  }

  function EventRow({ e }: { e: CalendarEvent }) {
    return (
      <div className="item row" key={e.id} onClick={() => openEventDialog({ id: e.id })} style={{ cursor: "pointer" }}>
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 4, justifyContent: "flex-start" }}>
            <span className="eventDot" style={{ background: colorOf(e.type) }} />
            <b>{e.title}</b>
            <span className="pill">{e.type}</span>
          </div>
          <div className="sub">{e.dateKey}｜{timeRange(e.start, e.end)}</div>
          {e.location && (
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} /> {e.location}
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 6 }} onClick={(ev) => ev.stopPropagation()}>
          <button className="small" type="button" onClick={() => downloadEventIcs(e)} aria-label="加入手機行事曆">
            <CalendarPlus size={14} />
          </button>
          <button className="danger small" type="button" onClick={() => handleDelete(e.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle blue"><CalendarDays size={20} /></div>
        <div className="sectionText">
          <h2>行事曆</h2>
          <div className="sub">共 {monthEvents.length} 則事件</div>
        </div>
        <button className="linkPill blue" onClick={() => openEventDialog()}>
          <Plus size={14} /> 新增事件
        </button>
      </div>
      <button type="button" className="linkPill yellow" style={{ marginTop: 16 }} onClick={() => openMoreSection("performances")}>
        <Star size={14} /> 查看表演中心
      </button>

      <div className="monthNav" style={{ marginTop: 16 }}>
        <button type="button" onClick={() => { setMonth((m) => addMonths(m, -1)); setSelectedDate(null); }}>
          <ChevronLeft size={16} />
        </button>
        <b>{monthLabel(month)}</b>
        <button type="button" onClick={() => { setMonth((m) => addMonths(m, 1)); setSelectedDate(null); }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="eventCalGridWrap">
        <table className="eventCalGrid">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((w) => <th key={w}>{w}</th>)}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((d, di) => {
                  if (!d) return <td key={di} className="calBlank" />;
                  const dayEvents = eventsByDate.get(d) || [];
                  return (
                    <td key={di}>
                      <button
                        type="button"
                        className={`eventCalCell${d === today ? " today" : ""}${d === selectedDate ? " active" : ""}`}
                        onClick={() => setSelectedDate(d === selectedDate ? null : d)}
                      >
                        <span className="eventCalDate">{Number(d.slice(-2))}</span>
                        <span className="eventCalDots">
                          {dayEvents.slice(0, 4).map((e) => (
                            <span key={e.id} className="eventDot" style={{ background: colorOf(e.type) }} />
                          ))}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDate ? (
        <div style={{ marginTop: 16 }}>
          <div className="sub" style={{ fontWeight: 900 }}>{displayDate(selectedDate)}</div>
          <div className="list" style={{ marginTop: 8 }}>
            {selectedEvents.length === 0 && <div className="empty">這天沒有事件。</div>}
            {selectedEvents.map((e) => <EventRow key={e.id} e={e} />)}
          </div>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 16 }}>
          {monthEvents.length === 0 && <div className="empty">本月沒有事件。</div>}
          {[...monthEvents].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).map((e) => <EventRow key={e.id} e={e} />)}
        </div>
      )}
    </div>
  );
}

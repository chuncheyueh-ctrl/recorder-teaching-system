"use client";

import { CalendarDays, MapPin, Plus, Trash2 } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { timeRange } from "@/lib/date-utils";

export function CalendarPage() {
  const { state, openEventDialog, remove } = useAppState();

  async function handleDelete(id: string) {
    if (!confirm("刪除事件？")) return;
    await remove("events", "event.delete", id);
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle blue"><CalendarDays size={20} /></div>
        <div className="sectionText">
          <h2>行事曆</h2>
          <div className="sub">共 {state.events.length} 則事件</div>
        </div>
        <button className="linkPill blue" onClick={() => openEventDialog()}>
          <Plus size={14} /> 新增事件
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {state.events.length === 0 && <div className="empty">本月沒有事件。</div>}
        {state.events.map((e) => (
          <div className="item row" key={e.id} onClick={() => openEventDialog(e.id)} style={{ cursor: "pointer" }}>
            <div>
              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
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
            <button
              className="danger small"
              type="button"
              onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

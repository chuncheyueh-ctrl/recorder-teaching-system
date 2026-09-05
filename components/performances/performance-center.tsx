"use client";

import { CalendarClock, CalendarPlus, MapPin, Pencil, Plus, Shirt, Star, Trash2 } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { displayDate, timeRange, toDateKey } from "@/lib/date-utils";
import { downloadEventIcs } from "@/lib/ics";
import type { CalendarEvent } from "@/lib/types";

const PERFORMANCE_TYPE = "演出";

export function PerformanceCenter() {
  const { state, openEventDialog, remove } = useAppState();
  const performances = state.events
    .filter((e) => e.type === PERFORMANCE_TYPE)
    .sort((a, b) => (a.dateKey + a.start).localeCompare(b.dateKey + b.start));

  // Anchored to the real calendar date, not state.dateKey — that's whatever
  // day the 今日 page happens to be browsing, which shouldn't reclassify a
  // performance as past/upcoming just because someone paged around.
  const today = toDateKey(new Date());
  // endDateKey (not dateKey) decides "past" so a multi-day performance
  // that's already started still shows as upcoming/ongoing until it ends.
  const upcoming = performances.filter((p) => p.endDateKey >= today);
  const past = performances.filter((p) => p.endDateKey < today).reverse();

  async function handleDelete(id: string) {
    if (!confirm("刪除這場表演？")) return;
    await remove("events", "event.delete", id);
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle yellow"><Star size={20} /></div>
        <div className="sectionText">
          <h2>表演中心</h2>
          <div className="sub">共 {performances.length} 場</div>
        </div>
        <button className="linkPill yellow" onClick={() => openEventDialog({ defaultType: PERFORMANCE_TYPE })}>
          <Plus size={14} /> 新增表演
        </button>
      </div>

      <div className="list" style={{ marginTop: 16 }}>
        {performances.length === 0 && <div className="empty">尚無表演行程。</div>}
        {performances.length > 0 && upcoming.length === 0 && <div className="empty">目前沒有即將登場的表演。</div>}
        {upcoming.map((p) => (
          <PerformanceCard
            key={p.id}
            p={p}
            onEdit={() => openEventDialog({ id: p.id })}
            onDelete={() => handleDelete(p.id)}
          />
        ))}
      </div>

      {past.length > 0 && (
        <details className="classGroup" style={{ marginTop: 20 }}>
          <summary className="classGroupHead">
            <span className="classGroupArrow">›</span>
            <span className="classGroupLabel">已結束的表演</span>
            <span className="sub">{past.length} 場</span>
          </summary>
          <div className="list" style={{ marginTop: 8 }}>
            {past.map((p) => (
              <PerformanceCard
                key={p.id}
                p={p}
                onEdit={() => openEventDialog({ id: p.id })}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function PerformanceCard({ p, onEdit, onDelete }: { p: CalendarEvent; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="item" style={{ cursor: "pointer" }} onClick={onEdit}>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{p.title || "（未命名表演）"}</b>
          <div className="sub">
            {p.endDateKey !== p.dateKey ? `${displayDate(p.dateKey)} ~ ${p.endDateKey}` : displayDate(p.dateKey)}｜{timeRange(p.start, p.end)}
          </div>
          {p.location && (
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} /> {p.location}
            </div>
          )}
          {(p.callTime || p.callLocation) && (
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarClock size={12} /> 集合 {p.callTime || "時間未定"}{p.callLocation ? `｜${p.callLocation}` : ""}
            </div>
          )}
          {p.attire && (
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Shirt size={12} /> {p.attire}
            </div>
          )}
          {p.performingGroups && p.performingGroups.length > 0 && (
            <div className="groupPillRow" style={{ marginTop: 8 }}>
              {p.performingGroups.map((g) => (
                <span className="groupPill" key={g}>{g}</span>
              ))}
            </div>
          )}
          {p.repertoire && p.repertoire.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {p.repertoire.map((song, i) => (
                <span className="pill" key={i}>{song}</span>
              ))}
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "nowrap" }} onClick={(e) => e.stopPropagation()}>
          <button className="small" type="button" onClick={() => downloadEventIcs(p)} aria-label="加入手機行事曆"><CalendarPlus size={14} /></button>
          <button className="small" type="button" onClick={onEdit}><Pencil size={14} /></button>
          <button className="small danger" type="button" onClick={onDelete}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

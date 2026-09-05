"use client";

import { AlertCircle } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { addDays, monthDates, slotsForDate, weekDates } from "@/lib/date-utils";

function ProgressRow({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", fontSize: 14, fontWeight: 900 }}>
        <span>{label}</span>
        <span className="sub">{done} / {total} 堂課</span>
      </div>
      <div className="progressTrack">
        <div className="progressFill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AttentionCard() {
  const { state } = useAppState();

  const week = weekDates(state.dateKey);
  const weekDone = state.records.filter((r) => week.includes(r.dateKey)).length;
  const weekTotal = week.reduce((n, d) => n + slotsForDate(state.slots, d).length, 0);

  const monthDays = monthDates(state.month);
  const monthDone = state.records.filter((r) => r.dateKey.startsWith(state.month)).length;
  const monthTotal = monthDays.reduce((n, d) => n + slotsForDate(state.slots, d).length, 0);

  const yesterday = addDays(state.dateKey, -1);
  const yesterdayHadClasses = slotsForDate(state.slots, yesterday).length > 0;
  const yesterdayCoveredGroups = new Set(
    state.records.filter((r) => r.dateKey === yesterday).map((r) => r.groupName).filter(Boolean)
  );
  const yesterdayAbsent = state.students.filter((s) => {
    const groups = (s.groups || "").split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) return true;
    return !groups.some((g) => yesterdayCoveredGroups.has(g));
  });

  const flagged = state.students.filter((s) => s.needsAttention);

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle red"><AlertCircle size={20} /></div>
        <div className="sectionText">
          <h2>注意資訊</h2>
          <div className="sub">教學進度與需要留意的學生</div>
        </div>
      </div>

      <ProgressRow label="本週進度" done={weekDone} total={weekTotal} />
      <ProgressRow label="本月進度" done={monthDone} total={monthTotal} />

      {yesterdayHadClasses && (
        <div style={{ marginTop: 16 }}>
          <div className="sub" style={{ fontWeight: 900 }}>昨天未參與學生（{yesterdayAbsent.length}）</div>
          {yesterdayAbsent.length === 0 ? (
            <div className="empty" style={{ marginTop: 8 }}>昨天所有學生都有課程紀錄涵蓋。</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {yesterdayAbsent.slice(0, 20).map((s) => (
                <span className="pill" key={s.id}>{s.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="sub" style={{ fontWeight: 900 }}>能力需注意學生（{flagged.length}）</div>
        {flagged.length === 0 ? (
          <div className="empty" style={{ marginTop: 8 }}>目前沒有標記需要特別注意的學生。</div>
        ) : (
          <div className="list" style={{ marginTop: 8 }}>
            {flagged.map((s) => (
              <div className="item" key={s.id}>
                <b>{s.name}</b>
                {s.attentionNote && <div className="sub" style={{ marginTop: 2 }}>{s.attentionNote}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

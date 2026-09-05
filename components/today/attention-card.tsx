"use client";

import { useState } from "react";
import { AlertCircle, Pencil } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { displayDate, parseDate, toDateKey } from "@/lib/date-utils";

const PERFORMANCE_TYPE = "演出";

function daysUntil(dateKey: string, today: string): number {
  const ms = parseDate(dateKey).getTime() - parseDate(today).getTime();
  return Math.round(ms / 86400000);
}

function countdownLabel(days: number): string {
  if (days <= 0) return "就是今天！";
  if (days === 1) return "明天";
  return `還有 ${days} 天`;
}

// A free-text status note, not a computed stat — "本週進度" for a recorder
// ensemble means "祭典全團速度130", which no lesson-count number can say.
function ProgressNote({ label, value, onSave }: { label: string; value: string; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div style={{ marginTop: 12 }}>
        <div className="sub" style={{ fontWeight: 900 }}>{label}</div>
        <textarea
          autoFocus
          style={{ marginTop: 6 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="例如：祭典全團速度130、微風清晨I段完成"
        />
        <div className="row" style={{ gap: 8, marginTop: 6, justifyContent: "flex-start" }}>
          <button className="primary small" type="button" onClick={() => { onSave(draft.trim()); setEditing(false); }}>儲存</button>
          <button className="small" type="button" onClick={() => { setDraft(value); setEditing(false); }}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div className="row" style={{ marginTop: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sub" style={{ fontWeight: 900 }}>{label}</div>
        <div style={{ marginTop: 4 }}>
          {value ? value : <span className="sub">尚未填寫，點右邊編輯</span>}
        </div>
      </div>
      <button className="small" type="button" onClick={() => { setDraft(value); setEditing(true); }}><Pencil size={14} /></button>
    </div>
  );
}

export function AttentionCard() {
  const { state, save, openMoreSection } = useAppState();

  function saveWeekNote(text: string) {
    save("config.save", { weekProgressNote: text }, {
      localUpdate: (prev) => ({ ...prev, config: { ...prev.config, weekProgressNote: text } }),
    });
  }
  function saveMonthNote(text: string) {
    save("config.save", { monthProgressNote: text }, {
      localUpdate: (prev) => ({ ...prev, config: { ...prev.config, monthProgressNote: text } }),
    });
  }

  const today = toDateKey(new Date());
  const upcomingPerformances = state.events
    .filter((e) => e.type === PERFORMANCE_TYPE && e.dateKey >= today)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 3);

  // A lesson record covers a whole group (groupName), not individual
  // students, so "who hasn't been covered today" is derived by matching a
  // student's group memberships against today's completed records' groups.
  const todayCoveredGroups = new Set(
    state.records.filter((r) => r.dateKey === state.dateKey).map((r) => r.groupName).filter(Boolean)
  );
  const todayAbsent = state.students.filter((s) => {
    const groups = (s.groups || "").split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) return true;
    return !groups.some((g) => todayCoveredGroups.has(g));
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

      <ProgressNote label="本週進度" value={state.config.weekProgressNote || ""} onSave={saveWeekNote} />
      <ProgressNote label="本月進度" value={state.config.monthProgressNote || ""} onSave={saveMonthNote} />

      {upcomingPerformances.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="sub" style={{ fontWeight: 900 }}>即將到來的表演</div>
          <div className="list" style={{ marginTop: 8 }}>
            {upcomingPerformances.map((p) => (
              <div
                className="item row"
                key={p.id}
                style={{ cursor: "pointer" }}
                onClick={() => openMoreSection("performances")}
              >
                <div>
                  <b>{p.title || "（未命名表演）"}</b>
                  <div className="sub">{displayDate(p.dateKey)}</div>
                </div>
                <span className="statusPill pending">{countdownLabel(daysUntil(p.dateKey, today))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="sub" style={{ fontWeight: 900 }}>今天未參與學生（{todayAbsent.length}）</div>
        {state.students.length === 0 ? (
          <div className="empty" style={{ marginTop: 8 }}>尚未建立學生名單。</div>
        ) : todayAbsent.length === 0 ? (
          <div className="empty" style={{ marginTop: 8 }}>今天已涵蓋的團別都有課程紀錄。</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {todayAbsent.slice(0, 20).map((s) => (
              <span className="pill" key={s.id}>{s.name}</span>
            ))}
          </div>
        )}
      </div>

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

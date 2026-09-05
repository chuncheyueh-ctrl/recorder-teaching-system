"use client";

import { BarChart3, Calendar, GraduationCap, Users } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { weekDates } from "@/lib/date-utils";

export function AnalyticsPage() {
  const { state } = useAppState();
  // state.records spans a wider window than just this week (see the 今日
  // attention card's needs) — narrow back down for an accurate weekly count.
  const week = weekDates(state.dateKey);
  const weekRecordCount = state.records.filter((r) => week.includes(r.dateKey)).length;

  const tiles = [
    { label: "本週紀錄", value: weekRecordCount, unit: "筆", icon: BarChart3, tone: "red" },
    { label: "老師", value: state.teachers.length, unit: "位", icon: Users, tone: "green" },
    { label: "學生", value: state.students.length, unit: "位", icon: GraduationCap, tone: "purple" },
    { label: "時段", value: state.slots.length, unit: "個", icon: Calendar, tone: "blue" },
  ];

  // Moved here from the 今日 page's old 未參與學生 card — same "who hasn't
  // been covered today, broken down by group" computation, just relocated
  // since it's a statistics table, not something that needs daily attention.
  const todayCoveredGroups = new Set(
    state.records.filter((r) => r.dateKey === state.dateKey).map((r) => r.groupName).filter(Boolean)
  );
  const todayAbsent = state.students.filter((s) => {
    const groups = (s.groups || "").split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) return true;
    return !groups.some((g) => todayCoveredGroups.has(g));
  });
  const groupCounts = (state.config.group || []).map((g) => ({
    name: g,
    count: todayAbsent.filter((s) => (s.groups || "").split(",").map((x) => x.trim()).includes(g)).length,
  }));

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle red"><BarChart3 size={20} /></div>
        <div className="sectionText">
          <h2>分析</h2>
          <div className="sub">本週統計摘要</div>
        </div>
      </div>
      <div className="statGrid">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div className="statTile" key={t.label}>
              <div className={`statIcon badgeCircle ${t.tone}`}><Icon size={18} /></div>
              <div className="statNum">{t.value} <span className="statLabel">{t.unit}</span></div>
              <div className="statLabel">{t.label}</div>
            </div>
          );
        })}
      </div>

      {groupCounts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="sub" style={{ fontWeight: 900 }}>今日各團別未參與人數</div>
          <div className="groupPillRow">
            {groupCounts.map((g) => (
              <span className="groupPill" key={g.name}>{g.name} {g.count} 人</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

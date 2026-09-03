"use client";

import { BarChart3, Calendar, GraduationCap, Users } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";

export function AnalyticsPage() {
  const { state } = useAppState();

  const tiles = [
    { label: "本週紀錄", value: state.records.length, unit: "筆", icon: BarChart3, tone: "red" },
    { label: "老師", value: state.teachers.length, unit: "位", icon: Users, tone: "green" },
    { label: "學生", value: state.students.length, unit: "位", icon: GraduationCap, tone: "purple" },
    { label: "時段", value: state.slots.length, unit: "個", icon: Calendar, tone: "blue" },
  ];

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
    </div>
  );
}

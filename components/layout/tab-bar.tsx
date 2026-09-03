"use client";

import { BarChart3, Calendar, House, MoreHorizontal, PenLine } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import type { PageKey } from "@/lib/types";

const TABS: { key: PageKey; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "today", label: "今日", icon: House },
  { key: "records", label: "紀錄", icon: PenLine },
  { key: "calendar", label: "行事曆", icon: Calendar },
  { key: "analytics", label: "分析", icon: BarChart3 },
  { key: "more", label: "更多", icon: MoreHorizontal },
];

export function TabBar() {
  const { page, setPage } = useAppState();

  return (
    <div className="tabs">
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            className={`tab${page === t.key ? " active" : ""}`}
            onClick={() => setPage(t.key)}
          >
            <Icon size={20} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

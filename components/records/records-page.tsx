"use client";

import { PenLine } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { parseDate, weekDates, zhWeek } from "@/lib/date-utils";
import { RecordCard } from "@/components/ui/record-card";

export function RecordsPage() {
  const { state, changeDate } = useAppState();
  const days = weekDates(state.dateKey);

  return (
    <>
      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle red"><PenLine size={20} /></div>
          <div className="sectionText">
            <h2>依日期與時段填寫</h2>
            <div className="sub">點選日期切換該天的課程紀錄</div>
          </div>
        </div>
        <div className="weekChips" style={{ marginTop: 16 }}>
          {days.map((d) => (
            <button
              key={d}
              className={`dayChip${d === state.dateKey ? " active" : ""}`}
              type="button"
              onClick={() => changeDate(d)}
            >
              <div>{d.slice(5).replace("-", "/")}</div>
              <div className="weekday">（{zhWeek(parseDate(d))}）</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="sectionHead">
          <div className="sectionText">
            <h2>本週所有紀錄</h2>
            <div className="sub">共 {state.records.length} 筆</div>
          </div>
        </div>
        <div className="list">
          {state.records.length === 0 && <div className="empty">本週沒有紀錄。</div>}
          {state.records.map((r) => (
            <RecordCard key={r.id} record={r} />
          ))}
        </div>
      </div>
    </>
  );
}

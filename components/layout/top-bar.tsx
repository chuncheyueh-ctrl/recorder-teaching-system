"use client";

import { Bell, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { addDays, displayDate, toDateKey } from "@/lib/date-utils";

export function TopBar() {
  const { state, changeDate, openRecordDialog, toast } = useAppState();
  const isToday = state.dateKey === toDateKey(new Date());

  return (
    <>
      <div className="topBar">
        <button className="iconBtn" aria-label="通知" onClick={() => toast("提醒功能開發中，敬請期待")}>
          <Bell size={20} />
        </button>
      </div>

      <h1 className="pageTitle">中正國小直笛團</h1>

      <div className="titleMeta">
        <div>
          <div className="versionSub">V22.1 Fast Save 教師工作台</div>
          <div className="dateNav">
            <button
              className="navBtn"
              aria-label="前一天"
              onClick={() => changeDate(addDays(state.dateKey, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              今天是 <b>{state.dateKey ? displayDate(state.dateKey) : "讀取中"}</b>
            </span>
            <button
              className="navBtn"
              aria-label="後一天"
              onClick={() => changeDate(addDays(state.dateKey, 1))}
            >
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button className="small" onClick={() => changeDate(toDateKey(new Date()))}>
                回今天
              </button>
            )}
          </div>
        </div>
        <button className="quickAddBtn" onClick={() => openRecordDialog()}>
          <Plus size={16} /> 快速新增
        </button>
      </div>
    </>
  );
}

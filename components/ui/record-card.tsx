"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { LessonRecord } from "@/lib/types";
import { timeRange } from "@/lib/date-utils";
import { useAppState } from "@/state/app-state-provider";

export function RecordCard({ record }: { record: LessonRecord }) {
  const { openRecordDialog, remove } = useAppState();

  async function handleDelete() {
    if (!confirm("刪除這筆紀錄？")) return;
    await remove("records", "record.delete", record.id);
  }

  const isDone = record.state === "已完成";

  return (
    <div className="item">
      <div className="row">
        <div>
          <b>{record.slotName} {timeRange(record.start, record.end)}</b>
          <div className="sub">{record.dateKey}｜{record.groupName}｜{record.teacherName}</div>
        </div>
        <span className={`statusPill ${isDone ? "done" : "pending"}`}>{record.state || "已完成"}</span>
      </div>
      {record.studentNames?.length > 0 && <p><b>本堂學生：</b>{record.studentNames.join("、")}</p>}
      {record.focusStudentNames?.length > 0 && <p><b>重點學生：</b>{record.focusStudentNames.join("、")}</p>}
      {record.content && <p><b>教學：</b>{record.content}</p>}
      {record.progress && <p><b>進度：</b>{record.progress}</p>}
      {record.studentStatus && <p><b>學生狀況：</b>{record.studentStatus}</p>}
      {record.handoff && <p><b>交接：</b>{record.handoff}</p>}
      <div className="row" style={{ gap: 6 }}>
        <button className="small" type="button" onClick={() => openRecordDialog({ slotId: record.slotId, recordId: record.id })}>
          <Pencil size={14} /> 編輯
        </button>
        <button className="small danger" type="button" onClick={handleDelete}>
          <Trash2 size={14} /> 刪除
        </button>
      </div>
    </div>
  );
}

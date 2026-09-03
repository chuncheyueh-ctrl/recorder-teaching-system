"use client";

import { CalendarClock, GraduationCap, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { timeRange, weekdayLabel } from "@/lib/date-utils";

export function MorePage() {
  const { state, openTeacherDialog, openStudentDialog, openSlotDialog, remove } = useAppState();

  async function deleteTeacher(id: string) {
    if (confirm("刪除老師？")) await remove("teachers", "teacher.delete", id);
  }
  async function deleteStudent(id: string) {
    if (confirm("刪除學生？")) await remove("students", "student.delete", id);
  }
  async function deleteSlot(id: string) {
    if (confirm("刪除時段？")) await remove("slots", "slot.delete", id);
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle green"><Users size={20} /></div>
          <div className="sectionText">
            <h2>老師管理</h2>
            <div className="sub">共 {state.teachers.length} 位</div>
          </div>
          <button className="linkPill green" onClick={() => openTeacherDialog()}>
            <Plus size={14} /> 新增
          </button>
        </div>
        <div className="list" style={{ marginTop: 16 }}>
          {state.teachers.length === 0 && <div className="empty">尚無老師。</div>}
          {state.teachers.map((t) => (
            <div className="item row" key={t.id}>
              <div>
                <b>{t.name}</b>
                <div className="sub">{t.note || ""}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="small" type="button" onClick={() => openTeacherDialog(t.id)}><Pencil size={14} /></button>
                <button className="small danger" type="button" onClick={() => deleteTeacher(t.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle purple"><GraduationCap size={20} /></div>
          <div className="sectionText">
            <h2>學生管理</h2>
            <div className="sub">共 {state.students.length} 位</div>
          </div>
          <button className="linkPill purple" onClick={() => openStudentDialog()}>
            <Plus size={14} /> 新增
          </button>
        </div>
        <div className="list" style={{ marginTop: 16 }}>
          {state.students.length === 0 && <div className="empty">尚無學生。</div>}
          {state.students.map((s) => (
            <div className="item row" key={s.id}>
              <div>
                <b>{s.name}</b>
                <div className="sub">{s.grade || ""} {s.groups || ""}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="small" type="button" onClick={() => openStudentDialog(s.id)}><Pencil size={14} /></button>
                <button className="small danger" type="button" onClick={() => deleteStudent(s.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle blue"><CalendarClock size={20} /></div>
          <div className="sectionText">
            <h2>時段管理</h2>
            <div className="sub">共 {state.slots.length} 個</div>
          </div>
          <button className="linkPill blue" onClick={() => openSlotDialog()}>
            <Plus size={14} /> 新增
          </button>
        </div>
        <div className="list" style={{ marginTop: 16 }}>
          {state.slots.length === 0 && <div className="empty">尚無時段。</div>}
          {state.slots.map((s) => (
            <div className="item row" key={s.id}>
              <div>
                <b>{s.name}</b>
                <div className="sub">{timeRange(s.start, s.end)}｜{weekdayLabel(s.weekdays)}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="small" type="button" onClick={() => openSlotDialog(s.id)}><Pencil size={14} /></button>
                <button className="small danger" type="button" onClick={() => deleteSlot(s.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

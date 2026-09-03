"use client";

import { useState } from "react";
import { CalendarClock, GraduationCap, Pencil, Plus, Tag, Trash2, Users } from "lucide-react";
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

      <GroupManager />
    </div>
  );
}

function GroupManager() {
  const { state, save } = useAppState();
  const groups = state.config.group || [];
  const [newGroup, setNewGroup] = useState("");

  function saveGroups(next: string[]) {
    save(
      "config.save",
      { group: next },
      { localUpdate: (prev) => ({ ...prev, config: { ...prev.config, group: next } }) }
    );
  }

  function addGroup() {
    const name = newGroup.trim();
    if (!name || groups.includes(name)) return;
    saveGroups([...groups, name]);
    setNewGroup("");
  }

  function deleteGroup(name: string) {
    const inUse = state.students.filter((s) => (s.groups || "").includes(name)).length;
    const warn = inUse > 0 ? `，目前有 ${inUse} 位學生屬於這個團別` : "";
    if (!confirm(`刪除團別「${name}」${warn}？`)) return;
    saveGroups(groups.filter((g) => g !== name));
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle red"><Tag size={20} /></div>
        <div className="sectionText">
          <h2>團別管理</h2>
          <div className="sub">共 {groups.length} 個</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addGroup();
            }
          }}
          placeholder="例如：中階"
        />
        <button className="primary small" type="button" onClick={addGroup}>
          <Plus size={14} /> 新增
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {groups.length === 0 && <div className="empty">尚無團別，新增後就能在學生資料裡用下拉選單指定。</div>}
        {groups.map((g) => (
          <div className="item row" key={g}>
            <b>{g}</b>
            <button className="small danger" type="button" onClick={() => deleteGroup(g)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

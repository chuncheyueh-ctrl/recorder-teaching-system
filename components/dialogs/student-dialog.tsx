"use client";

import { useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { uid } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { Student } from "@/lib/types";

export function StudentDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const target = dialogs.student;
  const open = target !== null;

  return (
    <Modal open={open} onClose={closeDialogs} title="學生資料">
      {target && <StudentForm target={target} />}
    </Modal>
  );
}

function StudentForm({ target }: { target: { id?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.id ? state.students.find((s) => s.id === target.id) : undefined;
  const [name, setName] = useState(existing?.name || "");
  const [grade, setGrade] = useState(existing?.grade || "");
  const [groups, setGroups] = useState(existing?.groups || "");
  const [note, setNote] = useState(existing?.note || "");
  const groupOptions = state.config.group || [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const item: Student = { id: target.id || uid("student"), name, grade, groups, note };
    save("student.save", { ...item }, {
      localUpdate: (prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== item.id).concat([item]) }),
      reloadDelayMs: 1200,
    });
    closeDialogs();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="formGrid">
        <label>姓名<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>年級<input value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
        <label className="full">
          所屬團別
          <select value={groups} onChange={(e) => setGroups(e.target.value)}>
            <option value="">（未分類）</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {groupOptions.length === 0 && (
            <span className="sub">尚未建立任何團別，請先到「更多」頁的「團別管理」新增。</span>
          )}
        </label>
        <label className="full">備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p><button className="primary" type="submit">儲存學生</button></p>
    </form>
  );
}

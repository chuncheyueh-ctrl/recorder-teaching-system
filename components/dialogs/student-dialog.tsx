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

function parseGroups(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean)
  );
}

function StudentForm({ target }: { target: { id?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.id ? state.students.find((s) => s.id === target.id) : undefined;
  const [name, setName] = useState(existing?.name || "");
  const [grade, setGrade] = useState(existing?.grade || "");
  const [className, setClassName] = useState(existing?.className || "");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => parseGroups(existing?.groups || ""));
  const [note, setNote] = useState(existing?.note || "");
  const groupOptions = state.config.group || [];
  const classOptions = state.config.class || [];

  function toggleGroup(name: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const groups = Array.from(selectedGroups).join(",");
    const item: Student = { id: target.id || uid("student"), name, grade, className, groups, note };
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
        <label>
          班級
          <select value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">（未分班）</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {classOptions.length === 0 && (
            <span className="sub">尚未建立任何班級，請先到「更多」頁的「班級管理」新增。</span>
          )}
        </label>
        <label className="full">
          所屬團別（可複選，例如同時是社團又個別加強）
          {groupOptions.length === 0 ? (
            <span className="sub">尚未建立任何團別，請先到「更多」頁的「團別管理」新增。</span>
          ) : (
            <div className="checkGrid">
              {groupOptions.map((g) => (
                <label key={g}>
                  <input type="checkbox" checked={selectedGroups.has(g)} onChange={() => toggleGroup(g)} /> {g}
                </label>
              ))}
            </div>
          )}
        </label>
        <label className="full">備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p><button className="primary" type="submit">儲存學生</button></p>
    </form>
  );
}

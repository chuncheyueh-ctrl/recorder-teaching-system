"use client";

import { useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { uid } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { Teacher } from "@/lib/types";

export function TeacherDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const target = dialogs.teacher;
  const open = target !== null;

  return (
    <Modal open={open} onClose={closeDialogs} title="老師資料">
      {target && <TeacherForm target={target} />}
    </Modal>
  );
}

// Mounted fresh each time a dialog opens (Modal only renders this while
// open), so initial field values can be derived once via lazy useState
// instead of an effect that has to sync in after the fact.
function TeacherForm({ target }: { target: { id?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.id ? state.teachers.find((t) => t.id === target.id) : undefined;
  const [name, setName] = useState(existing?.name || "");
  const [note, setNote] = useState(existing?.note || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const item: Teacher = { id: target.id || uid("teacher"), name, note };
    save("teacher.save", { ...item }, {
      localUpdate: (prev) => ({ ...prev, teachers: prev.teachers.filter((t) => t.id !== item.id).concat([item]) }),
      reloadDelayMs: 1200,
    });
    closeDialogs();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>姓名<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <p><button className="primary" type="submit">儲存老師</button></p>
    </form>
  );
}

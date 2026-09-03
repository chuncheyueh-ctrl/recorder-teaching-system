"use client";

import { useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { uid } from "@/lib/api";
import { slotsForDate } from "@/lib/date-utils";
import { Modal } from "@/components/ui/modal";

export function AvailabilityDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const open = dialogs.availability;

  return (
    <Modal open={open} onClose={closeDialogs} title="老師可到校時段">
      {open && <AvailabilityForm />}
    </Modal>
  );
}

function AvailabilityForm() {
  const { state, closeDialogs, save } = useAppState();
  const todaySlots = slotsForDate(state.slots, state.dateKey);

  const [teacherId, setTeacherId] = useState(state.teachers[0]?.id || "");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggleSlot(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const teacher = state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    const dateKey = state.dateKey;
    const slotIds = Array.from(checked);
    save(
      "availability.batchSave",
      { dateKey, teacherId: teacher.id, teacherName: teacher.name, slotIds, note },
      {
        localUpdate: (prev) => {
          const kept = prev.availability.filter((a) => !(a.dateKey === dateKey && a.teacherId === teacher.id));
          const added = slotIds.map((slotId) => {
            const slot = prev.slots.find((s) => s.id === slotId);
            return {
              id: uid("avail_local"),
              dateKey,
              teacherId: teacher.id,
              teacherName: teacher.name,
              slotId,
              slotName: slot?.name || "",
              start: slot?.start || "",
              end: slot?.end || "",
              note,
              status: "active",
            };
          });
          return { ...prev, availability: [...kept, ...added] };
        },
        reloadDelayMs: 1200,
      }
    );
    closeDialogs();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="formGrid">
        <label>日期<input type="date" value={state.dateKey} disabled /></label>
        <label>
          老師
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {state.teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="full">
          可到校時段
          <div className="list">
            {todaySlots.length === 0 && <div className="empty">今天沒有可勾選的時段。</div>}
            {todaySlots.map((s) => (
              <label className="item" key={s.id}>
                <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggleSlot(s.id)} /> {s.name} {s.start}
                {s.end ? `–${s.end}` : ""}
              </label>
            ))}
          </div>
        </label>
        <label className="full">備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p><button className="primary" type="submit">儲存可到校</button></p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { uid } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { Slot } from "@/lib/types";

const WEEKDAYS: { value: string; label: string }[] = [
  { value: "1", label: "週一" },
  { value: "2", label: "週二" },
  { value: "3", label: "週三" },
  { value: "4", label: "週四" },
  { value: "5", label: "週五" },
  { value: "6", label: "週六" },
  { value: "0", label: "週日" },
];

function parseWeekdays(value: string): Set<string> {
  const s = value || "all";
  if (s === "none") return new Set();
  if (s === "all" || s === "每天") return new Set(WEEKDAYS.map((w) => w.value));
  return new Set(s.split(",").filter(Boolean));
}

// A slot with every day checked is stored as "all" (matches every day,
// including days added later); one with none checked is stored as "none"
// (matches no day) rather than reusing "all" for that case.
function serializeWeekdays(set: Set<string>): string {
  if (set.size === 0) return "none";
  if (set.size === 7) return "all";
  return Array.from(set).join(",");
}

export function SlotDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const target = dialogs.slot;
  const open = target !== null;

  return (
    <Modal open={open} onClose={closeDialogs} title="時段資料">
      {target && <SlotForm target={target} />}
    </Modal>
  );
}

function SlotForm({ target }: { target: { id?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.id ? state.slots.find((s) => s.id === target.id) : undefined;
  const [name, setName] = useState(existing?.name || "");
  const [start, setStart] = useState(existing?.start || "");
  const [end, setEnd] = useState(existing?.end || "");
  const [note, setNote] = useState(existing?.note || "");
  const [weekdays, setWeekdays] = useState<Set<string>>(() => parseWeekdays(existing?.weekdays || "all"));

  function toggleDay(value: string) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const item: Slot = { id: target.id || uid("slot"), name, start, end, weekdays: serializeWeekdays(weekdays), note };
    save("slot.save", { ...item }, {
      localUpdate: (prev) => ({ ...prev, slots: prev.slots.filter((s) => s.id !== item.id).concat([item]) }),
      reloadDelayMs: 1200,
    });
    closeDialogs();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="formGrid">
        <label>名稱<input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：早自習" /></label>
        <label>開始<input value={start} onChange={(e) => setStart(e.target.value)} placeholder="08:05" /></label>
        <label>結束<input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="08:35" /></label>
        <label className="full">
          適用日
          <div className="weekdayChecks">
            {WEEKDAYS.map((w) => (
              <label key={w.value}>
                <input type="checkbox" checked={weekdays.has(w.value)} onChange={() => toggleDay(w.value)} /> {w.label}
              </label>
            ))}
          </div>
        </label>
        <label className="full">備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p><button className="primary" type="submit">儲存時段</button></p>
    </form>
  );
}

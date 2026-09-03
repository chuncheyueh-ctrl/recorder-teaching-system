"use client";

import { useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { uid } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { CalendarEvent } from "@/lib/types";

export function EventDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const target = dialogs.event;
  const open = target !== null;

  return (
    <Modal open={open} onClose={closeDialogs} title="行事曆事件">
      {target && <EventForm target={target} />}
    </Modal>
  );
}

function EventForm({ target }: { target: { id?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.id ? state.events.find((e) => e.id === target.id) : undefined;

  const [dateKey, setDateKey] = useState(existing?.dateKey || state.dateKey);
  const [type, setType] = useState(existing?.type || state.config.eventType?.[0] || "");
  const [title, setTitle] = useState(existing?.title || "");
  const [start, setStart] = useState(existing?.start || "");
  const [end, setEnd] = useState(existing?.end || "");
  const [location, setLocation] = useState(existing?.location || "");
  const [note, setNote] = useState(existing?.note || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const item: CalendarEvent = { id: target.id || uid("event"), dateKey, title, type, start, end, location, note };
    save("event.save", { ...item }, {
      localUpdate: (prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== item.id).concat([item]) }),
      reloadDelayMs: 1200,
    });
    closeDialogs();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="formGrid">
        <label>日期<input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} /></label>
        <label>
          類型
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {(state.config.eventType || []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="full">標題<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>開始<input value={start} onChange={(e) => setStart(e.target.value)} placeholder="08:00" /></label>
        <label>結束<input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="16:00" /></label>
        <label className="full">地點<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label className="full">備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p><button className="primary" type="submit">儲存事件</button></p>
    </form>
  );
}

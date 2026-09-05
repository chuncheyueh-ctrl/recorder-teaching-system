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

const PERFORMANCE_TYPE = "演出";

function EventForm({ target }: { target: { id?: string; defaultType?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.id ? state.events.find((e) => e.id === target.id) : undefined;

  const [dateKey, setDateKey] = useState(existing?.dateKey || state.dateKey);
  const [type, setType] = useState(existing?.type || target.defaultType || state.config.eventType?.[0] || "");
  const [title, setTitle] = useState(existing?.title || "");
  const [start, setStart] = useState(existing?.start || "");
  const [end, setEnd] = useState(existing?.end || "");
  const [location, setLocation] = useState(existing?.location || "");
  const [note, setNote] = useState(existing?.note || "");
  const [repertoireText, setRepertoireText] = useState((existing?.repertoire || []).join("\n"));
  const [attire, setAttire] = useState(existing?.attire || "");
  const [callTime, setCallTime] = useState(existing?.callTime || "");
  const [callLocation, setCallLocation] = useState(existing?.callLocation || "");
  const [performingGroups, setPerformingGroups] = useState<Set<string>>(new Set(existing?.performingGroups || []));

  const isPerformance = type === PERFORMANCE_TYPE;
  const groupOptions = state.config.group || [];

  function toggleGroup(name: string) {
    setPerformingGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const item: CalendarEvent = {
      id: target.id || uid("event"),
      dateKey,
      title,
      type,
      start,
      end,
      location,
      note,
      ...(isPerformance
        ? {
            repertoire: repertoireText.split("\n").map((s) => s.trim()).filter(Boolean),
            attire,
            callTime,
            callLocation,
            performingGroups: Array.from(performingGroups),
          }
        : {}),
    };
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

        {isPerformance && (
          <>
            <label>集合時間<input value={callTime} onChange={(e) => setCallTime(e.target.value)} placeholder="07:30" /></label>
            <label>集合地點<input value={callLocation} onChange={(e) => setCallLocation(e.target.value)} placeholder="若與表演地點不同才需填寫" /></label>
            <label className="full">服裝<input value={attire} onChange={(e) => setAttire(e.target.value)} placeholder="例如：團服、白上衣黑長褲" /></label>
            <label className="full">
              曲目
              <textarea
                value={repertoireText}
                onChange={(e) => setRepertoireText(e.target.value)}
                placeholder={"一行一首曲子，例如：\n小步舞曲\n歡樂頌"}
              />
            </label>
            <label className="full">
              參演團別
              {groupOptions.length === 0 ? (
                <span className="sub">尚未建立任何團別，請先到「更多」頁的「團別管理」新增。</span>
              ) : (
                <div className="checkGrid">
                  {groupOptions.map((g) => (
                    <label key={g}>
                      <input type="checkbox" checked={performingGroups.has(g)} onChange={() => toggleGroup(g)} /> {g}
                    </label>
                  ))}
                </div>
              )}
            </label>
          </>
        )}

        <label className="full">備註<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p><button className="primary" type="submit">儲存事件</button></p>
    </form>
  );
}

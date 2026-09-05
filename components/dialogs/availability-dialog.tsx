"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { getTeacherAvailability, uid } from "@/lib/api";
import { addDays, addMonths, calendarWeeks, monthDates, parseDate, weekdayOkNum } from "@/lib/date-utils";
import { pickDefaultTeacherId } from "@/lib/my-teacher";
import { Modal } from "@/components/ui/modal";
import type { Availability } from "@/lib/types";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function AvailabilityDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const open = dialogs.availability;

  return (
    <Modal open={open} onClose={closeDialogs} title="老師可到校時段">
      {open && <AvailabilityForm />}
    </Modal>
  );
}

function cellKey(slotId: string, dateKey: string): string {
  return `${slotId}__${dateKey}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return `${y} 年 ${Number(m)} 月`;
}

function AvailabilityForm() {
  const { state, closeDialogs, save, myTeacherId, setMyTeacherId } = useAppState();

  const slots = [...state.slots].sort((a, b) => a.start.localeCompare(b.start));

  const [teacherId, setTeacherId] = useState(() => pickDefaultTeacherId(state.teachers, myTeacherId));
  const [month, setMonth] = useState(() => state.dateKey.slice(0, 7));
  // Explicit tab choice, if any — falls back to the first slot once slots
  // have loaded, without needing an effect just to mirror that fallback.
  const [activeSlotIdChoice, setActiveSlotIdChoice] = useState("");
  const activeSlotId = activeSlotIdChoice || slots[0]?.id || "";
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const monthDays = monthDates(month);
  const monthStart = monthDays[0];
  const monthEnd = monthDays[monthDays.length - 1];
  const weeks = calendarWeeks(month);
  const activeSlot = slots.find((s) => s.id === activeSlotId);

  useEffect(() => {
    let ignore = false;
    const load = teacherId
      ? getTeacherAvailability(teacherId, monthStart, monthEnd)
      : Promise.resolve<Availability[]>([]);
    load.then((list) => {
      if (ignore) return;
      setChecked(new Set(list.map((a) => cellKey(a.slotId, a.dateKey))));
      setNote(list[0]?.note || "");
    });
    return () => {
      ignore = true;
    };
  }, [teacherId, monthStart, monthEnd]);

  // Drag-to-paint selection: press a cell to decide check/uncheck, then
  // dragging (mouse or touch) over other cells applies the same value —
  // works for the "press and slide" gesture on mobile.
  const draggingRef = useRef(false);
  const paintValueRef = useRef(true);

  useEffect(() => {
    function stop() {
      draggingRef.current = false;
    }
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
    return () => {
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
  }, []);

  function paint(dateKey: string, value: boolean) {
    if (!activeSlot || !weekdayOkNum(activeSlot, parseDate(dateKey).getDay())) return;
    setChecked((prev) => {
      const next = new Set(prev);
      const key = cellKey(activeSlot.id, dateKey);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handlePointerDown(dateKey: string, e: React.PointerEvent) {
    if (!activeSlot) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // not all targets support pointer capture — safe to ignore
    }
    draggingRef.current = true;
    const willCheck = !checked.has(cellKey(activeSlot.id, dateKey));
    paintValueRef.current = willCheck;
    paint(dateKey, willCheck);
  }

  function handleGridPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const dateKey = el?.closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!dateKey) return;
    paint(dateKey, paintValueRef.current);
  }

  async function copyLastMonth() {
    if (!teacherId) return;
    setLoading(true);
    try {
      const prevMonth = addMonths(month, -1);
      const prevDays = monthDates(prevMonth);
      const list = await getTeacherAvailability(teacherId, prevDays[0], prevDays[prevDays.length - 1]);
      const patterns = new Set(list.map((a) => `${a.slotId}__${parseDate(a.dateKey).getDay()}`));
      const next = new Set<string>();
      monthDays.forEach((dateKey) => {
        const weekday = parseDate(dateKey).getDay();
        slots.forEach((s) => {
          if (patterns.has(`${s.id}__${weekday}`)) next.add(cellKey(s.id, dateKey));
        });
      });
      setChecked(next);
      if (list[0]?.note) setNote(list[0].note);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const teacher = state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const entries: { dateKey: string; slotId: string }[] = [];
    checked.forEach((key) => {
      const [slotId, dateKey] = key.split("__");
      entries.push({ dateKey, slotId });
    });

    // state.availability only holds the currently viewed week, so the
    // optimistic update only needs to patch that slice — the real month-wide
    // write happens in the background and a refresh reconciles the rest.
    const viewWeekStart = state.weekStart;
    const viewWeekEnd = addDays(viewWeekStart, 6);

    save(
      "availability.batchSave",
      { periodStart: monthStart, periodEnd: monthEnd, teacherId: teacher.id, teacherName: teacher.name, note, entries },
      {
        localUpdate: (prev) => {
          const kept = prev.availability.filter(
            (a) => !(a.teacherId === teacher.id && a.dateKey >= viewWeekStart && a.dateKey <= viewWeekEnd)
          );
          const added = entries
            .filter((en) => en.dateKey >= viewWeekStart && en.dateKey <= viewWeekEnd)
            .map(({ dateKey, slotId }) => {
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
      <label>
        老師
        <select
          value={teacherId}
          onChange={(e) => {
            setTeacherId(e.target.value);
            setMyTeacherId(e.target.value);
          }}
        >
          {state.teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      {slots.length === 0 ? (
        <div className="empty">尚未建立任何時段，請先到「更多」新增時段。</div>
      ) : (
        <>
          {slots.length > 1 && (
            <div className="availSlotTabs">
              {slots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`availSlotTab${s.id === activeSlotId ? " active" : ""}`}
                  onClick={() => setActiveSlotIdChoice(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <div className="availMonthNav">
            <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))}>‹</button>
            <b>{monthLabel(month)}</b>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))}>›</button>
            <button type="button" className="availCopyBtn" onClick={copyLastMonth} disabled={loading || !teacherId}>
              複製上個月
            </button>
          </div>

          <div className="calGridWrap">
            <table className="calGrid" onPointerMove={handleGridPointerMove}>
              <thead>
                <tr>
                  {WEEKDAY_LABELS.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((dateKey, di) => {
                      if (!dateKey) return <td key={di} className="calBlank" />;
                      const day = Number(dateKey.slice(-2));
                      const applicable = activeSlot ? weekdayOkNum(activeSlot, di) : false;
                      const isChecked = activeSlot ? checked.has(cellKey(activeSlot.id, dateKey)) : false;
                      if (!applicable) {
                        return (
                          <td key={di}>
                            <span className="calCellOff">{day}</span>
                          </td>
                        );
                      }
                      return (
                        <td key={di}>
                          <button
                            type="button"
                            data-date={dateKey}
                            className={`calCell${isChecked ? " active" : ""}`}
                            onPointerDown={(e) => handlePointerDown(dateKey, e)}
                          >
                            {day}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sub">點一天,或按住手指上下滑動選多天；「複製上個月」會依星期套用到這個月，選好後可再個別調整例外的日子。</div>
        </>
      )}

      <label className="full">
        備註
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：可帶中音笛、只能到第一節、可代課" />
      </label>

      <div className="wizardFoot">
        <button type="button" onClick={() => setChecked(new Set())}>清除本月勾選</button>
        <button className="primary" type="submit">儲存整月可到校時段</button>
      </div>
    </form>
  );
}

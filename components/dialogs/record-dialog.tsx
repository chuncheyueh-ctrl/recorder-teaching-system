"use client";

import { useState } from "react";
import { useAppState } from "@/state/app-state-provider";
import { uid } from "@/lib/api";
import { slotsForDate as slotsMatchingDate, timeRange } from "@/lib/date-utils";
import { pickDefaultTeacherId, saveMyTeacherId } from "@/lib/my-teacher";
import type { LessonRecord, Slot, Student } from "@/lib/types";
import { Modal } from "@/components/ui/modal";

const DEFAULT_ISSUE = ["節奏", "音準", "指法", "換氣", "音色", "速度", "合奏聆聽", "看譜", "專注度"];
const DEFAULT_PART = ["高音笛一部", "高音笛二部", "中音笛", "次中音笛", "低音笛", "個別學生", "臨時分組", "其他"];
const DEFAULT_FOCUS_TAG = ["跟不上", "節奏問題", "音準問題", "指法問題", "需要個別指導", "注意力不穩", "表現突出", "可帶領"];
const DEFAULT_PROGRESS_STAGE = ["未開始", "練習中", "可慢速完成", "可跟節拍器完成", "可合奏", "可演出"];
const DEFAULT_STABILITY = ["很不穩定", "偶爾成功", "多數可完成", "穩定完成"];
const DEFAULT_STATE = ["未完成", "部分完成", "已完成"];

const STEP_TITLES = ["日期與時段", "老師與團別", "本堂學生", "課堂狀態", "重點學生與標記", "文字紀錄"];

export function RecordDialog() {
  const { dialogs, closeDialogs } = useAppState();
  const target = dialogs.record;
  const open = target !== null;

  return (
    <Modal open={open} onClose={closeDialogs} title="教學紀錄">
      {target && <RecordForm target={target} />}
    </Modal>
  );
}

interface FormState {
  id: string;
  dateKey: string;
  slotId: string;
  groupName: string;
  teacherId: string;
  studentIds: string[];
  focusStudentIds: string[];
  focusTags: string[];
  groupProgressStage: string;
  groupStability: string;
  groupIssueTypes: string[];
  parts: string[];
  partOther: string;
  content: string;
  progress: string;
  studentStatus: string;
  handoff: string;
  state: string;
}

function slotsForForm(slots: Slot[], dateKey: string, mustInclude?: string): Slot[] {
  const matching = slotsMatchingDate(slots, dateKey);
  if (mustInclude && !matching.some((s) => s.id === mustInclude)) {
    const extra = slots.find((s) => s.id === mustInclude);
    if (extra) return [extra, ...matching];
  }
  return matching;
}

function RecordForm({ target }: { target: { slotId?: string; recordId?: string; teacherId?: string } }) {
  const { state, closeDialogs, save } = useAppState();
  const existing = target.recordId ? state.records.find((r) => r.id === target.recordId) : undefined;
  const initialDateKey = existing?.dateKey || state.dateKey;
  const initialSlotId =
    existing?.slotId || target.slotId || slotsMatchingDate(state.slots, initialDateKey)[0]?.id || "";

  const [step, setStep] = useState(0);
  const lastStep = STEP_TITLES.length - 1;

  const partOptions = state.config.part?.length ? state.config.part : DEFAULT_PART;
  const existingParts = existing?.parts || [];

  const [form, setForm] = useState<FormState>({
    id: existing?.id || "",
    dateKey: initialDateKey,
    slotId: initialSlotId,
    groupName: existing?.groupName || state.config.group?.[0] || "",
    teacherId: existing?.teacherId || target.teacherId || pickDefaultTeacherId(state.teachers),
    studentIds: existing?.studentIds || [],
    focusStudentIds: existing?.focusStudentIds || [],
    focusTags: existing?.focusTags || [],
    groupProgressStage: existing?.groupProgressStage || (state.config.progressStage || DEFAULT_PROGRESS_STAGE)[0] || "",
    groupStability: existing?.groupStability || (state.config.stability || DEFAULT_STABILITY)[1] || "",
    groupIssueTypes: existing?.groupIssueTypes || [],
    parts: existingParts.filter((p) => partOptions.includes(p)),
    partOther: existingParts.find((p) => !partOptions.includes(p)) || "",
    content: existing?.content || "",
    progress: existing?.progress || "",
    studentStatus: existing?.studentStatus || "",
    handoff: existing?.handoff || "",
    state: existing?.state || "部分完成",
  });

  // Options follow the form's own date field, not whatever date the page
  // happens to be viewing, so changing the date updates which slots show up.
  const availableSlots = slotsForForm(state.slots, form.dateKey, form.slotId);

  const groupOptions = state.config.group || [];
  const issueOptions = state.config.issue?.length ? state.config.issue : DEFAULT_ISSUE;
  const focusTagOptions = state.config.focus?.length ? state.config.focus : DEFAULT_FOCUS_TAG;
  const progressStageOptions = state.config.progressStage?.length ? state.config.progressStage : DEFAULT_PROGRESS_STAGE;
  const stabilityOptions = state.config.stability?.length ? state.config.stability : DEFAULT_STABILITY;
  const stateOptions = state.config.state?.length ? state.config.state : DEFAULT_STATE;

  // "Selected" students stay listed even if a later group change would no
  // longer match them — only the "available" pool is filtered by group.
  const selectedStudentsList = form.studentIds
    .map((id) => state.students.find((s) => s.id === id))
    .filter((s): s is Student => !!s);
  const availableStudentsList = state.students.filter(
    (s) => !form.studentIds.includes(s.id) && (!form.groupName || (s.groups || "").includes(form.groupName))
  );

  function handleDateChange(dateKey: string) {
    const stillValid = slotsMatchingDate(state.slots, dateKey).some((s) => s.id === form.slotId);
    setForm((f) => ({ ...f, dateKey, slotId: stillValid ? f.slotId : slotsMatchingDate(state.slots, dateKey)[0]?.id || "" }));
  }

  function handleGroupChange(groupName: string) {
    // A different group likely means a different roster — clear picks
    // rather than carry over students who may not belong to it.
    setForm((f) => ({ ...f, groupName, studentIds: [], focusStudentIds: [] }));
  }

  function toggleStudent(id: string) {
    setForm((f) => {
      const inSession = f.studentIds.includes(id);
      return {
        ...f,
        studentIds: inSession ? f.studentIds.filter((x) => x !== id) : [...f.studentIds, id],
        focusStudentIds: inSession ? f.focusStudentIds.filter((x) => x !== id) : f.focusStudentIds,
      };
    });
  }

  function toggleFocusStudent(id: string) {
    setForm((f) => ({
      ...f,
      focusStudentIds: f.focusStudentIds.includes(id)
        ? f.focusStudentIds.filter((x) => x !== id)
        : [...f.focusStudentIds, id],
    }));
  }

  function toggleInList(key: "groupIssueTypes" | "parts" | "focusTags", value: string) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));
  }

  function next() {
    setStep((s) => Math.min(lastStep, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  // Enter inside a text input would otherwise submit the form from any
  // step — only step 6's "儲存紀錄" button should actually submit.
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && step !== lastStep && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slot = state.slots.find((s) => s.id === form.slotId);
    const teacher = state.teachers.find((t) => t.id === form.teacherId);
    const parts = [...form.parts, ...(form.partOther.trim() ? [form.partOther.trim()] : [])];
    const item: LessonRecord = {
      id: form.id || uid("record"),
      dateKey: form.dateKey,
      slotId: form.slotId,
      slotName: slot?.name || "",
      start: slot?.start || "",
      end: slot?.end || "",
      groupName: form.groupName,
      teacherId: form.teacherId,
      teacherName: teacher?.name || "",
      studentIds: selectedStudentsList.map((s) => s.id),
      studentNames: selectedStudentsList.map((s) => s.name),
      focusStudentIds: form.focusStudentIds,
      focusStudentNames: selectedStudentsList
        .filter((s) => form.focusStudentIds.includes(s.id))
        .map((s) => s.name),
      focusTags: form.focusTags,
      groupProgressStage: form.groupProgressStage,
      groupStability: form.groupStability,
      groupIssueTypes: form.groupIssueTypes,
      parts,
      content: form.content,
      progress: form.progress,
      studentStatus: form.studentStatus,
      handoff: form.handoff,
      state: form.state,
    };
    // Fire the save in the background and close right away — save() already
    // applies the change to the UI before it talks to the network.
    save("record.save", { ...item }, {
      localUpdate: (prev) => ({
        ...prev,
        records: prev.records.filter((r) => r.id !== item.id).concat([item]),
      }),
      reloadDelayMs: 1200,
    });
    closeDialogs();
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
      <div className="wizardStepper">
        {STEP_TITLES.map((_, i) => (
          <div key={i} className={`segment${i <= step ? " active" : ""}`} />
        ))}
      </div>
      <h3 className="wizardStepTitle">{step + 1}. {STEP_TITLES[step]}</h3>

      {step === 0 && (
        <div className="formGrid">
          <label className="full">日期<input type="date" value={form.dateKey} onChange={(e) => handleDateChange(e.target.value)} /></label>
          <div className="full bigChoice">
            {availableSlots.length === 0 && <div className="empty">這天沒有可選的時段。</div>}
            {availableSlots.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`choice${form.slotId === s.id ? " active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, slotId: s.id }))}
              >
                <b>{s.name}</b>
                <span className="choiceSub">{timeRange(s.start, s.end)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="formGrid">
          <label>
            老師
            <select
              value={form.teacherId}
              onChange={(e) => {
                setForm({ ...form, teacherId: e.target.value });
                saveMyTeacherId(e.target.value);
              }}
            >
              {state.teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label>
            團別
            <select value={form.groupName} onChange={(e) => handleGroupChange(e.target.value)}>
              {groupOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="studentPick">
          <div>
            <b>可選學生</b>
            <div className="studentBox">
              {availableStudentsList.length === 0 && <div className="empty">沒有可選學生。</div>}
              {availableStudentsList.map((s) => (
                <button key={s.id} type="button" className="chip" onClick={() => toggleStudent(s.id)}>{s.name}</button>
              ))}
            </div>
          </div>
          <div>
            <b>本堂學生</b>
            <div className="studentBox">
              {selectedStudentsList.length === 0 && <div className="empty">點左邊學生加入本堂課。</div>}
              {selectedStudentsList.map((s) => (
                <button key={s.id} type="button" className="chip selected" onClick={() => toggleStudent(s.id)}>{s.name} ×</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="formGrid">
          <label>
            團體進度階段
            <select value={form.groupProgressStage} onChange={(e) => setForm({ ...form, groupProgressStage: e.target.value })}>
              {progressStageOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label>
            團體穩定度
            <select value={form.groupStability} onChange={(e) => setForm({ ...form, groupStability: e.target.value })}>
              {stabilityOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="full">
            團體問題類型
            <div className="checkGrid">
              {issueOptions.map((o) => (
                <label key={o}>
                  <input type="checkbox" checked={form.groupIssueTypes.includes(o)} onChange={() => toggleInList("groupIssueTypes", o)} /> {o}
                </label>
              ))}
            </div>
          </label>
          <label className="full">
            聲部／學生
            <div className="checkGrid">
              {partOptions.map((o) => (
                <label key={o}>
                  <input type="checkbox" checked={form.parts.includes(o)} onChange={() => toggleInList("parts", o)} /> {o}
                </label>
              ))}
            </div>
          </label>
          <label className="full">其他補充<input value={form.partOther} onChange={(e) => setForm({ ...form, partOther: e.target.value })} placeholder="例如：臨時分組、高音一加強" /></label>
        </div>
      )}

      {step === 4 && (
        <div className="formGrid">
          <label className="full">
            重點學生
            <div className="studentBox">
              {selectedStudentsList.length === 0 && <div className="empty">請先在上一步選本堂學生。</div>}
              {selectedStudentsList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`chip${form.focusStudentIds.includes(s.id) ? " selected" : ""}`}
                  onClick={() => toggleFocusStudent(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </label>
          <label className="full">
            重點標記
            <div className="checkGrid">
              {focusTagOptions.map((o) => (
                <label key={o}>
                  <input type="checkbox" checked={form.focusTags.includes(o)} onChange={() => toggleInList("focusTags", o)} /> {o}
                </label>
              ))}
            </div>
          </label>
        </div>
      )}

      {step === 5 && (
        <div className="formGrid">
          <label className="full">今天教學<textarea placeholder="今天教了什麼？例如：祭典A段、節奏練習、音階練習、合奏段落" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
          <label className="full">目前進度<textarea placeholder="目前到哪個段落？完成度如何？" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} /></label>
          <label className="full">學生狀況<textarea value={form.studentStatus} onChange={(e) => setForm({ ...form, studentStatus: e.target.value })} /></label>
          <label className="full">交接<textarea placeholder="給下一位老師的提醒" value={form.handoff} onChange={(e) => setForm({ ...form, handoff: e.target.value })} /></label>
          <label>
            狀態
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
              {stateOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="wizardFoot">
        <button type="button" onClick={prev} style={{ visibility: step === 0 ? "hidden" : "visible" }}>上一步</button>
        {step < lastStep && (
          <button type="button" className="primary" onClick={next} disabled={step === 0 && !form.slotId}>下一步</button>
        )}
        {step === lastStep && <button className="primary" type="submit">儲存紀錄</button>}
      </div>
    </form>
  );
}

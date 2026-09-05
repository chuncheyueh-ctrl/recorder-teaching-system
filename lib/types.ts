export interface Teacher {
  id: string;
  name: string;
  note?: string;
}

export interface Student {
  id: string;
  name: string;
  grade?: string;
  /** Homeroom class code, e.g. "301" — one per student, managed in AppConfig.class. */
  className?: string;
  groups?: string;
  note?: string;
  /** Flagged on the 需注意學生 list (managed from 更多), surfaced on the 今日 attention card. */
  needsAttention?: boolean;
  attentionNote?: string;
}

export interface Slot {
  id: string;
  name: string;
  start: string;
  end: string;
  /** Comma-separated weekday numbers (0=Sun..6=Sat), or "all". */
  weekdays: string;
  note?: string;
}

export type AvailabilityStatus = "active" | string;

export interface Availability {
  id: string;
  dateKey: string;
  teacherId: string;
  teacherName: string;
  slotId: string;
  slotName: string;
  start: string;
  end: string;
  note?: string;
  status: AvailabilityStatus;
}

export interface LessonRecord {
  id: string;
  dateKey: string;
  slotId: string;
  slotName: string;
  start: string;
  end: string;
  groupName: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  studentNames: string[];
  focusStudentIds: string[];
  focusStudentNames: string[];
  focusTags: string[];
  groupProgressStage: string;
  groupStability: string;
  groupIssueTypes: string[];
  parts: string[];
  content: string;
  progress: string;
  studentStatus: string;
  handoff: string;
  state: string;
}

export interface CalendarEvent {
  id: string;
  dateKey: string;
  /** Last day of a multi-day event (e.g. a 9/28–10/9 registration window),
   * inclusive. Equal to dateKey for an ordinary single-day event — always
   * set (never left undefined) so range checks don't need a fallback. */
  endDateKey: string;
  title: string;
  type: string;
  start: string;
  end: string;
  location?: string;
  note?: string;
  // Performance-specific (type === "演出") — kept optional so every other
  // event type (排練/停課/行政提醒…) is unaffected.
  /** 曲目：演出要演奏的曲子清單 */
  repertoire?: string[];
  /** 服裝 */
  attire?: string;
  /** 集合時間，通常早於表演開始時間 */
  callTime?: string;
  /** 集合地點，可能跟表演地點不同 */
  callLocation?: string;
  /** 參演團別 */
  performingGroups?: string[];
}

export interface AppConfig {
  group?: string[];
  /** Which sub-category (see GROUP_CATEGORIES) each group name belongs to, for display grouping in 團別管理 — not used for matching/filtering elsewhere. */
  groupCategory?: Record<string, string>;
  class?: string[];
  state?: string[];
  eventType?: string[];
  /** Which color (see lib/event-colors.ts) each event type is drawn with on 行事曆. */
  eventTypeColor?: Record<string, string>;
  issue?: string[];
  part?: string[];
  focus?: string[];
  progressStage?: string[];
  stability?: string[];
  /** Free-text status notes on the 今日 attention card — teachers write
   * what actually happened ("祭典全團速度130"), not a lesson-count stat. */
  weekProgressNote?: string;
  monthProgressNote?: string;
}

export interface AppState {
  dateKey: string;
  weekStart: string;
  month: string;
  teachers: Teacher[];
  students: Student[];
  slots: Slot[];
  availability: Availability[];
  records: LessonRecord[];
  events: CalendarEvent[];
  config: AppConfig;
}

export type PageKey = "today" | "records" | "calendar" | "analytics" | "more";

export type EntityTable = "teachers" | "students" | "slots" | "availability" | "records" | "events";

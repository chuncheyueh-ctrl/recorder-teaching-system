export interface Teacher {
  id: string;
  name: string;
  note?: string;
}

export interface Student {
  id: string;
  name: string;
  grade?: string;
  groups?: string;
  note?: string;
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
  title: string;
  type: string;
  start: string;
  end: string;
  location?: string;
  note?: string;
}

export interface AppConfig {
  group?: string[];
  state?: string[];
  eventType?: string[];
  issue?: string[];
  part?: string[];
  focus?: string[];
  progressStage?: string[];
  stability?: string[];
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

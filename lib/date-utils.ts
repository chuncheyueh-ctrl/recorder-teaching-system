function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The backend is supposed to send dateKey as "YYYY-MM-DD", but some Apps
 * Script paths return a raw serialized Date instead (e.g.
 * "2026-09-01T16:00:00.000Z" for local midnight 9/2) — records written
 * through those paths otherwise silently fail to match anything by date.
 * Reparsing as a local Date and reformatting recovers the intended day.
 */
export function normalizeDateKey(raw: string | undefined): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return toDateKey(d);
}

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];

export function zhWeek(d: Date): string {
  return WEEKDAY_ZH[d.getDay()];
}

export function displayDate(key: string): string {
  const d = parseDate(key);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${zhWeek(d)}）`;
}

export function mdWeek(key: string): string {
  const d = parseDate(key);
  return `${d.getMonth() + 1}/${d.getDate()}（${zhWeek(d)}）`;
}

export function monday(key: string): string {
  const d = parseDate(key);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

export function addDays(key: string, n: number): string {
  const d = parseDate(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function weekDates(key: string): string[] {
  const start = monday(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function timeRange(a?: string, b?: string): string {
  return `${a || ""}${b ? "–" + b : ""}`;
}

/** Same check as weekdayOk, but against a bare weekday number (0=Sun..6=Sat)
 *  instead of a specific date — useful when working from a recurring
 *  weekday pattern rather than an actual calendar date. */
export function weekdayOkNum(slot: { weekdays?: string }, weekday: number): boolean {
  const w = String(slot.weekdays || "all");
  if (w === "none") return false;
  if (!w || w === "all" || w === "每天") return true;
  return w.split(",").includes(String(weekday));
}

export function weekdayOk(slot: { weekdays?: string }, dateKey: string): boolean {
  return weekdayOkNum(slot, parseDate(dateKey).getDay());
}

/** All "YYYY-MM-DD" dates in a "YYYY-MM" month. */
export function monthDates(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${monthKey}-${pad(i + 1)}`);
}

/** Shift a "YYYY-MM" month key by n months. */
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * A month laid out as calendar weeks (Sun..Sat columns), padded with null
 * on either end so every row has exactly 7 cells and column index always
 * equals weekday (0=Sun..6=Sat).
 */
export function calendarWeeks(monthKey: string): (string | null)[][] {
  const days = monthDates(monthKey);
  const firstWeekday = parseDate(days[0]).getDay();
  const cells: (string | null)[] = [...Array(firstWeekday).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Slots (or any weekdays-bearing list) applicable on the given date. */
export function slotsForDate<T extends { weekdays?: string }>(slots: T[], dateKey: string): T[] {
  return slots.filter((s) => weekdayOk(s, dateKey));
}

const WEEKDAY_LABEL_MAP: Record<string, string> = {
  "0": "週日",
  "1": "週一",
  "2": "週二",
  "3": "週三",
  "4": "週四",
  "5": "週五",
  "6": "週六",
};

export function weekdayLabel(value?: string): string {
  const s = String(value || "all");
  if (s === "none") return "未設定適用日";
  if (s === "all" || s === "每天" || s === "") return "每天";
  return s
    .split(",")
    .filter(Boolean)
    .map((x) => WEEKDAY_LABEL_MAP[x] || x)
    .join("、");
}

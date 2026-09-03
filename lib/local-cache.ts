import type { ApiGetResult } from "./api";

const SNAPSHOT_KEY = "recorder_today_snapshot_v1";

interface StoredSnapshot {
  dateKey: string;
  data: ApiGetResult;
}

/**
 * A small localStorage cache of the last-fetched "today" so a fresh page
 * load can paint real data immediately instead of blank cards while the
 * (often 1-2s) Apps Script round trip is still in flight. Only "today" is
 * persisted — that's the view almost every session starts on.
 */
export function loadTodaySnapshot(): StoredSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSnapshot;
  } catch {
    return null;
  }
}

export function saveTodaySnapshot(dateKey: string, data: ApiGetResult) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ dateKey, data }));
  } catch {
    // Quota exceeded or storage disabled (e.g. private browsing) — this is
    // purely a speed optimization, so just skip caching rather than fail.
  }
}

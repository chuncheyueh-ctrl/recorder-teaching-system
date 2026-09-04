const KEY = "recorder_my_teacher_id_v1";

/**
 * Which teacher this device belongs to, so the teacher picker in the
 * record/availability dialogs can default to "probably you" instead of
 * always resetting to the first row — no login, just a per-device guess
 * that's easy to overrule from the same dropdown it prefills.
 */
export function loadMyTeacherId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function saveMyTeacherId(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage disabled (e.g. private browsing) — purely a convenience, skip it.
  }
}

export function pickDefaultTeacherId(teachers: { id: string }[]): string {
  const remembered = loadMyTeacherId();
  if (remembered && teachers.some((t) => t.id === remembered)) return remembered;
  return teachers[0]?.id || "";
}

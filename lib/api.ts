import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Availability, AppConfig, AppState, EntityTable } from "./types";
import { addDays, monday } from "./date-utils";

// Records need to cover three different windows at once: the exact 7-day
// week (for 紀錄 and record editing), the whole month (for 本月進度 on the
// 今日 attention card), and yesterday specifically (for 昨天未參與學生,
// which falls outside the month range on the 1st of the month). Widening a
// single range to the union of all three keeps this one query correct for
// all of them instead of juggling separate fetches.
function recordsRange(dateKey: string): { start: string; end: string } {
  const weekStart = monday(dateKey);
  const weekEnd = addDays(weekStart, 6);
  const month = dateKey.slice(0, 7);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  const yesterday = addDays(dateKey, -1);
  return {
    start: [weekStart, monthStart, yesterday].sort()[0],
    end: [weekEnd, monthEnd, yesterday].sort().slice(-1)[0],
  };
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

// Seeded the first time each field is actually needed — a fresh Firestore
// project has no config/app doc yet, and without these the group/event-type
// pickers would render empty until someone edits them by hand.
const DEFAULT_CONFIG: Required<AppConfig> = {
  group: ["初階", "中階", "大團", "社團課", "個別加強", "其他"],
  groupCategory: {},
  // No sensible universal default — class codes are entirely school-specific
  // and are meant to be seeded through 班級管理 (or an import) instead.
  class: [],
  state: ["未完成", "部分完成", "已完成"],
  eventType: ["練習", "社團課", "加練", "考試／考核", "演出", "停課", "行政提醒", "其他"],
  issue: ["節奏", "音準", "指法", "換氣", "音色", "速度", "合奏聆聽", "看譜", "專注度"],
  part: ["高音笛一部", "高音笛二部", "中音笛", "次中音笛", "低音笛", "個別學生", "臨時分組", "其他"],
  focus: ["跟不上", "節奏問題", "音準問題", "指法問題", "需要個別指導", "注意力不穩", "表現突出", "可帶領"],
  progressStage: ["未開始", "練習中", "可慢速完成", "可跟節拍器完成", "可合奏", "可演出"],
  stability: ["很不穩定", "偶爾成功", "多數可完成", "穩定完成"],
};

export interface ApiGetResult extends Partial<AppState> {
  ok: boolean;
  message?: string;
}

function withId<T>(id: string, data: unknown): T {
  // doc.id is the source of truth for id — spread first so a stray/stale
  // `id` field stored in the document itself can never win.
  return { ...(data as object), id } as T;
}

export async function apiGet(dateKey: string): Promise<ApiGetResult> {
  try {
    const weekStart = monday(dateKey);
    const weekEnd = addDays(weekStart, 6);
    const month = dateKey.slice(0, 7);
    const recordsWindow = recordsRange(dateKey);

    // Events aren't fetched by month like records/availability — 表演中心
    // needs to show upcoming performances regardless of which month is
    // currently in view, and the collection stays small (a handful of
    // performances/rehearsals a year, not one row per day) either way.
    const [teachersSnap, studentsSnap, slotsSnap, availabilitySnap, recordsSnap, eventsSnap, configSnap] =
      await Promise.all([
        getDocs(collection(db, "teachers")),
        getDocs(collection(db, "students")),
        getDocs(collection(db, "slots")),
        getDocs(query(collection(db, "availability"), where("dateKey", ">=", weekStart), where("dateKey", "<=", weekEnd))),
        getDocs(query(collection(db, "records"), where("dateKey", ">=", recordsWindow.start), where("dateKey", "<=", recordsWindow.end))),
        getDocs(collection(db, "events")),
        getDoc(doc(db, "config", "app")),
      ]);

    return {
      ok: true,
      dateKey,
      weekStart,
      month,
      teachers: teachersSnap.docs.map((d) => withId(d.id, d.data())),
      students: studentsSnap.docs.map((d) => withId(d.id, d.data())),
      slots: slotsSnap.docs.map((d) => withId(d.id, d.data())),
      availability: availabilitySnap.docs.map((d) => withId(d.id, d.data())),
      records: recordsSnap.docs.map((d) => withId(d.id, d.data())),
      events: eventsSnap.docs.map((d) => withId(d.id, d.data())),
      config: { ...DEFAULT_CONFIG, ...(configSnap.exists() ? (configSnap.data() as AppConfig) : {}) },
    };
  } catch (e) {
    return { ok: false, message: String(e instanceof Error ? e.message : e) };
  }
}

// Firestore keeps every query above "live" for free — subscribe instead of
// polling so a change made on one device (web, another phone, …) shows up
// on every other open device without anyone having to reload.
export function subscribeToChanges(dateKey: string, onChange: () => void): () => void {
  const weekStart = monday(dateKey);
  const weekEnd = addDays(weekStart, 6);
  const recordsWindow = recordsRange(dateKey);

  const unsubscribers = [
    onSnapshot(collection(db, "teachers"), onChange),
    onSnapshot(collection(db, "students"), onChange),
    onSnapshot(collection(db, "slots"), onChange),
    onSnapshot(
      query(collection(db, "availability"), where("dateKey", ">=", weekStart), where("dateKey", "<=", weekEnd)),
      onChange
    ),
    onSnapshot(
      query(collection(db, "records"), where("dateKey", ">=", recordsWindow.start), where("dateKey", "<=", recordsWindow.end)),
      onChange
    ),
    onSnapshot(collection(db, "events"), onChange),
    onSnapshot(doc(db, "config", "app"), onChange),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export interface ApiPostResult {
  ok: boolean;
  message?: string;
  [key: string]: unknown;
}

// "teacher.save" -> "teachers", "record.delete" -> "records", etc. — the
// dialogs already speak this convention (see save()/remove() call sites).
const ENTITY_COLLECTION: Record<string, EntityTable> = {
  teacher: "teachers",
  student: "students",
  slot: "slots",
  record: "records",
  event: "events",
};

interface AvailabilityEntry {
  dateKey: string;
  slotId: string;
}

// Fetch by teacherId alone and filter the date range client-side — an
// equality filter combined with a range filter on a different field needs a
// composite index, which doesn't exist here, and one teacher's availability
// set is small enough that this is cheap either way.
export async function getTeacherAvailability(teacherId: string, start: string, end: string): Promise<Availability[]> {
  const snap = await getDocs(query(collection(db, "availability"), where("teacherId", "==", teacherId)));
  return snap.docs
    .map((d) => withId<Availability>(d.id, d.data()))
    .filter((a) => a.dateKey >= start && a.dateKey <= end);
}

// Teachers fill in a whole month's grid (slot x weekday) at once — replace
// every existing entry across that date range for this teacher, rather than
// one day at a time.
async function batchSaveAvailability(payload: Record<string, unknown>): Promise<ApiPostResult> {
  const periodStart = String(payload.periodStart || "");
  const periodEnd = String(payload.periodEnd || "");
  const teacherId = String(payload.teacherId || "");
  const teacherName = String(payload.teacherName || "");
  const note = String(payload.note || "");
  const entries = Array.isArray(payload.entries) ? (payload.entries as AvailabilityEntry[]) : [];
  if (!periodStart || !periodEnd || !teacherId) return { ok: false, message: "缺少月份或老師" };

  const existing = await getDocs(query(collection(db, "availability"), where("teacherId", "==", teacherId)));
  const toDelete = existing.docs.filter((d) => {
    const dateKey = (d.data() as { dateKey?: string }).dateKey || "";
    return dateKey >= periodStart && dateKey <= periodEnd;
  });
  const slotIds = Array.from(new Set(entries.map((e) => e.slotId)));
  const slotDocs = await Promise.all(slotIds.map((slotId) => getDoc(doc(db, "slots", slotId))));
  const slotById = new Map(
    slotDocs.filter((snap) => snap.exists()).map((snap) => [snap.id, snap.data() as { name: string; start: string; end: string }])
  );

  const batch = writeBatch(db);
  toDelete.forEach((d) => batch.delete(d.ref));
  entries.forEach(({ dateKey, slotId }) => {
    const slot = slotById.get(slotId);
    if (!slot) return;
    const id = uid("avail");
    batch.set(doc(db, "availability", id), {
      id,
      dateKey,
      teacherId,
      teacherName,
      slotId,
      slotName: slot.name,
      start: slot.start,
      end: slot.end,
      note,
      status: "active",
    });
  });
  await batch.commit();
  return { ok: true, action: "availability.batchSave" };
}

interface ClassPromotion {
  id: string;
  className: string;
}

// End-of-year "everyone moves up a grade, same homeroom number" shortcut
// (301 -> 401, etc). Writes every student's new className and unions in any
// newly-introduced class codes in one batch so a half-applied promotion
// can't happen. arrayUnion (not a full array overwrite) so this can't race
// against someone else's edit to the class-code list either.
async function promoteStudentClasses(payload: Record<string, unknown>): Promise<ApiPostResult> {
  const updates = Array.isArray(payload.updates) ? (payload.updates as ClassPromotion[]) : [];
  if (updates.length === 0) return { ok: false, message: "沒有需要更新的學生" };
  const newClassCodes = Array.isArray(payload.newClassCodes) ? (payload.newClassCodes as string[]) : [];

  const batch = writeBatch(db);
  updates.forEach(({ id, className }) => {
    batch.set(doc(db, "students", id), { className }, { merge: true });
  });
  if (newClassCodes.length > 0) {
    batch.set(doc(db, "config", "app"), { class: arrayUnion(...newClassCodes) }, { merge: true });
  }
  await batch.commit();
  return { ok: true, action: "student.promoteClasses" };
}

// Two teachers can independently add/remove a group or class code around
// the same moment — arrayUnion/arrayRemove are atomic on Firestore's side,
// unlike config.save's whole-array overwrite, so neither edit can silently
// clobber the other's.
async function addConfigItem(payload: Record<string, unknown>): Promise<ApiPostResult> {
  const key = String(payload.key || "");
  const value = String(payload.value || "");
  const category = payload.category ? String(payload.category) : undefined;
  if (!key || !value) return { ok: false, message: "缺少參數" };
  const data: Record<string, unknown> = { [key]: arrayUnion(value) };
  // Firestore's setDoc merge deep-merges nested maps, so this only ever
  // touches this one key inside groupCategory, not the whole map.
  if (key === "group" && category) data.groupCategory = { [value]: category };
  await setDoc(doc(db, "config", "app"), data, { merge: true });
  return { ok: true, action: "config.addItem" };
}

async function removeConfigItem(payload: Record<string, unknown>): Promise<ApiPostResult> {
  const key = String(payload.key || "");
  const value = String(payload.value || "");
  if (!key || !value) return { ok: false, message: "缺少參數" };
  await setDoc(doc(db, "config", "app"), { [key]: arrayRemove(value) }, { merge: true });
  return { ok: true, action: "config.removeItem" };
}

// Renaming a class/group has to cascade to every student that references
// the old string — className is a plain field, groups is a comma-joined
// string — or those students would silently fall out of that class/group
// the moment the label changed underneath them.
async function renameConfigItem(payload: Record<string, unknown>): Promise<ApiPostResult> {
  const key = String(payload.key || "");
  const oldValue = String(payload.oldValue || "");
  const newValue = String(payload.newValue || "");
  if (!key || !oldValue || !newValue) return { ok: false, message: "缺少參數" };
  if (oldValue === newValue) return { ok: true, action: "config.renameItem" };

  const configSnap = await getDoc(doc(db, "config", "app"));
  const currentList = ((configSnap.data() as Record<string, string[]> | undefined)?.[key]) || [];
  if (currentList.includes(newValue)) return { ok: false, message: `「${newValue}」已經存在` };
  const nextList = currentList.map((v) => (v === oldValue ? newValue : v));

  const batch = writeBatch(db);
  const configUpdate: Record<string, unknown> = { [key]: nextList };
  if (key === "group") {
    const categories = (configSnap.data() as { groupCategory?: Record<string, string> } | undefined)?.groupCategory || {};
    if (categories[oldValue]) configUpdate.groupCategory = { [newValue]: categories[oldValue] };
  }
  batch.set(doc(db, "config", "app"), configUpdate, { merge: true });

  if (key === "class") {
    const affected = await getDocs(query(collection(db, "students"), where("className", "==", oldValue)));
    affected.docs.forEach((d) => batch.set(d.ref, { className: newValue }, { merge: true }));
  } else if (key === "group") {
    const allStudents = await getDocs(collection(db, "students"));
    allStudents.docs.forEach((d) => {
      const groups = ((d.data() as { groups?: string }).groups || "").split(",").map((g) => g.trim()).filter(Boolean);
      if (!groups.includes(oldValue)) return;
      const nextGroups = groups.map((g) => (g === oldValue ? newValue : g)).join(",");
      batch.set(d.ref, { groups: nextGroups }, { merge: true });
    });
  }

  await batch.commit();
  return { ok: true, action: "config.renameItem" };
}

export async function apiPost(payload: Record<string, unknown>): Promise<ApiPostResult> {
  const action = String(payload.action || "");
  try {
    if (action === "availability.batchSave") {
      return await batchSaveAvailability(payload);
    }

    if (action === "student.promoteClasses") {
      return await promoteStudentClasses(payload);
    }

    if (action === "config.addItem") {
      return await addConfigItem(payload);
    }

    if (action === "config.removeItem") {
      return await removeConfigItem(payload);
    }

    if (action === "config.renameItem") {
      return await renameConfigItem(payload);
    }

    if (action === "config.save") {
      // Merge rather than overwrite — this doc also holds state/eventType/etc,
      // and a group-list edit shouldn't touch fields it doesn't know about.
      const data = { ...payload };
      delete data.action;
      delete data.requestId;
      await setDoc(doc(db, "config", "app"), data, { merge: true });
      return { ok: true, action };
    }

    const [entity, verb] = action.split(".");
    const collectionName = ENTITY_COLLECTION[entity];
    if (!collectionName) return { ok: false, message: "不支援的操作：" + action };

    const id = String(payload.id || "");
    if (!id) return { ok: false, message: "缺少 id" };

    if (verb === "save") {
      // action/requestId are call metadata, not document fields.
      const data = { ...payload };
      delete data.action;
      delete data.requestId;
      await setDoc(doc(db, collectionName, id), data);
      return { ok: true, action, id };
    }
    if (verb === "delete") {
      await deleteDoc(doc(db, collectionName, id));
      return { ok: true, action, id };
    }
    return { ok: false, message: "不支援的操作：" + action };
  } catch (e) {
    return { ok: false, message: String(e instanceof Error ? e.message : e) };
  }
}

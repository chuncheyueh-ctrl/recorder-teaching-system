"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppState, EntityTable, PageKey } from "@/lib/types";
import { apiGet, apiPost, subscribeToChanges, type ApiGetResult } from "@/lib/api";
import { normalizeDateKey, toDateKey } from "@/lib/date-utils";
import { loadTodaySnapshot, saveTodaySnapshot } from "@/lib/local-cache";

// The backend doesn't always send dateKey as a plain "YYYY-MM-DD" string —
// normalize every date-keyed entity on the way in so the rest of the app
// can keep comparing dateKey by exact string match.
function normalizeApiResult(data: ApiGetResult): ApiGetResult {
  return {
    ...data,
    records: data.records?.map((r) => ({ ...r, dateKey: normalizeDateKey(r.dateKey) })),
    availability: data.availability?.map((a) => ({ ...a, dateKey: normalizeDateKey(a.dateKey) })),
    events: data.events?.map((e) => ({ ...e, dateKey: normalizeDateKey(e.dateKey) })),
  };
}

interface ToastState {
  message: string;
  visible: boolean;
}

function emptyState(): AppState {
  return {
    // Left blank so server and client render the same initial markup — a
    // client-only effect fills in "today" right after mount (see below).
    dateKey: "",
    weekStart: "",
    month: "",
    teachers: [],
    students: [],
    slots: [],
    availability: [],
    records: [],
    events: [],
    config: {},
  };
}

interface SaveOptions {
  /** Apply immediately to local state (optimistic update) before the server confirms. */
  localUpdate?: (state: AppState) => AppState;
  /** Re-fetch canonical data from the server after this many ms. */
  reloadDelayMs?: number;
}

export interface RecordDialogTarget {
  slotId?: string;
  recordId?: string;
}

interface DialogsState {
  record: RecordDialogTarget | null;
  availability: boolean;
  teacher: { id?: string } | null;
  student: { id?: string } | null;
  slot: { id?: string } | null;
  event: { id?: string } | null;
}

const CLOSED_DIALOGS: DialogsState = {
  record: null,
  availability: false,
  teacher: null,
  student: null,
  slot: null,
  event: null,
};

interface AppStateContextValue {
  state: AppState;
  page: PageKey;
  setPage: (p: PageKey) => void;
  loading: boolean;
  changeDate: (key: string) => void;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  toastState: ToastState;
  toast: (message: string) => void;
  save: (action: string, payload: Record<string, unknown>, options?: SaveOptions) => Promise<boolean>;
  remove: (table: EntityTable, action: string, id: string) => Promise<boolean>;
  dialogs: DialogsState;
  openRecordDialog: (target?: RecordDialogTarget) => void;
  openAvailabilityDialog: () => void;
  openTeacherDialog: (id?: string) => void;
  openStudentDialog: (id?: string) => void;
  openSlotDialog: (id?: string) => void;
  openEventDialog: (id?: string) => void;
  closeDialogs: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => emptyState());
  const [page, setPage] = useState<PageKey>("today");
  const [loading, setLoading] = useState(false);
  const [toastState, setToastState] = useState<ToastState>({ message: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateKeyRef = useRef(state.dateKey);
  useEffect(() => {
    dateKeyRef.current = state.dateKey;
  }, [state.dateKey]);

  // Every GET this session, keyed by date — revisiting a date renders
  // instantly from cache while a silent refresh confirms it in the
  // background, instead of re-paying the ~1-2s Apps Script round trip.
  const dayCache = useRef(new Map<string, ApiGetResult>());

  const toast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ message, visible: true });
    toastTimer.current = setTimeout(() => setToastState((s) => ({ ...s, visible: false })), 2200);
  }, []);

  const refresh = useCallback(async (opts: { silent?: boolean } = {}) => {
    const forDate = dateKeyRef.current;
    setLoading(true);
    if (!opts.silent) toast("讀取中");
    try {
      const raw = await apiGet(forDate);
      if (!raw.ok) {
        if (!opts.silent) toast("讀取失敗：" + (raw.message || ""));
        return;
      }
      const data = normalizeApiResult(raw);
      dayCache.current.set(forDate, data);
      if (forDate === toDateKey(new Date())) saveTodaySnapshot(forDate, data);
      // The date may have moved on again while this was in flight — only
      // apply the response if it still matches what's being viewed.
      if (dateKeyRef.current === forDate) {
        setState((prev) => ({ ...prev, ...data, dateKey: forDate }));
      }
    } catch (e) {
      if (!opts.silent) toast("讀取失敗：" + String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!state.dateKey) return;
    const cached = dayCache.current.get(state.dateKey);
    queueMicrotask(() => refresh({ silent: !!cached }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dateKey]);

  // Live sync: any change to the currently-in-scope data — from this
  // device or another one entirely (another browser tab, another
  // teacher's phone) — re-pulls fresh data so nobody has to manually
  // reload to see someone else's edit.
  useEffect(() => {
    if (!state.dateKey) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToChanges(state.dateKey, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refresh({ silent: true }), 400);
    });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dateKey]);

  const changeDate = useCallback((key: string) => {
    setState((prev) => {
      const cached = dayCache.current.get(key);
      if (cached) return { ...prev, ...cached, dateKey: key };
      // No cache yet for this date — drop the previous date's day-specific
      // data immediately so it can't be mistaken for the new date's while
      // the real fetch is in flight.
      return { ...prev, dateKey: key, availability: [], records: [] };
    });
  }, []);

  // Client-only: fill in "today" once mounted, after server and client have
  // agreed on the same blank initial render. If a snapshot from a previous
  // visit exists for today, seed the cache with it first so this first
  // render already shows real data instead of empty cards.
  useEffect(() => {
    queueMicrotask(() => {
      const today = toDateKey(new Date());
      const snapshot = loadTodaySnapshot();
      if (snapshot && snapshot.dateKey === today) {
        dayCache.current.set(today, snapshot.data);
      }
      changeDate(today);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (action: string, payload: Record<string, unknown>, options: SaveOptions = {}) => {
      // Apply the change to the UI immediately — don't make the teacher
      // wait through an Apps Script round trip just to see their own edit.
      // The actual write happens in the background below.
      if (options.localUpdate) {
        setState((prev) => {
          const next = options.localUpdate!(prev);
          const snapshot: ApiGetResult = { ...next, ok: true };
          dayCache.current.set(next.dateKey, snapshot);
          if (next.dateKey === toDateKey(new Date())) saveTodaySnapshot(next.dateKey, snapshot);
          return next;
        });
      }
      toast("已儲存");

      const res = await apiPost({ action, ...payload });
      if (!res.ok) {
        // The optimistic update didn't actually make it to the sheet —
        // say so and pull canonical data back down to undo it.
        toast("寫入失敗：" + (res.message || "未知錯誤") + "，已還原");
        refresh();
        return false;
      }
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(refresh, options.reloadDelayMs ?? 1200);
      return true;
    },
    [toast, refresh]
  );

  const remove = useCallback(
    async (table: EntityTable, action: string, id: string) => {
      return save(action, { id }, {
        localUpdate: (prev) => ({ ...prev, [table]: (prev[table] as { id: string }[]).filter((x) => x.id !== id) }),
      });
    },
    [save]
  );

  const [dialogs, setDialogs] = useState<DialogsState>(CLOSED_DIALOGS);
  const closeDialogs = useCallback(() => setDialogs(CLOSED_DIALOGS), []);
  const openRecordDialog = useCallback(
    (target: RecordDialogTarget = {}) => setDialogs({ ...CLOSED_DIALOGS, record: target }),
    []
  );
  const openAvailabilityDialog = useCallback(() => setDialogs({ ...CLOSED_DIALOGS, availability: true }), []);
  const openTeacherDialog = useCallback((id?: string) => setDialogs({ ...CLOSED_DIALOGS, teacher: { id } }), []);
  const openStudentDialog = useCallback((id?: string) => setDialogs({ ...CLOSED_DIALOGS, student: { id } }), []);
  const openSlotDialog = useCallback((id?: string) => setDialogs({ ...CLOSED_DIALOGS, slot: { id } }), []);
  const openEventDialog = useCallback((id?: string) => setDialogs({ ...CLOSED_DIALOGS, event: { id } }), []);

  const value = useMemo(
    () => ({
      state,
      page,
      setPage,
      loading,
      changeDate,
      refresh,
      toastState,
      toast,
      save,
      remove,
      dialogs,
      openRecordDialog,
      openAvailabilityDialog,
      openTeacherDialog,
      openStudentDialog,
      openSlotDialog,
      openEventDialog,
      closeDialogs,
    }),
    [
      state,
      page,
      loading,
      changeDate,
      refresh,
      toastState,
      toast,
      save,
      remove,
      dialogs,
      openRecordDialog,
      openAvailabilityDialog,
      openTeacherDialog,
      openStudentDialog,
      openSlotDialog,
      openEventDialog,
      closeDialogs,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

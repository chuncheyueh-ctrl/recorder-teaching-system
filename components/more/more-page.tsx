"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  GripVertical,
  Layers,
  Palette,
  Pencil,
  Plus,
  Star,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { timeRange, weekdayLabel } from "@/lib/date-utils";
import { PerformanceCenter } from "@/components/performances/performance-center";
import { AttentionManager } from "@/components/attention/attention-manager";
import { EventTypeManager } from "@/components/calendar/event-type-manager";
import type { Student } from "@/lib/types";

type SectionKey = "teachers" | "students" | "slots" | "class" | "group" | "performances" | "attention" | "eventTypes";

const GROUP_CATEGORIES = [
  { key: "team", label: "團別" },
  { key: "part", label: "聲部" },
  { key: "club", label: "社團" },
  { key: "personal", label: "個別加強" },
];

const SECTION_KEYS: SectionKey[] = ["teachers", "students", "slots", "class", "group", "performances", "attention", "eventTypes"];

interface MenuGroup {
  title: string;
  items: {
    key: SectionKey;
    label: string;
    icon: React.ReactNode;
    tone: "green" | "purple" | "blue" | "red" | "yellow";
    count: number;
    unit: string;
  }[];
}

export function MorePage() {
  const { state, requestedMoreSection, clearRequestedMoreSection } = useAppState();
  const [section, setSection] = useState<SectionKey | null>(null);

  // A link elsewhere in the app (e.g. 行事曆's "查看表演中心") can ask 更多
  // to land directly on a specific section instead of the menu.
  useEffect(() => {
    if (!requestedMoreSection) return;
    queueMicrotask(() => {
      if ((SECTION_KEYS as string[]).includes(requestedMoreSection)) {
        setSection(requestedMoreSection as SectionKey);
      }
      clearRequestedMoreSection();
    });
  }, [requestedMoreSection, clearRequestedMoreSection]);

  const groups: MenuGroup[] = [
    {
      title: "人員",
      items: [
        { key: "teachers", label: "老師管理", icon: <Users size={20} />, tone: "green", count: state.teachers.length, unit: "位" },
        { key: "students", label: "學生管理", icon: <GraduationCap size={20} />, tone: "purple", count: state.students.length, unit: "位" },
        { key: "attention", label: "需注意學生", icon: <AlertCircle size={20} />, tone: "red", count: state.students.filter((s) => s.needsAttention).length, unit: "位" },
      ],
    },
    {
      title: "課程設定",
      items: [
        { key: "slots", label: "時段管理", icon: <CalendarClock size={20} />, tone: "blue", count: state.slots.length, unit: "個" },
        { key: "class", label: "班級管理", icon: <Layers size={20} />, tone: "red", count: (state.config.class || []).length, unit: "個" },
        { key: "group", label: "團別管理", icon: <Tag size={20} />, tone: "red", count: (state.config.group || []).length, unit: "個" },
      ],
    },
    {
      title: "活動",
      items: [
        { key: "performances", label: "表演中心", icon: <Star size={20} />, tone: "yellow", count: state.events.filter((e) => e.type === "演出").length, unit: "場" },
        { key: "eventTypes", label: "活動類別", icon: <Palette size={20} />, tone: "red", count: (state.config.eventType || []).length, unit: "個" },
      ],
    },
  ];

  if (section) {
    const label = groups.flatMap((g) => g.items).find((i) => i.key === section)?.label || "";
    return (
      <div className="grid">
        <button type="button" className="moreBackBar" onClick={() => setSection(null)}>
          <ChevronLeft size={18} /> 返回
          <span className="moreBackTitle">{label}</span>
        </button>
        {section === "teachers" && <TeacherManager />}
        {section === "students" && <StudentManager />}
        {section === "slots" && <SlotManager />}
        {section === "class" && (
          <ConfigListManager
            configKey="class"
            title="班級管理"
            icon={<Layers size={20} />}
            placeholder="例如：601"
            emptyHint="尚無班級，新增後就能在學生資料裡用下拉選單指定。"
            countUsage={(state, name) => state.students.filter((s) => s.className === name).length}
            usageNoun="位學生屬於這個班級"
          />
        )}
        {section === "group" && (
          <ConfigListManager
            configKey="group"
            title="團別管理"
            icon={<Tag size={20} />}
            placeholder="例如：中階"
            emptyHint="尚無團別，新增後就能在學生資料裡用勾選指定。"
            countUsage={(state, name) => state.students.filter((s) => (s.groups || "").includes(name)).length}
            usageNoun="位學生屬於這個團別"
            categories={GROUP_CATEGORIES}
          />
        )}
        {section === "performances" && <PerformanceCenter />}
        {section === "attention" && <AttentionManager />}
        {section === "eventTypes" && <EventTypeManager />}
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        {groups.map((g, i) => (
          <div key={g.title} className="moreMenuGroup" style={i > 0 ? { marginTop: 22 } : undefined}>
            <div className="moreMenuGroupTitle">{g.title}</div>
            <div className="list" style={{ marginTop: 10 }}>
              {g.items.map((item) => (
                <button key={item.key} type="button" className="moreMenuRow" onClick={() => setSection(item.key)}>
                  <div className={`badgeCircle ${item.tone}`}>{item.icon}</div>
                  <span className="moreMenuLabel">{item.label}</span>
                  <span className="sub">{item.count} {item.unit}</span>
                  <ChevronRight size={18} className="moreMenuChevron" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherManager() {
  const { state, openTeacherDialog, remove } = useAppState();

  async function deleteTeacher(id: string) {
    if (confirm("刪除老師？")) await remove("teachers", "teacher.delete", id);
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle green"><Users size={20} /></div>
        <div className="sectionText">
          <h2>老師管理</h2>
          <div className="sub">共 {state.teachers.length} 位</div>
        </div>
        <button className="linkPill green" onClick={() => openTeacherDialog()}>
          <Plus size={14} /> 新增
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {state.teachers.length === 0 && <div className="empty">尚無老師。</div>}
        {state.teachers.map((t) => (
          <div className="item row" key={t.id}>
            <div>
              <b>{t.name}</b>
              <div className="sub">{t.note || ""}</div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="small" type="button" onClick={() => openTeacherDialog(t.id)}><Pencil size={14} /></button>
              <button className="small danger" type="button" onClick={() => deleteTeacher(t.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotManager() {
  const { state, openSlotDialog, remove } = useAppState();

  async function deleteSlot(id: string) {
    if (confirm("刪除時段？")) await remove("slots", "slot.delete", id);
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle blue"><CalendarClock size={20} /></div>
        <div className="sectionText">
          <h2>時段管理</h2>
          <div className="sub">共 {state.slots.length} 個</div>
        </div>
        <button className="linkPill blue" onClick={() => openSlotDialog()}>
          <Plus size={14} /> 新增
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {state.slots.length === 0 && <div className="empty">尚無時段。</div>}
        {state.slots.map((s) => (
          <div className="item row" key={s.id}>
            <div>
              <b>{s.name}</b>
              <div className="sub">{timeRange(s.start, s.end)}｜{weekdayLabel(s.weekdays)}</div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="small" type="button" onClick={() => openSlotDialog(s.id)}><Pencil size={14} /></button>
              <button className="small danger" type="button" onClick={() => deleteSlot(s.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClassGroup {
  code: string;
  students: Student[];
}

interface GradeGroup {
  grade: string;
  label: string;
  classes: ClassGroup[];
  total: number;
}

// Class codes follow the school's own "301, 302, …" convention (see the
// 班級管理 placeholder) — the leading digit is the grade, so grade-level
// grouping can be derived from it instead of needing a separate field.
const GRADE_LABELS: Record<string, string> = {
  "1": "一年級",
  "2": "二年級",
  "3": "三年級",
  "4": "四年級",
  "5": "五年級",
  "6": "六年級",
};

function gradeOfClassName(className: string): string {
  return /^[1-6]\d{2}$/.test(className) ? className[0] : "";
}

function groupByClass(students: Student[]): ClassGroup[] {
  const byCode = new Map<string, Student[]>();
  for (const s of students) {
    const code = s.className || "";
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(s);
  }
  const sortByName = (list: Student[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const codes = Array.from(byCode.keys()).filter((c) => c !== "").sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const groups = codes.map((code) => ({ code, students: sortByName(byCode.get(code)!) }));
  const unassigned = byCode.get("");
  if (unassigned) groups.push({ code: "", students: sortByName(unassigned) });
  return groups;
}

function groupByGrade(students: Student[]): GradeGroup[] {
  const classGroups = groupByClass(students);
  const byGrade = new Map<string, ClassGroup[]>();
  for (const cg of classGroups) {
    const grade = cg.code ? gradeOfClassName(cg.code) : "";
    if (!byGrade.has(grade)) byGrade.set(grade, []);
    byGrade.get(grade)!.push(cg);
  }
  const gradeKeys = Array.from(byGrade.keys()).filter((g) => g !== "").sort();
  const groups = gradeKeys.map((grade) => {
    const classes = byGrade.get(grade)!;
    return { grade, label: GRADE_LABELS[grade] || `${grade}年級`, classes, total: classes.reduce((n, c) => n + c.students.length, 0) };
  });
  const other = byGrade.get("");
  if (other) groups.push({ grade: "", label: "未分年級", classes: other, total: other.reduce((n, c) => n + c.students.length, 0) });
  return groups;
}

function StudentManager() {
  const { state, openStudentDialog, remove, save } = useAppState();
  const [query, setQuery] = useState("");

  async function deleteStudent(id: string) {
    if (confirm("刪除學生？")) await remove("students", "student.delete", id);
  }

  async function promoteAllClasses() {
    const eligible = state.students.filter((s) => /^[1-5]\d{2}$/.test(s.className || ""));
    const graduating = state.students.filter((s) => /^6\d{2}$/.test(s.className || ""));
    if (eligible.length === 0) {
      alert("沒有可以自動升年級的班級（僅一～五年級格式的班級代碼，例如 301，會自動遞增為 401）。");
      return;
    }
    const gradNote = graduating.length > 0
      ? `\n另有 ${graduating.length} 位六年級學生的班級代碼不會自動變動，請自行決定是否畢業移出或手動修改。`
      : "";
    const ok = confirm(
      `即將把 ${eligible.length} 位學生的班級遞增一個年級（例如 301→401）。${gradNote}\n\n` +
      `⚠️ 這只適合「原班直升、沒有重新編班」的情況。如果新學年有打散重新編班，請不要用這個按鈕，改用每位學生的編輯功能手動指定新班級。\n\n確定要繼續嗎？`
    );
    if (!ok) return;

    const updates = eligible.map((s) => {
      const cn = s.className!;
      return { id: s.id, className: String(Number(cn[0]) + 1) + cn.slice(1) };
    });
    const existingClasses = state.config.class || [];
    const newClassCodes = Array.from(new Set(updates.map((u) => u.className))).filter((c) => !existingClasses.includes(c));

    await save("student.promoteClasses", { updates, newClassCodes }, {
      localUpdate: (prev) => ({
        ...prev,
        config: { ...prev.config, class: Array.from(new Set([...(prev.config.class || []), ...newClassCodes])) },
        students: prev.students.map((s) => {
          const u = updates.find((x) => x.id === s.id);
          return u ? { ...s, className: u.className } : s;
        }),
      }),
    });
  }

  const q = query.trim();
  const filtered = q
    ? state.students.filter((s) => s.name.includes(q) || (s.className || "").includes(q))
    : state.students;
  const gradeGroups = groupByGrade(filtered);

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle purple"><GraduationCap size={20} /></div>
        <div className="sectionText">
          <h2>學生管理</h2>
          <div className="sub">共 {state.students.length} 位</div>
        </div>
        <button className="linkPill purple" onClick={() => openStudentDialog()}>
          <Plus size={14} /> 新增
        </button>
      </div>
      {state.students.length > 0 && (
        <>
          <input
            style={{ marginTop: 16 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋姓名或班級…"
          />
          <button type="button" className="linkPill" style={{ marginTop: 12 }} onClick={promoteAllClasses}>
            <ArrowUpCircle size={14} /> 新學年：全部升一個年級
          </button>
        </>
      )}
      <div style={{ marginTop: 16 }}>
        {state.students.length === 0 && <div className="empty">尚無學生。</div>}
        {state.students.length > 0 && gradeGroups.length === 0 && <div className="empty">找不到符合的學生。</div>}
        {gradeGroups.map((gg) => (
          <details key={gg.grade || "__none"} className="gradeGroup" open={!!q}>
            <summary className="gradeGroupHead">
              <span className="gradeGroupArrow">›</span>
              <span className="gradeGroupLabel">{gg.label}</span>
              <span className="sub">{gg.total} 位</span>
            </summary>
            <div className="gradeGroupBody">
              {gg.classes.map((g) => (
                <details key={g.code || "__none"} className="classGroup" open={!!q}>
                  <summary className="classGroupHead">
                    <span className="classGroupArrow">›</span>
                    <span className="classGroupLabel">{g.code || "未分班"}</span>
                    <span className="sub">{g.students.length} 位</span>
                  </summary>
                  <div className="list" style={{ marginTop: 8 }}>
                    {g.students.map((s) => (
                      <div className="item row" key={s.id}>
                        <div>
                          <b>{s.name}</b>
                          <div className="sub">{[s.grade, s.groups].filter(Boolean).join("｜")}</div>
                        </div>
                        <div className="row" style={{ gap: 10 }}>
                          <button className="small" type="button" onClick={() => openStudentDialog(s.id)}><Pencil size={14} /></button>
                          <button className="small danger" type="button" onClick={() => deleteStudent(s.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

interface ConfigCategory {
  key: string;
  label: string;
}

const OTHER_CATEGORY = "__other";

// Moving an item within one section (category, or the whole list when there
// are no categories) needs to preserve every other item's relative slot in
// the underlying flat array — only the positions occupied by this section's
// own items are allowed to change.
function reorderSubset(full: string[], oldOrder: string[], newOrder: string[]): string[] {
  const positions: number[] = [];
  full.forEach((v, i) => {
    if (oldOrder.includes(v)) positions.push(i);
  });
  const next = [...full];
  positions.forEach((pos, idx) => {
    next[pos] = newOrder[idx];
  });
  return next;
}

function ConfigListManager({
  configKey,
  title,
  icon,
  placeholder,
  emptyHint,
  countUsage,
  usageNoun,
  categories,
}: {
  configKey: "group" | "class";
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  emptyHint: string;
  countUsage: (state: ReturnType<typeof useAppState>["state"], name: string) => number;
  usageNoun: string;
  /** When given, items are grouped into these labeled sections (plus a
   * catch-all "未分類" for anything not yet assigned) instead of one flat list. */
  categories?: ConfigCategory[];
}) {
  const { state, save } = useAppState();
  const items = state.config[configKey] || [];
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState(categories?.[0]?.key || "");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const dragRef = useRef<{ section: string; draggedKey: string } | null>(null);
  const [liveOrder, setLiveOrder] = useState<{ section: string; order: string[] } | null>(null);

  function categoryOf(name: string): string {
    return state.config.groupCategory?.[name] || OTHER_CATEGORY;
  }

  function baseSectionItems(sectionKey: string): string[] {
    if (!categories) return items;
    if (sectionKey === OTHER_CATEGORY) {
      const known = new Set(categories.map((c) => c.key));
      return items.filter((name) => !known.has(categoryOf(name)));
    }
    return items.filter((name) => categoryOf(name) === sectionKey);
  }

  function addItem() {
    const name = newItem.trim();
    if (!name || items.includes(name)) return;
    save(
      "config.addItem",
      { key: configKey, value: name, ...(categories ? { category: newCategory } : {}) },
      {
        localUpdate: (prev) => ({
          ...prev,
          config: {
            ...prev.config,
            [configKey]: [...(prev.config[configKey] || []), name],
            ...(categories ? { groupCategory: { ...prev.config.groupCategory, [name]: newCategory } } : {}),
          },
        }),
      }
    );
    setNewItem("");
  }

  function deleteItem(name: string) {
    const inUse = countUsage(state, name);
    const warn = inUse > 0 ? `，目前有 ${inUse} ${usageNoun}` : "";
    if (!confirm(`刪除「${name}」${warn}？`)) return;
    save("config.removeItem", { key: configKey, value: name }, {
      localUpdate: (prev) => ({
        ...prev,
        config: { ...prev.config, [configKey]: (prev.config[configKey] || []).filter((g) => g !== name) },
      }),
    });
  }

  function startEdit(name: string) {
    setEditing(name);
    setEditValue(name);
  }

  function confirmRename(oldName: string) {
    const name = editValue.trim();
    setEditing(null);
    if (!name || name === oldName) return;
    if (items.includes(name)) {
      alert(`「${name}」已經存在`);
      return;
    }
    // Renaming has to update every student referencing the old name too, so
    // it goes through a dedicated batch action rather than config.save.
    save("config.renameItem", { key: configKey, oldValue: oldName, newValue: name }, {
      localUpdate: (prev) => {
        const nextList = (prev.config[configKey] || []).map((v) => (v === oldName ? name : v));
        const nextStudents = prev.students.map((s) => {
          if (configKey === "class") {
            return s.className === oldName ? { ...s, className: name } : s;
          }
          const groups = (s.groups || "").split(",").map((g) => g.trim()).filter(Boolean);
          if (!groups.includes(oldName)) return s;
          return { ...s, groups: groups.map((g) => (g === oldName ? name : g)).join(",") };
        });
        const prevCategory = prev.config.groupCategory?.[oldName];
        return {
          ...prev,
          config: {
            ...prev.config,
            [configKey]: nextList,
            ...(prevCategory ? { groupCategory: { ...prev.config.groupCategory, [name]: prevCategory } } : {}),
          },
          students: nextStudents,
        };
      },
    });
  }

  function startDrag(e: React.PointerEvent<HTMLButtonElement>, sectionKey: string, name: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { section: sectionKey, draggedKey: name };
    setLiveOrder({ section: sectionKey, order: baseSectionItems(sectionKey) });
  }

  function handleDragMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const rowEl = el?.closest("[data-drag-key]") as HTMLElement | null;
    if (!rowEl) return;
    const overKey = rowEl.getAttribute("data-drag-key")!;
    const overSection = rowEl.getAttribute("data-drag-section")!;
    if (overSection !== drag.section || overKey === drag.draggedKey) return;
    setLiveOrder((prev) => {
      const current = prev?.order || [];
      const from = current.indexOf(drag.draggedKey);
      const to = current.indexOf(overKey);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, drag.draggedKey);
      return { section: drag.section, order: next };
    });
  }

  function handleDragEnd() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const finalOrder = liveOrder && liveOrder.section === drag.section ? liveOrder.order : null;
    setLiveOrder(null);
    if (!finalOrder) return;
    const oldOrder = baseSectionItems(drag.section);
    if (oldOrder.join("|") === finalOrder.join("|")) return;
    const nextFull = reorderSubset(items, oldOrder, finalOrder);
    save("config.save", { [configKey]: nextFull }, {
      localUpdate: (prev) => ({ ...prev, config: { ...prev.config, [configKey]: nextFull } }),
    });
  }

  function renderRow(name: string, sectionKey: string) {
    if (editing === name) {
      return (
        <div className="item row" key={name}>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmRename(name);
              }
              if (e.key === "Escape") setEditing(null);
            }}
            style={{ flex: 1, minWidth: 120 }}
          />
          <div className="row" style={{ gap: 6 }}>
            <button className="primary small" type="button" onClick={() => confirmRename(name)}>儲存</button>
            <button className="small" type="button" onClick={() => setEditing(null)}>取消</button>
          </div>
        </div>
      );
    }
    return (
      <div className="item row" key={name} data-drag-key={name} data-drag-section={sectionKey}>
        <div className="row" style={{ gap: 10, flex: 1, justifyContent: "flex-start" }}>
          <button
            type="button"
            className="dragHandle"
            aria-label="拖曳排序"
            onPointerDown={(e) => startDrag(e, sectionKey, name)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <GripVertical size={16} />
          </button>
          <b>{name}</b>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="small" type="button" onClick={() => startEdit(name)}><Pencil size={14} /></button>
          <button className="small danger" type="button" onClick={() => deleteItem(name)}><Trash2 size={14} /></button>
        </div>
      </div>
    );
  }

  const sectionDefs: ConfigCategory[] = categories ? [...categories, { key: OTHER_CATEGORY, label: "未分類" }] : [{ key: "__all", label: "" }];

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle red">{icon}</div>
        <div className="sectionText">
          <h2>{title}</h2>
          <div className="sub">共 {items.length} 個</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
        />
        {categories && (
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ maxWidth: 130 }}>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        )}
        <button className="primary small" type="button" onClick={addItem}>
          <Plus size={14} /> 新增
        </button>
      </div>
      {items.length === 0 && <div className="empty" style={{ marginTop: 16 }}>{emptyHint}</div>}
      {sectionDefs.map(({ key: sectionKey, label }) => {
        const base = baseSectionItems(sectionKey);
        if (categories && base.length === 0) return null;
        const display = liveOrder && liveOrder.section === sectionKey ? liveOrder.order : base;
        return (
          <div key={sectionKey} style={{ marginTop: label ? 20 : 16 }}>
            {label && <div className="moreMenuGroupTitle">{label}</div>}
            <div className="list" style={{ marginTop: label ? 10 : 0 }}>
              {display.map((name) => renderRow(name, sectionKey))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

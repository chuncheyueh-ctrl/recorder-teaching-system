"use client";

import { useState } from "react";
import {
  ArrowUpCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { timeRange, weekdayLabel } from "@/lib/date-utils";
import type { Student } from "@/lib/types";

type SectionKey = "teachers" | "students" | "slots" | "class" | "group";

interface MenuGroup {
  title: string;
  items: {
    key: SectionKey;
    label: string;
    icon: React.ReactNode;
    tone: "green" | "purple" | "blue" | "red";
    count: number;
    unit: string;
  }[];
}

export function MorePage() {
  const { state } = useAppState();
  const [section, setSection] = useState<SectionKey | null>(null);

  const groups: MenuGroup[] = [
    {
      title: "人員",
      items: [
        { key: "teachers", label: "老師管理", icon: <Users size={20} />, tone: "green", count: state.teachers.length, unit: "位" },
        { key: "students", label: "學生管理", icon: <GraduationCap size={20} />, tone: "purple", count: state.students.length, unit: "位" },
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
          />
        )}
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
            <div className="row" style={{ gap: 6 }}>
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
            <div className="row" style={{ gap: 6 }}>
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
                        <div className="row" style={{ gap: 6 }}>
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

function ConfigListManager({
  configKey,
  title,
  icon,
  placeholder,
  emptyHint,
  countUsage,
  usageNoun,
}: {
  configKey: "group" | "class";
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  emptyHint: string;
  countUsage: (state: ReturnType<typeof useAppState>["state"], name: string) => number;
  usageNoun: string;
}) {
  const { state, save } = useAppState();
  const items = state.config[configKey] || [];
  const [newItem, setNewItem] = useState("");

  function addItem() {
    const name = newItem.trim();
    if (!name || items.includes(name)) return;
    save("config.addItem", { key: configKey, value: name }, {
      localUpdate: (prev) => ({
        ...prev,
        config: { ...prev.config, [configKey]: [...(prev.config[configKey] || []), name] },
      }),
    });
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
        <button className="primary small" type="button" onClick={addItem}>
          <Plus size={14} /> 新增
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {items.length === 0 && <div className="empty">{emptyHint}</div>}
        {items.map((g) => (
          <div className="item row" key={g}>
            <b>{g}</b>
            <button className="small danger" type="button" onClick={() => deleteItem(g)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

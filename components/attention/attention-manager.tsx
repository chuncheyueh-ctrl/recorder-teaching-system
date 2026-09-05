"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import type { Student } from "@/lib/types";

export function AttentionManager() {
  const { state, save } = useAppState();
  const [query, setQuery] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const q = query.trim();
  const filtered = q ? state.students.filter((s) => s.name.includes(q)) : state.students;
  const sorted = [...filtered].sort((a, b) => {
    if (!!a.needsAttention !== !!b.needsAttention) return a.needsAttention ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
  const flaggedCount = state.students.filter((s) => s.needsAttention).length;

  function toggle(s: Student) {
    const next = !s.needsAttention;
    save("student.save", { ...s, needsAttention: next }, {
      localUpdate: (prev) => ({
        ...prev,
        students: prev.students.map((x) => (x.id === s.id ? { ...x, needsAttention: next } : x)),
      }),
    });
  }

  function commitNote(s: Student) {
    const note = (noteDrafts[s.id] ?? s.attentionNote ?? "").trim();
    if (note === (s.attentionNote || "")) return;
    save("student.save", { ...s, attentionNote: note }, {
      localUpdate: (prev) => ({
        ...prev,
        students: prev.students.map((x) => (x.id === s.id ? { ...x, attentionNote: note } : x)),
      }),
    });
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle red"><AlertCircle size={20} /></div>
        <div className="sectionText">
          <h2>需注意學生</h2>
          <div className="sub">目前標記 {flaggedCount} 位，會顯示在今日首頁的注意資訊卡片</div>
        </div>
      </div>
      <input
        style={{ marginTop: 16 }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋姓名…"
      />
      <div className="list" style={{ marginTop: 16 }}>
        {sorted.length === 0 && <div className="empty">找不到符合的學生。</div>}
        {sorted.map((s) => (
          <div className="item" key={s.id}>
            <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={!!s.needsAttention} onChange={() => toggle(s)} />
              <b>{s.name}</b>
              <span className="sub">{[s.grade, s.className].filter(Boolean).join("｜")}</span>
            </div>
            {s.needsAttention && (
              <input
                style={{ marginTop: 8 }}
                value={noteDrafts[s.id] ?? s.attentionNote ?? ""}
                onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                onBlur={() => commitNote(s)}
                placeholder="需要注意的原因，例如：節奏不穩、需個別加強"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

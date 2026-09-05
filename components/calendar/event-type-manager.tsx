"use client";

import { useState } from "react";
import { Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { EVENT_COLORS } from "@/lib/event-colors";

export function EventTypeManager() {
  const { state, save } = useAppState();
  const items = state.config.eventType || [];
  const [newItem, setNewItem] = useState("");
  const [newColor, setNewColor] = useState(EVENT_COLORS[0].key);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function colorOf(name: string): string {
    return state.config.eventTypeColor?.[name] || EVENT_COLORS[0].key;
  }

  function addItem() {
    const name = newItem.trim();
    if (!name || items.includes(name)) return;
    save("config.addItem", { key: "eventType", value: name, category: newColor }, {
      localUpdate: (prev) => ({
        ...prev,
        config: {
          ...prev.config,
          eventType: [...(prev.config.eventType || []), name],
          eventTypeColor: { ...prev.config.eventTypeColor, [name]: newColor },
        },
      }),
    });
    setNewItem("");
  }

  function deleteItem(name: string) {
    const inUse = state.events.filter((e) => e.type === name).length;
    const warn = inUse > 0 ? `，目前有 ${inUse} 則事件使用這個類別` : "";
    if (!confirm(`刪除「${name}」${warn}？`)) return;
    save("config.removeItem", { key: "eventType", value: name }, {
      localUpdate: (prev) => ({
        ...prev,
        config: { ...prev.config, eventType: (prev.config.eventType || []).filter((g) => g !== name) },
      }),
    });
  }

  function changeColor(name: string, color: string) {
    save("config.save", { eventTypeColor: { ...state.config.eventTypeColor, [name]: color } }, {
      localUpdate: (prev) => ({
        ...prev,
        config: { ...prev.config, eventTypeColor: { ...prev.config.eventTypeColor, [name]: color } },
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
    save("config.renameItem", { key: "eventType", oldValue: oldName, newValue: name }, {
      localUpdate: (prev) => {
        const nextList = (prev.config.eventType || []).map((v) => (v === oldName ? name : v));
        const prevColor = prev.config.eventTypeColor?.[oldName];
        return {
          ...prev,
          config: {
            ...prev.config,
            eventType: nextList,
            ...(prevColor ? { eventTypeColor: { ...prev.config.eventTypeColor, [name]: prevColor } } : {}),
          },
          events: prev.events.map((e) => (e.type === oldName ? { ...e, type: name } : e)),
        };
      },
    });
  }

  return (
    <div className="card">
      <div className="sectionHead">
        <div className="badgeCircle red"><Palette size={20} /></div>
        <div className="sectionText">
          <h2>活動類別</h2>
          <div className="sub">共 {items.length} 個，決定行事曆上的顏色</div>
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
          placeholder="例如：比賽"
        />
        <select value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ maxWidth: 110 }}>
          {EVENT_COLORS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <button className="primary small" type="button" onClick={addItem}>
          <Plus size={14} /> 新增
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {items.length === 0 && <div className="empty">尚無活動類別。</div>}
        {items.map((name) =>
          editing === name ? (
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
          ) : (
            <div className="item row" key={name}>
              <b>{name}</b>
              <div className="row" style={{ gap: 6 }}>
                <select
                  value={colorOf(name)}
                  onChange={(e) => changeColor(name, e.target.value)}
                  className="eventColorSelect"
                  style={{ background: EVENT_COLORS.find((c) => c.key === colorOf(name))?.value }}
                >
                  {EVENT_COLORS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <button className="small" type="button" onClick={() => startEdit(name)}><Pencil size={14} /></button>
                <button className="small danger" type="button" onClick={() => deleteItem(name)}><Trash2 size={14} /></button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

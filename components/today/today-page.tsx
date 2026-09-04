"use client";

import { Check, ChevronRight, ClipboardCheck, ClipboardList, Circle, UserRound, Users } from "lucide-react";
import { useAppState } from "@/state/app-state-provider";
import { slotsForDate, timeRange } from "@/lib/date-utils";
import type { Availability, LessonRecord } from "@/lib/types";

const AVATAR_TONES = ["tone1", "tone2", "tone3", "tone4"];

interface SlotSession {
  teacherId: string;
  teacherName: string;
  groupName?: string;
  record?: LessonRecord;
}

// A slot (e.g. "早自習") can be taught by several teachers at once, each
// with a different group — so "done" has to be tracked per teacher, not
// per slot, or one teacher's record wrongly marks everyone else's as done
// too and a second teacher's click on the same slot would edit the first
// teacher's record instead of starting a new one.
function sessionsForSlot(slotId: string, av: Availability[], rec: LessonRecord[]): SlotSession[] {
  const byTeacher = new Map<string, SlotSession>();
  av.filter((a) => a.slotId === slotId).forEach((a) => {
    byTeacher.set(a.teacherId, { teacherId: a.teacherId, teacherName: a.teacherName });
  });
  rec.filter((r) => r.slotId === slotId).forEach((r) => {
    const existing = byTeacher.get(r.teacherId);
    if (existing) existing.record = r;
    else byTeacher.set(r.teacherId, { teacherId: r.teacherId, teacherName: r.teacherName, groupName: r.groupName, record: r });
  });
  return Array.from(byTeacher.values());
}

export function TodayPage() {
  const { state, setPage, openAvailabilityDialog, openRecordDialog } = useAppState();
  const av = state.availability.filter((a) => a.dateKey === state.dateKey);
  const rec = state.records.filter((r) => r.dateKey === state.dateKey);
  const slots = slotsForDate(state.slots, state.dateKey);
  const slotSessions = slots.map((s) => ({ slot: s, sessions: sessionsForSlot(s.id, av, rec) }));
  const sessionCount = slotSessions.reduce((n, x) => n + Math.max(1, x.sessions.length), 0);
  const sessionDoneCount = slotSessions.reduce((n, x) => n + x.sessions.filter((sx) => sx.record).length, 0);
  const handoffs = rec.filter((r) => r.handoff);
  const teacherCount = new Set(av.map((a) => a.teacherId)).size;

  // A lesson record covers a whole group (groupName), not individual
  // students, so "who hasn't been covered today" is derived by matching a
  // student's group memberships against today's completed records' groups.
  const coveredGroups = new Set(rec.map((r) => r.groupName).filter(Boolean));
  const absentStudents = state.students.filter((s) => {
    const groups = (s.groups || "").split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) return true;
    return !groups.some((g) => coveredGroups.has(g));
  });
  const groupCounts = (state.config.group || []).map((g) => ({
    name: g,
    count: absentStudents.filter((s) => (s.groups || "").split(",").map((x) => x.trim()).includes(g)).length,
  }));

  return (
    <div className="grid">
      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle green"><Users size={20} /></div>
          <div className="sectionText">
            <h2>今日可到校老師</h2>
            <div className="sub">{teacherCount} 位老師・共 {av.length} 個時段</div>
          </div>
          <button className="linkPill green" onClick={openAvailabilityDialog}>
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        <div className="list">
          {av.length === 0 && <div className="empty">目前這一天尚無老師填寫可到校時段。</div>}
          {av.map((a, i) => (
            <div className="teacherRow" key={a.id}>
              <div className={`avatarCircle ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
                {(a.teacherName || "?").slice(0, 1)}
              </div>
              <div className="teacherInfo">
                <div className="teacherName">{a.teacherName}</div>
                <div>
                  <span className="timeChip">{timeRange(a.start, a.end)}</span>
                </div>
                {a.note && <div className="sub">{a.note}</div>}
              </div>
              <span className="statusPill done"><Check size={12} /> 可到校</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle red"><ClipboardList size={20} /></div>
          <div className="sectionText">
            <h2>今日課程紀錄</h2>
            <div className="sub">共 {sessionCount} 節課・待完成 {Math.max(0, sessionCount - sessionDoneCount)} 節</div>
          </div>
          <button className="linkPill red" onClick={() => setPage("records")}>
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        <div className="courseGrid" style={{ marginTop: 16 }}>
          {slots.length === 0 && <div className="empty">今天沒有適用時段。</div>}
          {slotSessions.map(({ slot: s, sessions }) => {
            // Common case: nobody's marked availability yet and there's no
            // record either, or exactly one teacher is covering this slot —
            // show the simple single-row tile as before.
            if (sessions.length <= 1) {
              const session = sessions[0];
              const r = session?.record;
              return (
                <div
                  className="courseItem"
                  key={s.id}
                  onClick={() => openRecordDialog(r ? { recordId: r.id } : { slotId: s.id, teacherId: session?.teacherId })}
                >
                  <div className={`statusDot${r ? "" : " todo"}`}>
                    {r ? <Check size={13} /> : <Circle size={8} fill="currentColor" />}
                  </div>
                  <div className="courseInfo">
                    <div className="courseName">{s.name}</div>
                    <div className="courseTime">{timeRange(s.start, s.end)}</div>
                  </div>
                  {r ? (
                    <span className="statusPill done">已完成</span>
                  ) : (
                    <span className="statusPill todo">待填寫 <ChevronRight size={12} /></span>
                  )}
                </div>
              );
            }
            // Several teachers cover this slot at once (different groups) —
            // one row per teacher so each has its own status and doesn't
            // get edited into by another teacher's click.
            return (
              <div className="courseGroup" key={s.id}>
                <div className="courseGroupHead">
                  <b>{s.name}</b>
                  <span className="sub">{timeRange(s.start, s.end)}</span>
                </div>
                {sessions.map((session) => (
                  <div
                    className="courseItem"
                    key={session.teacherId}
                    onClick={() =>
                      openRecordDialog(
                        session.record ? { recordId: session.record.id } : { slotId: s.id, teacherId: session.teacherId }
                      )
                    }
                  >
                    <div className={`statusDot${session.record ? "" : " todo"}`}>
                      {session.record ? <Check size={13} /> : <Circle size={8} fill="currentColor" />}
                    </div>
                    <div className="courseInfo">
                      <div className="courseName">
                        {session.teacherName}{session.groupName ? `｜${session.groupName}` : ""}
                      </div>
                      <div className="courseTime">{timeRange(s.start, s.end)}</div>
                    </div>
                    {session.record ? (
                      <span className="statusPill done">已完成</span>
                    ) : (
                      <span className="statusPill todo">待填寫 <ChevronRight size={12} /></span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle red"><ClipboardCheck size={20} /></div>
          <div className="sectionText">
            <h2>今日教學接力</h2>
            <div className="sub">{handoffs.length} 則交接事項</div>
          </div>
          <button className="linkPill red" onClick={() => setPage("records")}>
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        <div className="list">
          {handoffs.length === 0 && <div className="empty">目前沒有交接事項。</div>}
          {handoffs.map((r) => (
            <div
              className="handoffItem"
              key={r.id}
              onClick={() => openRecordDialog({ recordId: r.id })}
            >
              <div className="handoffAvatar"><Users size={16} /></div>
              <div className="handoffBody">
                <div className="handoffTitle">{r.groupName || "未分類"}｜{r.teacherName || ""}</div>
                <div className="handoffNote">{r.handoff}</div>
              </div>
              <div className="handoffMeta">
                {r.slotName}<br />{timeRange(r.start, r.end)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="sectionHead">
          <div className="badgeCircle purple"><UserRound size={20} /></div>
          <div className="sectionText">
            <h2>未參與學生</h2>
            <div className="sub">共 {state.students.length} 位學生</div>
          </div>
          <button className="linkPill purple" onClick={() => setPage("more")}>
            查看名單 <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          {state.students.length === 0 ? (
            <div className="empty">尚未建立學生名單。</div>
          ) : absentStudents.length === 0 ? (
            <div className="empty">今天已涵蓋的團別都有課程紀錄。</div>
          ) : (
            absentStudents.slice(0, 16).map((s) => <span className="pill" key={s.id}>{s.name}</span>)
          )}
        </div>
        {groupCounts.length > 0 && (
          <div className="groupPillRow">
            {groupCounts.map((g) => (
              <span className="groupPill" key={g.name}>{g.name} {g.count} 人</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

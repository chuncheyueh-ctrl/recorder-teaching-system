"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useAppState } from "@/state/app-state-provider";

// Only shown once per device — as soon as a teacher is picked, myTeacherId
// (shared app state, backed by localStorage) is set and this hides itself
// immediately, everywhere it's read (TopBar's greeting, dialog defaults).
export function WelcomeScreen() {
  const { state, myTeacherId, myTeacherChecked, setMyTeacherId } = useAppState();
  const visible = myTeacherChecked && !myTeacherId;

  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="welcomeOverlay">
      <div className="welcomeCard">
        <Image src="/logo.png" alt="" width={640} height={640} className="welcomeLogo" priority />
        <div className="welcomeBody">
          <h1 className="welcomeTitle">中正國小直笛團</h1>
          <div className="welcomeSub">教師工作台</div>
          <p className="welcomeAsk">歡迎！請選擇你是哪位老師：</p>
          {state.teachers.length === 0 ? (
            <p className="sub">尚未建立老師名單，請先請管理者到「更多」新增老師。</p>
          ) : (
            <div className="welcomeTeacherList">
              {state.teachers.map((t) => (
                <button key={t.id} type="button" className="welcomeTeacherBtn" onClick={() => setMyTeacherId(t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

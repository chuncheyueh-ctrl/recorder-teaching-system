"use client";

import { useAppState } from "@/state/app-state-provider";

export function Toast() {
  const { toastState } = useAppState();
  return (
    <div className="toast" style={{ display: toastState.visible ? "block" : "none" }}>
      {toastState.message}
    </div>
  );
}

// A fixed palette (not free-form color picking) so 行事曆's dots and 更多's
// event-type manager always agree on what "gray"/"red"/etc. actually looks
// like, and stay visually consistent with the rest of the app's tones.
export const EVENT_COLORS = [
  { key: "gray", label: "灰色", value: "#8b7a70" },
  { key: "red", label: "紅色", value: "#c84650" },
  { key: "yellow", label: "黃色", value: "#c78b2e" },
  { key: "green", label: "綠色", value: "#3f8d56" },
  { key: "blue", label: "藍色", value: "#4b6fbd" },
  { key: "purple", label: "紫色", value: "#7c6bc4" },
  { key: "orange", label: "橘色", value: "#c8703b" },
  { key: "pink", label: "粉色", value: "#c85a8a" },
];

export function colorValueOf(key: string | undefined): string {
  return EVENT_COLORS.find((c) => c.key === key)?.value || EVENT_COLORS[0].value;
}

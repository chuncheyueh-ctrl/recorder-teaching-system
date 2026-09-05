// A fixed palette (not free-form color picking) so 行事曆's dots and 更多's
// event-type manager always agree on what "gray"/"red"/etc. actually looks
// like. Muted/dusty (Morandi-style) tones rather than saturated ones —
// meant to sit quietly filling a whole day cell, not shout.
export const EVENT_COLORS = [
  { key: "gray", label: "灰色", value: "#b7ada2" },
  { key: "red", label: "紅色", value: "#c39a97" },
  { key: "yellow", label: "黃色", value: "#d7c6a1" },
  { key: "green", label: "綠色", value: "#a3b295" },
  { key: "blue", label: "藍色", value: "#9bb0bb" },
  { key: "purple", label: "紫色", value: "#b3a4b4" },
  { key: "orange", label: "橘色", value: "#cbab8a" },
  { key: "pink", label: "粉色", value: "#d3bcbc" },
];

export function colorValueOf(key: string | undefined): string {
  return EVENT_COLORS.find((c) => c.key === key)?.value || EVENT_COLORS[0].value;
}

/**
 * A CSS background filling a day cell with one hard-edged band per color —
 * one event fills the whole cell, two split it in half, three in thirds,
 * and so on, instead of a single small dot regardless of how many there are.
 */
export function bandBackground(colors: string[]): string {
  if (colors.length === 0) return "";
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  const stops: string[] = [];
  colors.forEach((c, i) => {
    stops.push(`${c} ${i * step}%`, `${c} ${(i + 1) * step}%`);
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

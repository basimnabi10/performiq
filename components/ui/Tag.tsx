import * as React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Semantic tone. The app is monochrome: statuses map to blue/slate tints.
   * `accent` is the reserved lime brand highlight (use sparingly, never as "success").
   */
  tone?: "primary" | "neutral" | "onTrack" | "atRisk" | "complete" | "accent" | "ink" | "frost";
  /** Show a leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

const TONES: Record<string, { color: string; bg: string; dot: string | null }> = {
  primary: { color: "#273FF9", bg: "rgba(58,99,250,.13)", dot: "#273FF9" },
  neutral: { color: "#596392", bg: "rgba(168,175,203,.28)", dot: "#767FA5" },
  onTrack: { color: "#273FF9", bg: "rgba(58,99,250,.13)", dot: "#3A63FA" },
  atRisk: { color: "#596392", bg: "rgba(89,99,146,.14)", dot: "#767FA5" },
  complete: { color: "#fff", bg: "#273FF9", dot: null },
  accent: { color: "#2C2A00", bg: "linear-gradient(135deg,#E3FF3B,#D6F200)", dot: null },
  ink: { color: "#fff", bg: "#252944", dot: null },
  frost: { color: "#454D7A", bg: "rgba(255,255,255,.6)", dot: null },
};

/** PerformIQ status/label tag — soft tinted pill with an optional leading dot. */
export function Tag({ tone = "neutral", dot = false, children, style, ...rest }: TagProps) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 12,
        fontWeight: 500,
        color: t.color,
        background: t.bg,
        padding: "5px 12px",
        borderRadius: 9,
        border: tone === "frost" ? "1px solid rgba(255,255,255,.75)" : "none",
        ...style,
      }}
      {...rest}
    >
      {dot && t.dot ? (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot }} />
      ) : null}
      {children}
    </span>
  );
}

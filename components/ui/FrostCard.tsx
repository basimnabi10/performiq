import * as React from "react";

export interface FrostCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** frost = signature translucent glass (default); solid = higher-opacity glass; modal = opaque enough to read over page content; ink = dark accent cell. */
  tone?: "frost" | "solid" | "modal" | "ink";
  /** Inner padding in px. Default 22. */
  padding?: number;
  /** Corner radius in px. Default 24. */
  radius?: number;
  children?: React.ReactNode;
}

const TONES: Record<string, React.CSSProperties> = {
  frost: {
    background: "rgba(255,255,255,.20)",
    border: "1px solid rgba(255,255,255,.40)",
    WebkitBackdropFilter: "blur(35px)",
    backdropFilter: "blur(35px)",
    boxShadow: "0 8px 24px rgba(0,0,0,.06)",
  },
  solid: {
    background: "rgba(255,255,255,.55)",
    border: "1px solid rgba(255,255,255,.7)",
    WebkitBackdropFilter: "blur(30px) saturate(140%)",
    backdropFilter: "blur(30px) saturate(140%)",
    boxShadow: "0 8px 24px rgba(0,0,0,.06)",
  },
  // Same glass, but opaque enough that what is behind it reads as light and
  // shadow rather than as words. A dialog sits ON TOP of a busy dashboard,
  // so at "solid" opacity the page's own headings and dark panels show
  // through the form and compete with its labels.
  modal: {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(255,255,255,.9)",
    WebkitBackdropFilter: "blur(40px) saturate(150%)",
    backdropFilter: "blur(40px) saturate(150%)",
    boxShadow: "0 24px 60px rgba(24,24,53,.28)",
  },
  ink: {
    background: "linear-gradient(150deg,#2C3158,#181835)",
    border: "1px solid rgba(255,255,255,.1)",
    boxShadow: "0 8px 24px rgba(24,24,53,.20)",
  },
};

/** The canonical PerformIQ surface: a translucent frosted-glass panel. */
export function FrostCard({
  tone = "frost",
  padding = 22,
  radius = 24,
  style,
  children,
  ...rest
}: FrostCardProps) {
  return (
    <div
      style={{
        borderRadius: radius,
        padding,
        color: tone === "ink" ? "#fff" : "#252944",
        ...(TONES[tone] ?? TONES.frost),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

"use client";

import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Primary = blue gradient pill; secondary = frosted glass; ghost = outline; text = bare. */
  variant?: "primary" | "secondary" | "ghost" | "text";
  /** Control height rhythm. sm=40 md=44-46 lg=56 header=50 (dashboard header row only). */
  size?: "sm" | "md" | "lg" | "header";
  /** Iconify icon name shown before the label, e.g. "ant-design:plus-outlined". */
  icon?: string;
  /** Iconify icon name shown after the label. */
  iconRight?: string;
}

// md metrics per variant, taken verbatim from the design export's button specs
// (the header CTA and the frosted quick-action buttons are two different
// heights/type-sizes by design, not a shared default).
const MD_METRICS: Record<string, { height: number; padX: number; fontSize: number; gap: number }> = {
  primary: { height: 44, padX: 20, fontSize: 14, gap: 8 },
  secondary: { height: 46, padX: 18, fontSize: 13, gap: 9 },
  ghost: { height: 46, padX: 18, fontSize: 13, gap: 9 },
  text: { height: 46, padX: 18, fontSize: 13, gap: 9 },
};
// Bigger scale used only for the HOD Dashboard header row (per the design
// reference screenshot) — not the app-wide default.
const HEADER_METRICS: Record<string, { height: number; padX: number; fontSize: number; gap: number }> = {
  primary: { height: 50, padX: 24, fontSize: 15, gap: 9 },
  secondary: { height: 50, padX: 20, fontSize: 14, gap: 10 },
  ghost: { height: 50, padX: 20, fontSize: 14, gap: 10 },
  text: { height: 50, padX: 20, fontSize: 14, gap: 10 },
};
const SM_METRICS = { height: 40, padX: 16, fontSize: 12, gap: 6 };
const LG_METRICS = { height: 52, padX: 24, fontSize: 15, gap: 10 };

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #3A63FA, #273FF9)",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(39,63,249,.35), inset 0 1px 0 rgba(255,255,255,.3)",
  },
  secondary: {
    background: "rgba(255,255,255,.5)",
    color: "#252944",
    border: "1px solid rgba(255,255,255,.7)",
    boxShadow: "0 6px 18px rgba(70,100,190,.08)",
    WebkitBackdropFilter: "blur(24px)",
    backdropFilter: "blur(24px)",
  },
  ghost: {
    background: "transparent",
    color: "#273FF9",
    border: "1.5px solid #8BB0FF",
  },
  text: {
    background: "transparent",
    color: "#596392",
  },
};

/** PerformIQ primary/secondary/ghost/text button. */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  children,
  style,
  ...rest
}: ButtonProps) {
  const m =
    size === "sm"
      ? SM_METRICS
      : size === "lg"
        ? LG_METRICS
        : size === "header"
          ? (HEADER_METRICS[variant] ?? HEADER_METRICS.secondary)
          : (MD_METRICS[variant] ?? MD_METRICS.secondary);

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: m.gap,
    height: m.height,
    padding: `0 ${m.padX}px`,
    borderRadius: size === "header" ? 16 : 14,
    border: "none",
    fontFamily: "'Switzer', system-ui, sans-serif",
    fontWeight: 500,
    fontSize: m.fontSize,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "filter .18s ease, transform .18s ease, box-shadow .18s ease",
    whiteSpace: "nowrap",
  };

  const iconWidth = size === "sm" ? 14 : size === "lg" || size === "header" ? 18 : variant === "primary" ? 15 : 17;
  const iconColor = variant === "primary" ? undefined : "#273FF9";

  return (
    <button
      disabled={disabled}
      style={{ ...base, ...(VARIANTS[variant] ?? VARIANTS.primary), ...style }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.filter = "brightness(1.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "none";
      }}
      {...rest}
    >
      {icon ? <iconify-icon icon={icon} width={iconWidth} style={iconColor ? { color: iconColor } : undefined} /> : null}
      {children}
      {iconRight ? <iconify-icon icon={iconRight} width={iconWidth} style={iconColor ? { color: iconColor } : undefined} /> : null}
    </button>
  );
}

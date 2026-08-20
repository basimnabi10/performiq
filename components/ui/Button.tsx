"use client";

import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Primary = blue gradient pill; secondary = frosted glass; ghost = outline; text = bare. */
  variant?: "primary" | "secondary" | "ghost" | "text";
  /** Control height rhythm. sm=40 md=46 lg=52. */
  size?: "sm" | "md" | "lg";
  /** Iconify icon name shown before the label, e.g. "ant-design:plus-outlined". */
  icon?: string;
  /** Iconify icon name shown after the label. */
  iconRight?: string;
}

const HEIGHTS = { sm: 40, md: 46, lg: 52 };
const PADS = { sm: 18, md: 22, lg: 24 };

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #3A63FA, #273FF9)",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(39,63,249,.35), inset 0 1px 0 rgba(255,255,255,.3)",
  },
  secondary: {
    background: "rgba(255,255,255,.55)",
    color: "#252944",
    border: "1px solid rgba(255,255,255,.75)",
    boxShadow: "0 6px 18px rgba(70,100,190,.10)",
    WebkitBackdropFilter: "blur(16px) saturate(160%)",
    backdropFilter: "blur(16px) saturate(160%)",
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
  const h = HEIGHTS[size] ?? 46;

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: h,
    padding: `0 ${PADS[size] ?? 22}px`,
    borderRadius: 15,
    border: "none",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: 500,
    fontSize: size === "sm" ? 13 : 15,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "filter .18s ease, transform .18s ease, box-shadow .18s ease",
    whiteSpace: "nowrap",
  };

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
      {icon ? <iconify-icon icon={icon} width={size === "sm" ? 14 : 16} /> : null}
      {children}
      {iconRight ? <iconify-icon icon={iconRight} width={size === "sm" ? 14 : 16} /> : null}
    </button>
  );
}

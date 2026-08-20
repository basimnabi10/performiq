"use client";

import * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Iconify icon name, e.g. "ant-design:arrow-right-outlined". */
  icon?: string;
  /** frost = white glass (card CTA); primary = solid blue; chrome = translucent toolbar button. */
  variant?: "frost" | "primary" | "chrome";
  /** Diameter in px. Default 46. */
  size?: number;
  /** Accessible label (also the tooltip). Required for icon-only buttons. */
  label?: string;
}

const VARIANTS: Record<string, React.CSSProperties> = {
  frost: {
    background: "rgba(255,255,255,.85)",
    color: "#273FF9",
    border: "1px solid rgba(255,255,255,.8)",
    boxShadow: "0 10px 24px rgba(70,100,190,.20)",
    WebkitBackdropFilter: "blur(16px)",
    backdropFilter: "blur(16px)",
  },
  primary: {
    background: "linear-gradient(135deg,#3A63FA,#273FF9)",
    color: "#fff",
    border: "none",
    boxShadow: "0 8px 20px rgba(39,63,249,.4)",
  },
  chrome: {
    background: "rgba(255,255,255,.55)",
    color: "#454D7A",
    border: "1px solid rgba(255,255,255,.7)",
    boxShadow: "0 6px 18px rgba(70,100,190,.08)",
    WebkitBackdropFilter: "blur(24px)",
    backdropFilter: "blur(24px)",
  },
};

/** Circular frosted-glass icon button — the signature PerformIQ card CTA. */
export function IconButton({
  icon = "ant-design:arrow-right-outlined",
  variant = "frost",
  size = 46,
  label,
  style,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform .18s ease, filter .18s ease",
        ...(VARIANTS[variant] ?? VARIANTS.frost),
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
      }}
      {...rest}
    >
      <iconify-icon icon={icon} width={Math.round(size * 0.42)} />
    </button>
  );
}

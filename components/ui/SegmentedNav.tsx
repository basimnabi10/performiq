"use client";

import * as React from "react";

export interface SegmentedNavItem {
  value: string;
  label: string;
}

export interface SegmentedNavProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Items — plain strings (label = value) or {value,label} objects. */
  items: (string | SegmentedNavItem)[];
  /** Active item value. */
  value: string;
  onChange?: (value: string) => void;
}

/** Frosted segmented navigation / tab control — top-bar nav and in-page tabs. */
export function SegmentedNav({ items = [], value, onChange, style, ...rest }: SegmentedNavProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(255,255,255,.50)",
        border: "1px solid rgba(255,255,255,.7)",
        borderRadius: 16,
        padding: 5,
        boxShadow: "0 8px 24px rgba(70,100,190,.1)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        backdropFilter: "blur(24px) saturate(150%)",
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const key = typeof it === "string" ? it : it.value;
        const label = typeof it === "string" ? it : it.label;
        const active = key === value;
        return (
          <button
            type="button"
            key={key}
            onClick={() => onChange?.(key)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 11,
              padding: "9px 18px",
              fontFamily: "'Switzer',sans-serif",
              fontSize: 14,
              fontWeight: active ? 500 : 400,
              color: active ? "#fff" : "#596392",
              background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
              boxShadow: active ? "0 5px 14px rgba(39,63,249,.35)" : "none",
              transition: "color .15s ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

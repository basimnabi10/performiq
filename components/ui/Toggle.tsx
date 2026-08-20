"use client";

import * as React from "react";

export interface ToggleProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/** Pill toggle switch. On = blue gradient; off = slate track. */
export function Toggle({ checked = false, onChange, disabled = false, style }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      style={{
        width: 50,
        height: 28,
        borderRadius: 999,
        border: "none",
        padding: 0,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(168,175,203,.6)",
        boxShadow: checked ? "inset 0 1px 3px rgba(14,6,125,.4)" : "none",
        transition: "background .2s ease",
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 5px rgba(0,0,0,.2)",
          transition: "left .2s ease",
        }}
      />
    </button>
  );
}

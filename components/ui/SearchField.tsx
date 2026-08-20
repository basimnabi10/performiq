"use client";

import * as React from "react";

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Leading Iconify icon. Default "ant-design:search-outlined". */
  icon?: string;
  /** Optional fixed width (px or CSS string). */
  width?: number | string;
}

/** Frosted search / text field with a leading icon. Focus lifts a 4px blue ring. */
export function SearchField({
  icon = "ant-design:search-outlined",
  placeholder = "Search…",
  width,
  style,
  onFocus,
  onBlur,
  ...rest
}: SearchFieldProps) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width,
        background: "rgba(255,255,255,.55)",
        border: focus ? "1.5px solid #273FF9" : "1px solid rgba(255,255,255,.75)",
        borderRadius: 14,
        padding: "12px 16px",
        boxShadow: focus ? "0 0 0 4px rgba(39,63,249,.12)" : "0 6px 18px rgba(70,100,190,.08)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        backdropFilter: "blur(24px) saturate(150%)",
        transition: "box-shadow .18s ease, border-color .18s ease",
        ...style,
      }}
    >
      <iconify-icon icon={icon} width="17" style={{ color: "#767FA5", flexShrink: 0 }} />
      <input
        placeholder={placeholder}
        onFocus={(e) => {
          setFocus(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          onBlur?.(e);
        }}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          width: "100%",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 14,
          fontWeight: 400,
          color: "#252944",
        }}
        {...rest}
      />
    </div>
  );
}

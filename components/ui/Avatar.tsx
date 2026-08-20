import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name; initials are derived for the fallback chip. */
  name?: string;
  /** Size in px. Default 38. */
  size?: number;
  /** Circular instead of rounded-square. */
  round?: boolean;
  /** Render the PerformIQ brand glass orb instead of an initials chip. */
  orb?: boolean;
}

/** PerformIQ avatar — a slate gradient chip (initials) or the brand glass orb. */
export function Avatar({ name, size = 38, round = false, orb = false, style, ...rest }: AvatarProps) {
  const initials = (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const grad = orb
    ? "radial-gradient(circle at 32% 28%,#ffffff,#8BB0FF 28%,#273FF9 72%,#1C10C9)"
    : "linear-gradient(135deg,#A8AFCB,#596392)";
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: round || orb ? "50%" : Math.round(size * 0.3),
        background: grad,
        boxShadow: orb
          ? "0 6px 16px rgba(39,63,249,.4),inset -2px -3px 6px rgba(14,6,125,.5),inset 2px 2px 6px rgba(255,255,255,.6)"
          : "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontWeight: 500,
        fontSize: Math.round(size * 0.36),
        border: "2px solid rgba(255,255,255,.8)",
        ...style,
      }}
      {...rest}
    >
      {!orb && initials ? initials : null}
    </span>
  );
}

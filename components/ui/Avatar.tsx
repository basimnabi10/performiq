"use client";

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
  /** Photo URL. Falls back to the initials chip if it is missing or fails. */
  src?: string | null;
}

// Deterministic per-person palette so avatars stay visually distinct across
// re-renders/reloads without persisting a color on the Member record.
const AVATAR_PALETTE = [
  "#8BB0FF,#3A63FA",
  "#A8AFCB,#596392",
  "#C8CBE1,#6262A8",
  "#C8CBE1,#8891B8",
  "#B8BED6,#767FA5",
];

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** PerformIQ avatar — a per-person gradient chip (initials) or the brand glass orb. */
export function Avatar({ name, size = 38, round = false, orb = false, src, style, ...rest }: AvatarProps) {
  // A broken photo URL must not leave an empty grey hole where a person is:
  // fall back to the initials chip, which is what everyone without a photo
  // already shows.
  const [failed, setFailed] = React.useState(false);
  const showPhoto = Boolean(src) && !failed && !orb;
  const initials = (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const grad = orb
    ? "radial-gradient(circle at 32% 28%,#ffffff,#8BB0FF 28%,#273FF9 72%,#1C10C9)"
    : `linear-gradient(135deg,${paletteFor(name ?? "")})`;
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
        fontFamily: "'Switzer',sans-serif",
        fontWeight: 500,
        fontSize: Math.round(size * 0.36),
        border: "2px solid rgba(255,255,255,.8)",
        ...style,
      }}
      {...rest}
    >
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element --
           avatars come from arbitrary hosts (Odoo, uploads), which
           next/image would need per-domain configuration for. */
        <img
          src={src as string}
          alt={name ?? "Profile photo"}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "inherit",
            display: "block",
          }}
        />
      ) : !orb && initials ? (
        initials
      ) : null}
    </span>
  );
}

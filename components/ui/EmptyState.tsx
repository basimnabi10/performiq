import Link from "next/link";

/**
 * The zero-data state for a page or panel. A blank grid reads as "broken";
 * this says what's missing and what to do about it, and links onward when
 * the next step lives on another page.
 */
export function EmptyState({
  icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon: string;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: "48px 24px",
        background: "rgba(255,255,255,.20)",
        border: "1.5px dashed rgba(168,175,203,.45)",
        borderRadius: 22,
      }}
    >
      <span
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: "rgba(58,99,250,.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#273FF9",
        }}
      >
        <iconify-icon icon={icon} width={24} />
      </span>
      <div style={{ fontSize: 17, fontWeight: 500, color: "#181835", marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#596392", lineHeight: 1.55, maxWidth: 460 }}>{body}</div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginTop: 8,
            height: 42,
            padding: "0 18px",
            borderRadius: 13,
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            background: "linear-gradient(135deg,#3A63FA,#273FF9)",
            boxShadow: "0 10px 24px rgba(39,63,249,.35)",
            textDecoration: "none",
          }}
        >
          {actionLabel}
          <iconify-icon icon="ant-design:arrow-right-outlined" width={14} />
        </Link>
      ) : null}
    </div>
  );
}

import Link from "next/link";

export interface TeamFilterOption {
  id: string;
  label: string;
  count: number;
}

export function TeamFilterTabs({
  options,
  activeId,
  basePath,
}: {
  options: TeamFilterOption[];
  activeId?: string;
  basePath: string;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = opt.id === (activeId ?? "all");
        const href = opt.id === "all" ? basePath : `${basePath}?team=${opt.id}`;
        return (
          <Link
            key={opt.id}
            href={href}
            style={{
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              color: active ? "#fff" : "#596392",
              background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.4)",
              padding: "8px 14px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {opt.label} · {opt.count}
          </Link>
        );
      })}
    </div>
  );
}

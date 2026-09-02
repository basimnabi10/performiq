"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { Avatar } from "@/components/ui/Avatar";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export interface SidebarProps {
  orgName: string;
  workspaceLabel: string;
  workspaceSub: string;
  workspaceIcon: string;
  name: string;
  role: string;
  sections: NavSection[];
  switchViewHref?: string;
  switchViewLabel?: string;
}

export function Sidebar({
  orgName,
  workspaceLabel,
  workspaceSub,
  workspaceIcon,
  name,
  role,
  sections,
  switchViewHref,
  switchViewLabel,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 256,
        flexShrink: 0,
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        background: "rgba(255,255,255,.35)",
        borderRight: "1px solid rgba(255,255,255,.5)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            background:
              "radial-gradient(circle at 32% 28%,#fff,#8BB0FF 28%,#273FF9 72%,#1C10C9)",
            boxShadow:
              "0 5px 12px rgba(39,63,249,.4),inset -2px -3px 6px rgba(14,6,125,.5),inset 2px 2px 6px rgba(255,255,255,.6)",
          }}
        />
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835", letterSpacing: "-.01em" }}>
            PerformIQ
          </div>
          <div style={{ fontSize: 11, color: "#767FA5" }}>{orgName}</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 12px",
          borderRadius: 13,
          background: "rgba(39,63,249,.08)",
          border: "1px solid rgba(39,63,249,.15)",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg,#3A63FA,#273FF9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <iconify-icon icon={workspaceIcon} width="16" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#181835",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {workspaceLabel}
          </div>
          <div style={{ fontSize: 11, color: "#596392" }}>{workspaceSub}</div>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#767FA5",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "6px 12px 4px",
            }}
          >
            {section.label}
          </div>
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 12px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  color: active ? "#181835" : "#454D7A",
                  textDecoration: "none",
                  background: active ? "rgba(255,255,255,.85)" : "transparent",
                  border: active ? "1px solid rgba(255,255,255,.9)" : "1px solid transparent",
                  boxShadow: active ? "0 8px 20px rgba(70,100,190,.12)" : "none",
                }}
              >
                <iconify-icon
                  icon={item.icon}
                  width="18"
                  style={{ color: active ? "#273FF9" : "#767FA5", flexShrink: 0 }}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {switchViewHref ? (
          <Link
            href={switchViewHref}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,.45)",
              border: "1px dashed rgba(168,175,203,.55)",
              fontSize: 12,
              color: "#596392",
              textDecoration: "none",
            }}
          >
            <iconify-icon icon="ant-design:swap-outlined" width="15" style={{ color: "#273FF9" }} />
            {switchViewLabel}
          </Link>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: 12,
            borderRadius: 14,
            background: "rgba(255,255,255,.5)",
            border: "1px solid rgba(255,255,255,.6)",
          }}
        >
          <Avatar name={name} size={38} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#181835",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 11, color: "#767FA5" }}>{role}</div>
          </div>
          <form action={async () => { await logout(); }}>
            <button
              type="submit"
              title="Sign out"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                color: "#767FA5",
              }}
            >
              <iconify-icon icon="ant-design:logout-outlined" width="16" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

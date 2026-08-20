"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reviews", label: "Reviews" },
  { href: "/teams", label: "Team" },
  { href: "/members", label: "Members" },
  { href: "/analytics", label: "Analytics" },
  { href: "/learning", label: "Learning" },
];

export function Topbar({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 32% 28%,#ffffff,#8BB0FF 28%,#273FF9 72%,#1C10C9)",
            boxShadow:
              "0 5px 12px rgba(39,63,249,.4),inset -2px -3px 6px rgba(14,6,125,.5),inset 2px 2px 6px rgba(255,255,255,.6)",
          }}
        />
        <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-.01em" }}>PerformIQ</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(255,255,255,.25)",
          WebkitBackdropFilter: "blur(35px)",
          backdropFilter: "blur(35px)",
          border: "1px solid rgba(255,255,255,.40)",
          borderRadius: 16,
          padding: 5,
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? "#fff" : "#596392",
                background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                padding: "9px 16px",
                borderRadius: 11,
                boxShadow: active ? "0 5px 14px rgba(39,63,249,.35)" : "none",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <IconButton
          icon="ant-design:bell-outlined"
          variant="chrome"
          size={42}
          label="Notifications"
        />
        <form
          action={async () => {
            await logout();
          }}
        >
          <button
            type="submit"
            title={`Sign out (${name})`}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
          >
            <Avatar name={name} size={42} round />
          </button>
        </form>
      </div>
    </div>
  );
}

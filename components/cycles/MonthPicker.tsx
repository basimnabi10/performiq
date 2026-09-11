"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface MonthOption {
  /** "2026-09" — what goes in the ?month= parameter. */
  key: string;
  label: string;
  status: "in_progress" | "closed" | "planning";
  /** Only set while the month is still running. */
  daysLeft?: number;
}

/**
 * Month selector for the dashboard. Picking a month re-renders the whole page
 * against it, so every number on screen belongs to the same period — a
 * dropdown that only filtered one panel would leave the stat cards showing
 * this month beside a table showing April.
 *
 * Styled to match ScopePicker deliberately: they sit side by side and do the
 * same kind of job, so two different-looking controls would read as two
 * different kinds of thing.
 */
export function MonthPicker({ months, selectedKey }: { months: MonthOption[]; selectedKey: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const selected = months.find((m) => m.key === selectedKey) ?? months[0];
  if (!selected) return null;

  function pick(key: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      {open ? (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      ) : null}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          height: 50,
          padding: "0 16px",
          borderRadius: 16,
          background: open ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.75)",
          border: open ? "1.5px solid rgba(58,99,250,.4)" : "1.5px solid rgba(255,255,255,.8)",
          boxShadow: "0 6px 18px rgba(70,100,190,.1)",
          cursor: "pointer",
          position: "relative",
          zIndex: 41,
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 9,
            background: "linear-gradient(135deg,#3A63FA,#273FF9)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <iconify-icon icon="ant-design:calendar-outlined" width="15" />
        </span>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#181835", whiteSpace: "nowrap" }}>{selected.label}</span>
        <span style={{ fontSize: 12, color: "#767FA5", whiteSpace: "nowrap" }}>
          {selected.status === "in_progress" ? `${selected.daysLeft ?? 0} days left` : "Closed"}
        </span>
        <iconify-icon icon="ant-design:down-outlined" width="13" style={{ color: "#767FA5" }} />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 308,
            zIndex: 42,
            background: "rgba(255,255,255,.96)",
            WebkitBackdropFilter: "blur(40px)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,.8)",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(24,24,53,.25)",
          }}
        >
          <div style={{ maxHeight: 300, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            {months.map((m) => {
              const active = m.key === selectedKey;
              return (
                <div
                  key={m.key}
                  onClick={() => pick(m.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 11,
                    cursor: "pointer",
                    background: active ? "rgba(39,63,249,.08)" : "transparent",
                  }}
                >
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "#181835" }}>{m.label}</span>
                    <span style={{ fontSize: 11.5, color: "#767FA5" }}>
                      {m.status === "in_progress" ? `Active · ${m.daysLeft ?? 0} days left` : "Closed cycle"}
                    </span>
                  </span>
                  {active ? (
                    <iconify-icon icon="ant-design:check-outlined" width="14" style={{ color: "#273FF9" }} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

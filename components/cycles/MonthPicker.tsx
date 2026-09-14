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
        className="piq-dropdown"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        style={{ position: "relative", zIndex: 41 }}
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
        <span style={{ whiteSpace: "nowrap" }}>{selected.label}</span>
        <span className="piq-dropdown-meta" style={{ whiteSpace: "nowrap" }}>
          {selected.status === "in_progress" ? `${selected.daysLeft ?? 0} days left` : "Closed"}
        </span>
        <iconify-icon icon="ant-design:down-outlined" width="13" style={{ color: "#767FA5" }} />
      </button>

      {open ? (
        <div className="piq-dropdown-menu" style={{ width: 268 }} role="listbox">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {months.map((m) => {
              const active = m.key === selectedKey;
              return (
                <div
                  key={m.key}
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(m.key)}
                  className={active ? "piq-dropdown-item is-active" : "piq-dropdown-item"}
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

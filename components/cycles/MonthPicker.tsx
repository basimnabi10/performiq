"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface MonthOption {
  /** "2026-09" — what goes in the ?month= parameter. */
  key: string;
  label: string;
  status: "in_progress" | "closed" | "planning";
  /** Only set for the month currently running. */
  daysLeft?: number;
}

/**
 * Month selector for the dashboard. Picking a month re-renders the whole page
 * against it, so every number on screen belongs to the same period — a
 * dropdown that only filtered one panel would leave the stat cards showing
 * this month beside a table showing April.
 *
 * The current month is not special-cased in the list: a closed month is still
 * openable for reading, and a past month someone is still submitting into is
 * exactly what a reader needs to be able to find.
 */
export function MonthPicker({ months, selectedKey }: { months: MonthOption[]; selectedKey: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // A dropdown that only closes on its own trigger traps the page when
  // someone clicks elsewhere, so close on any outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = months.find((m) => m.key === selectedKey) ?? months[0];
  if (!selected) return null;

  function choose(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", key);
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="piq-monthpicker"
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: selected.status === "in_progress" ? "#273FF9" : "var(--text-placeholder)",
            boxShadow: selected.status === "in_progress" ? "0 0 0 3px rgba(39,63,249,.18)" : "none",
            flexShrink: 0,
          }}
        />
        <strong style={{ fontWeight: 500 }}>{selected.label}</strong>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span style={{ color: "var(--text-secondary)" }}>
          {selected.status === "in_progress"
            ? `${selected.daysLeft ?? 0} days left`
            : "Closed"}
        </span>
        <iconify-icon icon="ant-design:down-outlined" width={12} style={{ color: "var(--text-tertiary)" }} />
      </button>

      {open ? (
        <div role="listbox" className="piq-monthpicker-menu">
          {months.map((m) => {
            const isSelected = m.key === selectedKey;
            return (
              <button
                key={m.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(m.key)}
                className={isSelected ? "piq-monthpicker-item is-selected" : "piq-monthpicker-item"}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                    {m.status === "in_progress" ? `Active · ${m.daysLeft ?? 0} days left` : "Closed month"}
                  </span>
                </span>
                {isSelected ? (
                  <iconify-icon icon="ant-design:check-outlined" width={13} style={{ color: "var(--color-primary)" }} />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

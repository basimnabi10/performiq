"use client";

import { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  /** Shown under the label in the menu — what picking this actually means. */
  description?: string;
  /** Shown on the right of the row, e.g. a member count. */
  meta?: string;
  icon?: string;
}

/**
 * The form dropdown, matching ScopePicker and MonthPicker rather than the
 * browser's own select: those two sit at the top of most pages, so a native
 * control inside a modal read as a different kind of thing.
 *
 * Handles one value or several. The multi variant keeps the menu open while
 * you tick — closing after each pick makes choosing four teams feel like
 * fighting the control.
 */
export function Dropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Select…",
  error,
  hint,
  searchable,
  disabled,
}: {
  label: string;
  options: DropdownOption[];
  /** One value, or the selected set when `multiple`. */
  value: string | string[];
  onChange: (next: string & string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  error?: string;
  hint?: string;
  /** Defaults on once there are enough options for scanning to be work. */
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selected = options.filter((o) => selectedValues.includes(o.value));
  const showSearch = searchable ?? options.length > 6;

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function pick(optionValue: string) {
    if (multiple) {
      const next = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(next as string & string[]);
      return;
    }
    onChange(optionValue as string & string[]);
    setOpen(false);
  }

  const summary =
    selected.length === 0
      ? placeholder
      : multiple
        ? selected.length === 1
          ? selected[0].label
          : `${selected[0].label} +${selected.length - 1}`
        : selected[0].label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="piq-caption">{label}</span>

      <div style={{ position: "relative" }} ref={ref}>
        {open ? <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} /> : null}

        <button
          type="button"
          className="piq-dropdown"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          style={{
            position: "relative",
            zIndex: 41,
            width: "100%",
            justifyContent: "space-between",
            borderRadius: "var(--radius-md)",
            minHeight: 44,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            borderColor: error ? "rgba(180,35,24,.55)" : undefined,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 0,
              color: selected.length ? "var(--text-strong)" : "var(--text-secondary)",
            }}
          >
            {selected[0]?.icon ? <iconify-icon icon={selected[0].icon} width="15" style={{ color: "#273FF9" }} /> : null}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
          </span>
          <iconify-icon icon="ant-design:down-outlined" width="13" style={{ color: "#767FA5", flexShrink: 0 }} />
        </button>

        {open ? (
          <div className="piq-dropdown-menu" style={{ width: "100%", minWidth: 240 }} role="listbox">
            {showSearch ? (
              <div style={{ padding: "12px 12px 8px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 38,
                    padding: "0 12px",
                    background: "rgba(255,255,255,.8)",
                    border: "1.5px solid rgba(168,175,203,.4)",
                    borderRadius: 10,
                  }}
                >
                  <iconify-icon icon="ant-design:search-outlined" width="15" style={{ color: "#A8AFCB" }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    autoFocus
                    style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "#252944", outline: "none" }}
                  />
                </div>
              </div>
            ) : null}

            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                padding: showSearch ? "0 12px 12px" : 12,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {filtered.length === 0 ? (
                <div className="piq-caption" style={{ padding: "10px 4px" }}>
                  Nothing matches that.
                </div>
              ) : (
                filtered.map((o) => {
                  const active = selectedValues.includes(o.value);
                  return (
                    <div
                      key={o.value}
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(o.value)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 11px",
                        borderRadius: 11,
                        cursor: "pointer",
                        background: active ? "rgba(58,99,250,.1)" : "transparent",
                        border: active ? "1px solid rgba(58,99,250,.3)" : "1px solid transparent",
                      }}
                    >
                      {multiple ? (
                        <span
                          style={{
                            width: 17,
                            height: 17,
                            marginTop: 1,
                            borderRadius: 5,
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            background: active ? "#273FF9" : "transparent",
                            border: active ? "1.5px solid #273FF9" : "1.5px solid rgba(168,175,203,.7)",
                          }}
                        >
                          {active ? <iconify-icon icon="ant-design:check-outlined" width="11" /> : null}
                        </span>
                      ) : o.icon ? (
                        <iconify-icon icon={o.icon} width="16" style={{ color: "#273FF9", marginTop: 1, flexShrink: 0 }} />
                      ) : null}

                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: "var(--text-strong)",
                          }}
                        >
                          {o.label}
                          {o.meta ? <span className="piq-caption" style={{ flexShrink: 0 }}>{o.meta}</span> : null}
                        </span>
                        {o.description ? (
                          <span
                            style={{ display: "block", fontSize: 11.5, color: "#596392", marginTop: 2, lineHeight: 1.45 }}
                          >
                            {o.description}
                          </span>
                        ) : null}
                      </span>

                      {!multiple && active ? (
                        <iconify-icon
                          icon="ant-design:check-outlined"
                          width="13"
                          style={{ color: "#273FF9", marginTop: 3, flexShrink: 0 }}
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <span role="alert" style={{ fontSize: 11.5, color: "#B42318", lineHeight: 1.5 }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ fontSize: 11.5, color: "#596392", lineHeight: 1.5 }}>{hint}</span>
      ) : null}
    </div>
  );
}

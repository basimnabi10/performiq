"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface ScopeOption {
  id: string;
  label: string;
  meta: string;
  icon: string;
}

export function ScopePicker({
  options,
  selectedId,
  basePath,
}: {
  options: ScopeOption[];
  selectedId: string;
  basePath: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === selectedId) ?? options[0];
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function pick(id: string) {
    setOpen(false);
    setQuery("");
    router.push(id === "all" ? basePath : `${basePath}?team=${id}`);
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      ) : null}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 46,
          padding: "0 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,.5)",
          border: "1px solid rgba(255,255,255,.7)",
          cursor: "pointer",
          position: "relative",
          zIndex: 41,
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#273FF9",
            boxShadow: "0 0 0 3px rgba(39,63,249,.18)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: "#181835", whiteSpace: "nowrap" }}>{selected?.label ?? "All teams"}</span>
        <span style={{ fontSize: 11, color: "#767FA5", whiteSpace: "nowrap" }}>{selected?.meta}</span>
        <iconify-icon icon="ant-design:down-outlined" width="12" style={{ color: "#767FA5" }} />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 280,
            zIndex: 42,
            background: "rgba(255,255,255,.95)",
            WebkitBackdropFilter: "blur(30px)",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,.8)",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(24,24,53,.2)",
          }}
        >
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
                placeholder="Search teams…"
                autoFocus
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "#252944", outline: "none" }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.length === 0 ? (
              <div className="piq-caption" style={{ padding: "10px 4px" }}>
                No team matches that search.
              </div>
            ) : (
              filtered.map((o) => {
                const active = o.id === selectedId;
                return (
                  <div
                    key={o.id}
                    onClick={() => pick(o.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 12,
                      cursor: "pointer",
                      background: active ? "rgba(39,63,249,.08)" : "transparent",
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(168,175,203,.25)",
                        color: active ? "#fff" : "#767FA5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <iconify-icon icon={o.icon} width="15" />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#767FA5" }}>{o.meta}</div>
                    </div>
                    {active ? (
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#273FF9",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <iconify-icon icon="ant-design:check-outlined" width="11" />
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

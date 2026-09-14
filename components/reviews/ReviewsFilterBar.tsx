"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const SCORE_CHIPS = [
  { label: "Any", value: "" },
  { label: "3.0+", value: "3" },
  { label: "3.5+", value: "3.5" },
  { label: "4.0+", value: "4" },
  { label: "4.5+", value: "4.5" },
];

export function ReviewsFilterBar({
  teams,
  basePath,
}: {
  teams: { id: string; name: string }[];
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushWith(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const activeScore = searchParams.get("minScore") ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pushWith({ q: q || null });
          }}
          style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}
        >
          <iconify-icon
            icon="ant-design:search-outlined"
            width={15}
            style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "#A8AFCB", pointerEvents: "none" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => pushWith({ q: q || null })}
            placeholder="Search member name…"
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </form>

        <select className="piq-select"
          value={searchParams.get("team") ?? ""}
          onChange={(e) => pushWith({ team: e.target.value || null })}
          style={selectStyle}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select className="piq-select"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => pushWith({ status: e.target.value || null })}
          style={selectStyle}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
          <option value="pending">Pending</option>
          <option value="draft">Draft</option>
        </select>
        <select
          className="piq-select"
          value={searchParams.get("sort") ?? "recent"}
          onChange={(e) => pushWith({ sort: e.target.value === "recent" ? null : e.target.value })}
          style={{ ...selectStyle, flex: "0 1 210px" }}
        >
          <option value="recent">Sort: Most recent</option>
          <option value="score_desc">Sort: Score (high to low)</option>
          <option value="score_asc">Sort: Score (low to high)</option>
        </select>

        <ViewToggle />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SCORE_CHIPS.map((chip) => {
            const active = activeScore === chip.value;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => pushWith({ minScore: chip.value || null })}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "7px 13px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  color: active ? "#fff" : "#596392",
                  background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.5)",
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/**
 * List or grid. A table is better for scanning many reviews and comparing
 * scores down a column; cards are better for working through people one at a
 * time. Both are legitimate, so the choice stays with the reader and rides in
 * the URL, which means a link shared with someone opens the way they left it.
 */
function ViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const layout = searchParams.get("layout") === "grid" ? "grid" : "list";

  function setLayout(next: "list" | "grid") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "grid") params.set("layout", "grid");
    else params.delete("layout");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  }

  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(255,255,255,.6)", border: "1px solid rgba(100,116,139,.35)" }}>
      {(["list", "grid"] as const).map((option) => {
        const active = layout === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            title={option === "list" ? "List view" : "Grid view"}
            onClick={() => setLayout(option)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
              background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
            }}
          >
            <iconify-icon
              icon={option === "list" ? "ant-design:unordered-list-outlined" : "ant-design:appstore-outlined"}
              width={16}
            />
          </button>
        );
      })}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  fontSize: 14,
  color: "#181835",
  background: "rgba(255,255,255,.8)",
  border: "1.5px solid rgba(168,175,203,.4)",
  borderRadius: 13,
  fontFamily: "'Switzer',sans-serif",
  outline: "none",
};

// .piq-select sets width: 100% so it fills a form column; on this row the
// controls sit side by side instead, so each one gets its own basis.
const selectStyle: React.CSSProperties = {
  width: "auto",
  flex: "0 1 180px",
  minWidth: 150,
};

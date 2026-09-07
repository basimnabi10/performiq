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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pushWith({ q: q || null });
          }}
          style={{ flex: "1 1 220px", minWidth: 200 }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => pushWith({ q: q || null })}
            placeholder="Search by member name…"
            style={inputStyle}
          />
        </form>

        <select
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

        <select
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
      </div>

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

const selectStyle: React.CSSProperties = {
  height: 44,
  padding: "0 14px",
  fontSize: 14,
  color: "#181835",
  background: "rgba(255,255,255,.8)",
  border: "1.5px solid rgba(168,175,203,.4)",
  borderRadius: 13,
  cursor: "pointer",
  fontFamily: "'Switzer',sans-serif",
};

"use client";

import { useRouter } from "next/navigation";

export function TeamSelect({
  teams,
  selectedId,
  basePath,
}: {
  teams: { id: string; name: string }[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(e.target.value === "all" ? basePath : `${basePath}?team=${e.target.value}`)}
      style={{
        height: 44,
        padding: "0 14px",
        fontSize: 14,
        color: "#181835",
        background: "rgba(255,255,255,.8)",
        border: "1.5px solid rgba(168,175,203,.4)",
        borderRadius: 13,
        cursor: "pointer",
        fontFamily: "'Switzer',sans-serif",
      }}
    >
      <option value="all">All teams</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

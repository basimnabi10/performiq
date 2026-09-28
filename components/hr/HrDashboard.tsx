"use client";

import { useState } from "react";
import type { HrDashboard as HrDashboardData } from "@/lib/hr-shape";
import { HrCalibrationTab } from "./HrCalibrationTab";
import { HrMemberDrawer } from "./HrMemberDrawer";
import { HrOverview } from "./HrOverview";
import { HrPeopleTab } from "./HrPeopleTab";
import { HrTeamsTab } from "./HrTeamsTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "teams", label: "Teams" },
  { key: "calibration", label: "Calibration" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * The four HR views and the member drawer.
 *
 * Tabs are client state rather than routes: all four read the same month's
 * data, already loaded, and a round-trip per tab would make switching feel
 * like leaving the page it belongs to. The month itself stays in the URL,
 * because that is the thing worth linking to and sharing.
 */
export function HrDashboard({ data }: { data: HrDashboardData }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? (data.people.find((p) => p.memberId === selectedId) ?? null) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 4,
          background: "rgba(255,255,255,.25)",
          WebkitBackdropFilter: "blur(35px)",
          backdropFilter: "blur(35px)",
          border: "1px solid rgba(255,255,255,.40)",
          borderRadius: 16,
          padding: 5,
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
          flexWrap: "wrap",
        }}
        role="tablist"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                font: "inherit",
                fontSize: 13,
                fontWeight: 500,
                padding: "9px 18px",
                borderRadius: 12,
                border: "1px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                color: active ? "#fff" : "#454D7A",
                background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                boxShadow: active ? "0 6px 16px rgba(39,63,249,.28)" : "none",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? <HrOverview data={data} onSelect={setSelectedId} /> : null}
      {tab === "people" ? <HrPeopleTab data={data} onSelect={setSelectedId} /> : null}
      {tab === "teams" ? <HrTeamsTab data={data} /> : null}
      {tab === "calibration" ? <HrCalibrationTab data={data} /> : null}

      {selected ? (
        <HrMemberDrawer
          person={selected}
          cycleLabel={data.selectedLabel}
          previousLabel={data.previousLabel}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface KpiPerformancePoint {
  name: string;
  avgScore: number;
  targetNumeric: number;
}

export function KpiPerformanceChart({ data }: { data: KpiPerformancePoint[] }) {
  if (data.length === 0) {
    return <div className="piq-caption">No scored KPIs yet for this scope.</div>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,175,203,.3)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#767FA5" }} />
          <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "#767FA5" }} />
          <Tooltip
            contentStyle={{
              background: "rgba(255,255,255,.9)",
              border: "1px solid rgba(255,255,255,.8)",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Bar dataKey="avgScore" name="Avg score" fill="#273FF9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { createTeam } from "@/actions/teams";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

export function CreateTeamModal({ departments }: { departments: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const { execute, isExecuting, result, reset } = useAction(createTeam, {
    onSuccess: () => {
      setOpen(false);
      setName("");
    },
  });

  if (!open) {
    return (
      <Button icon="ant-design:plus-outlined" onClick={() => setOpen(true)}>
        New team
      </Button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={() => {
        setOpen(false);
        reset();
      }}
    >
      <FrostCard
        tone="solid"
        style={{ width: 380, display: "flex", flexDirection: "column", gap: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">New team</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ name, departmentId });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Team name
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </label>
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Department
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={inputStyle}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" disabled={isExecuting}>
            {isExecuting ? "Creating…" : "Create team"}
          </Button>
        </form>
      </FrostCard>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Switzer',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};

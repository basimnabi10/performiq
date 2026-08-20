"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { assignCourse } from "@/actions/learning";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

interface MemberOption {
  id: string;
  name: string;
}

export function AssignLearningModal({ courseId, members }: { courseId: string; members: MemberOption[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  const { execute, isExecuting, result, reset } = useAction(assignCourse, {
    onSuccess: () => {
      setOpen(false);
      setSelected([]);
    },
  });

  if (!open) {
    return (
      <Button variant="secondary" size="sm" icon="ant-design:send-outlined" onClick={() => setOpen(true)}>
        Assign
      </Button>
    );
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
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
        style={{ width: 420, display: "flex", flexDirection: "column", gap: 14, maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Assign learning</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ courseId, memberIds: selected, dueDate: dueDate || undefined });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {members.map((m) => (
              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                {m.name}
              </label>
            ))}
          </div>
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Due date (optional)
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
          </label>
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" disabled={isExecuting || selected.length === 0}>
            {isExecuting ? "Assigning…" : `Assign to ${selected.length || 0}`}
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
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};

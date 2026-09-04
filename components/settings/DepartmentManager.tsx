"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { createDepartment, renameDepartment } from "@/actions/organization";
import { Button } from "@/components/ui/Button";

export interface DepartmentRow {
  id: string;
  name: string;
  teamCount: number;
  memberCount: number;
}

export function DepartmentManager({ departments }: { departments: DepartmentRow[] }) {
  const [newName, setNewName] = useState("");
  const createAction = useAction(createDepartment, { onSuccess: () => setNewName("") });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {departments.length === 0 ? (
          <div className="piq-caption">No departments yet — add your first one below.</div>
        ) : (
          departments.map((d) => <DepartmentRowItem key={d.id} department={d} />)
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createAction.execute({ name: newName });
        }}
        style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New department name"
          required
          style={{
            flex: 1,
            height: 44,
            padding: "0 15px",
            fontSize: 14,
            color: "#181835",
            background: "rgba(255,255,255,.7)",
            border: "1.5px solid rgba(168,175,203,.4)",
            borderRadius: 12,
            fontFamily: "'Switzer',sans-serif",
            outline: "none",
          }}
        />
        <Button type="submit" icon="ant-design:plus-outlined" disabled={createAction.isExecuting}>
          {createAction.isExecuting ? "Adding…" : "Add department"}
        </Button>
      </form>
      {createAction.result.serverError ? (
        <div className="piq-caption" style={{ color: "#FF5A5F" }}>
          {createAction.result.serverError}
        </div>
      ) : null}
    </div>
  );
}

function DepartmentRowItem({ department }: { department: DepartmentRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const { execute, isExecuting, result } = useAction(renameDepartment, { onSuccess: () => setEditing(false) });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "rgba(255,255,255,.5)",
        border: "1px solid rgba(168,175,203,.25)",
        borderRadius: 14,
      }}
    >
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            height: 38,
            padding: "0 12px",
            fontSize: 14,
            color: "#181835",
            background: "rgba(255,255,255,.85)",
            border: "1.5px solid rgba(58,99,250,.4)",
            borderRadius: 10,
            fontFamily: "'Switzer',sans-serif",
            outline: "none",
          }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{department.name}</div>
          <div style={{ fontSize: 11, color: "#767FA5" }}>
            {department.teamCount} teams · {department.memberCount} members
          </div>
        </div>
      )}
      {result.serverError ? (
        <div className="piq-caption" style={{ color: "#FF5A5F" }}>
          {result.serverError}
        </div>
      ) : null}
      {editing ? (
        <>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing(false);
              setName(department.name);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={isExecuting} onClick={() => execute({ departmentId: department.id, name })}>
            {isExecuting ? "Saving…" : "Save"}
          </Button>
        </>
      ) : (
        <Button size="sm" variant="secondary" icon="ant-design:edit-outlined" onClick={() => setEditing(true)}>
          Rename
        </Button>
      )}
    </div>
  );
}

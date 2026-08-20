"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { inviteMember } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

interface TeamOption {
  id: string;
  name: string;
}

export function InviteMemberModal({
  teams,
  simple = false,
}: {
  teams: TeamOption[];
  /** Team-detail entry point: skip team selection (fixed) and hide the Odoo toggle. */
  simple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [mode, setMode] = useState<"manual" | "odoo">("manual");
  const [email, setEmail] = useState("");
  const [lookupTerm, setLookupTerm] = useState("");

  const { execute, isExecuting, result, reset } = useAction(inviteMember, {
    onSuccess: () => {
      setEmail("");
      setLookupTerm("");
    },
  });

  const error = result.serverError;
  const success = result.data;

  function close() {
    setOpen(false);
    reset();
  }

  if (!open) {
    return (
      <Button icon="ant-design:user-add-outlined" onClick={() => setOpen(true)}>
        Invite member
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
      onClick={close}
    >
      <FrostCard
        tone="solid"
        style={{ width: 460, display: "flex", flexDirection: "column", gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Invite member</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={close} />
        </div>

        {success ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="piq-body">
              <strong>{success.name}</strong> ({success.email}) has been invited
              {success.source === "odoo" ? " — auto-filled from Odoo HR." : "."}
            </div>
            <Button onClick={close}>Done</Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "manual") {
                execute({ mode: "manual", teamId, email });
              } else {
                execute({ mode: "odoo", teamId, lookupTerm });
              }
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {simple ? null : (
              <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                Team
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={selectStyle} required>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {simple ? null : (
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  type="button"
                  variant={mode === "manual" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setMode("manual")}
                >
                  Add manually
                </Button>
                <Button
                  type="button"
                  variant={mode === "odoo" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setMode("odoo")}
                >
                  Fetch from Odoo
                </Button>
              </div>
            )}

            {mode === "manual" ? (
              <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={selectStyle}
                  placeholder="name@company.com"
                />
              </label>
            ) : (
              <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                Email or employee ID
                <input
                  required
                  value={lookupTerm}
                  onChange={(e) => setLookupTerm(e.target.value)}
                  style={selectStyle}
                  placeholder="e.g. E-2041 or priya.raman@acme.example"
                />
              </label>
            )}

            {error ? (
              <div className="piq-caption" style={{ color: "#FF5A5F" }}>
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={isExecuting} style={{ width: "100%" }}>
              {isExecuting ? "Sending invite…" : "Send invite"}
            </Button>
          </form>
        )}
      </FrostCard>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};

"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { inviteMember, listOdooSuggestions, lookupOdooEmployee } from "@/actions/members";
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
  variant = "primary",
  size,
  kpiCount,
}: {
  teams: TeamOption[];
  /** Team-detail entry point: skip team selection (fixed) and hide the Odoo toggle. */
  simple?: boolean;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "header";
  /** Team-detail entry point: spells out what the invitee inherits on joining. */
  kpiCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [mode, setMode] = useState<"manual" | "odoo">("manual");
  const [email, setEmail] = useState("");
  const [lookupTerm, setLookupTerm] = useState("");

  const suggestions = useAction(listOdooSuggestions);
  const lookup = useAction(lookupOdooEmployee, { onSuccess: () => setLookupTerm("") });
  const invite = useAction(inviteMember, {
    onSuccess: () => {
      setEmail("");
      setLookupTerm("");
      lookup.reset();
    },
  });

  useEffect(() => {
    if (open && !simple && mode === "odoo" && !suggestions.result.data) {
      suggestions.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const error = invite.result.serverError;
  const success = invite.result.data;
  const fetched = lookup.result.data;

  function close() {
    setOpen(false);
    invite.reset();
    lookup.reset();
    setLookupTerm("");
    setEmail("");
  }

  if (!open) {
    return (
      <Button icon="ant-design:user-add-outlined" variant={variant} size={size} onClick={() => setOpen(true)}>
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
        style={{ width: 500, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Invite member</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={close} />
        </div>

        {success ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(58,99,250,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#273FF9",
              }}
            >
              <iconify-icon icon="ant-design:check-circle-filled" width={30} />
            </span>
            <div className="piq-body">
              <strong>{success.name}</strong> ({success.email}) has been invited
              {success.source === "odoo" ? " — auto-filled from Odoo HR." : "."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  invite.reset();
                  lookup.reset();
                }}
              >
                Add another
              </Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "manual") {
                invite.execute({ mode: "manual", teamId, email });
              } else if (fetched) {
                invite.execute({ mode: "odoo", teamId, lookupTerm: fetched.email });
              }
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {simple ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 14px",
                  background: "rgba(58,99,250,.08)",
                  border: "1px solid rgba(58,99,250,.15)",
                  borderRadius: 12,
                }}
              >
                <iconify-icon icon="ant-design:team-outlined" width={16} style={{ color: "#273FF9" }} />
                <span style={{ fontSize: 13, color: "#454D7A" }}>
                  Inviting to <span style={{ fontWeight: 500, color: "#181835" }}>{teams[0]?.name}</span>
                </span>
              </div>
            ) : (
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
              <div style={{ display: "flex", gap: 5, padding: 5, background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.7)", borderRadius: 13 }}>
                <button
                  type="button"
                  onClick={() => setMode("odoo")}
                  style={modeTabStyle(mode === "odoo")}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: "#7B2FBF", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600 }}>
                    O
                  </span>
                  Fetch from Odoo
                </button>
                <button type="button" onClick={() => setMode("manual")} style={modeTabStyle(mode === "manual")}>
                  <iconify-icon icon="ant-design:edit-outlined" width={15} />
                  Add manually
                </button>
              </div>
            )}

            {mode === "manual" ? (
              <>
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
                <div style={{ display: "flex", gap: 10, padding: "13px 15px", background: "rgba(39,63,249,.07)", border: "1px solid rgba(39,63,249,.15)", borderRadius: 13 }}>
                  <iconify-icon icon="ant-design:mail-outlined" width={16} style={{ color: "#273FF9", flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: "#454D7A", lineHeight: 1.5 }}>
                    An invite link is emailed to this address. When they accept, they log in and complete their own
                    profile
                    {simple && kpiCount != null
                      ? `, and inherit this team's ${kpiCount} KPI${kpiCount === 1 ? "" : "s"} on their next review form.`
                      : "."}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  Odoo employee email or ID
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={lookupTerm}
                      onChange={(e) => setLookupTerm(e.target.value)}
                      style={{ ...selectStyle, flex: 1 }}
                      placeholder="jordan.alvarez@acme.com or ACM-2041"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!lookupTerm.trim() || lookup.isExecuting}
                      onClick={() => lookup.execute({ lookupTerm })}
                    >
                      {lookup.isExecuting ? "Fetching…" : "Fetch"}
                    </Button>
                  </div>
                </label>

                {lookup.result.serverError ? (
                  <div className="piq-caption" style={{ color: "#FF5A5F", display: "flex", alignItems: "center", gap: 6 }}>
                    <iconify-icon icon="ant-design:close-circle-outlined" width={15} />
                    {lookup.result.serverError}
                  </div>
                ) : null}

                {!fetched && (suggestions.result.data?.length ?? 0) > 0 ? (
                  <div>
                    <div className="piq-caption" style={{ marginBottom: 8 }}>
                      Try a directory record
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {suggestions.result.data!.map((s) => (
                        <button
                          key={s.empId}
                          type="button"
                          onClick={() => {
                            setLookupTerm(s.email);
                            lookup.execute({ lookupTerm: s.email });
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "7px 11px",
                            borderRadius: 9,
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#454D7A",
                            background: "rgba(255,255,255,.55)",
                            border: "1px solid rgba(168,175,203,.35)",
                            cursor: "pointer",
                          }}
                        >
                          {s.name} · {s.empId}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {fetched ? (
                  <div style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(168,175,203,.3)", borderRadius: 16, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: "#7B2FBF", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600 }}>
                        O
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#273FF9" }}>Synced from Odoo HR</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "linear-gradient(135deg,#8BB0FF,#3A63FA)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 500,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {fetched.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#181835" }}>{fetched.name}</div>
                        <div className="piq-caption">
                          {fetched.jobTitle} · {fetched.empId}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginTop: 16 }}>
                      <Field label="Email" value={fetched.email} />
                      <Field label="Department" value={fetched.department} />
                      <Field label="Manager" value={fetched.manager} />
                      <Field label="Location" value={fetched.location} />
                      <Field label="Phone" value={fetched.phone} />
                      <Field label="Joined · type" value={`${fetched.joinedDate} · ${fetched.workType}`} />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {error ? (
              <div className="piq-caption" style={{ color: "#FF5A5F" }}>
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                icon="ant-design:send-outlined"
                disabled={invite.isExecuting || (mode === "odoo" && !fetched)}
              >
                {invite.isExecuting ? "Sending invite…" : "Send invite link"}
              </Button>
            </div>
          </form>
        )}
      </FrostCard>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#767FA5" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#252944", marginTop: 1 }}>{value}</div>
    </div>
  );
}

function modeTabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "9px 0",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    fontFamily: "'Switzer',sans-serif",
    color: active ? "#fff" : "#596392",
    background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
    boxShadow: active ? "0 5px 14px rgba(39,63,249,.3)" : "none",
  };
}

const selectStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Switzer',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};

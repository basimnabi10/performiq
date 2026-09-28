"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { updateMemberRole } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";
import { FormError } from "@/components/ui/FormMessage";

type Role = "ic" | "hod" | "hr" | "admin";

const ROLES: { value: Role; label: string; blurb: string }[] = [
  { value: "ic", label: "Team member", blurb: "Sees their own dashboard, reviews and learning." },
  { value: "hod", label: "Head of department", blurb: "Runs one department: its teams, KPIs, reviews and cycles." },
  { value: "hr", label: "Human resources", blurb: "Reads every department's review record. Changes nothing." },
  { value: "admin", label: "Admin", blurb: "Manages teams, members, KPIs, cycles and settings." },
];

/**
 * Changes what someone can do, after they were invited.
 *
 * Every rule that matters lives in the action — the last admin, your own
 * account, a HOD with no department. This asks for confirmation before
 * submitting because the change is silent from the other person's side:
 * their next page load simply has more or less in it.
 */
export function RoleControl({
  memberId,
  memberName,
  currentRole,
}: {
  memberId: string;
  memberName: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>((currentRole as Role) ?? "ic");

  const save = useAction(updateMemberRole, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  const current = ROLES.find((r) => r.value === currentRole);
  const chosen = ROLES.find((r) => r.value === role);
  const changed = role !== currentRole;

  if (!open) {
    return (
      <Button variant="secondary" size="sm" icon="ant-design:idcard-outlined" onClick={() => setOpen(true)}>
        {current?.label ?? currentRole}
      </Button>
    );
  }

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(24,24,53,.55)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        textAlign: "left",
      }}
    >
      <FrostCard
        tone="modal"
        padding={26}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="piq-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>
              Change role
            </div>
            <div className="piq-h3" style={{ marginTop: 2 }}>
              {memberName}
            </div>
          </div>
          <IconButton icon="ant-design:close-outlined" aria-label="Close" onClick={() => setOpen(false)} />
        </div>

        <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Role
          <select className="piq-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11.5, color: "#596392", lineHeight: 1.5 }}>{chosen?.blurb}</span>
        </label>

        {changed ? (
          <div
            style={{
              padding: "13px 15px",
              borderRadius: 14,
              background: "rgba(39,63,249,.07)",
              border: "1px solid rgba(39,63,249,.20)",
              fontSize: 13,
              color: "#454D7A",
              lineHeight: 1.55,
            }}
          >
            {memberName} goes from <strong>{current?.label ?? currentRole}</strong> to{" "}
            <strong>{chosen?.label}</strong>. They are not told — their next page load simply has more or less in it.
          </div>
        ) : null}

        <FormError>{save.result.serverError}</FormError>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!changed || save.isExecuting}
            onClick={() => save.execute({ memberId, authRole: role })}
          >
            {save.isExecuting ? "Saving…" : "Change role"}
          </Button>
        </div>
      </FrostCard>
    </div>
  );
}

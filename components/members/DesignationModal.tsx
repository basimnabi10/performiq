"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateDesignation } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const SUGGESTIONS = [
  "Individual Contributor",
  "Senior Individual Contributor",
  "Team Lead",
  "Manager",
  "Senior Manager",
  "Director",
];

export function DesignationModal({
  memberId,
  currentTitle,
  memberName,
  teamName,
}: {
  memberId: string;
  currentTitle: string;
  memberName: string;
  teamName: string;
}) {
  const [open, setOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState(currentTitle);
  const { execute, isExecuting, result, reset } = useAction(updateDesignation, {
    onSuccess: () => setOpen(false),
  });

  function close() {
    setOpen(false);
    reset();
  }

  if (!open) {
    return (
      <span
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          fontWeight: 500,
          color: "#8BB0FF",
          background: "rgba(136,176,255,.14)",
          border: "1px solid rgba(136,176,255,.22)",
          padding: "3px 9px",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        <iconify-icon icon="ant-design:edit-outlined" width="12" />
        Change designation
      </span>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.42)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={close}
    >
      <div
        style={{
          width: 500,
          background: "rgba(255,255,255,.92)",
          WebkitBackdropFilter: "blur(40px)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,.7)",
          borderRadius: 26,
          boxShadow: "0 30px 80px rgba(24,24,53,.4)",
          padding: 30,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg,#3A63FA,#273FF9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 8px 20px rgba(39,63,249,.35)",
              flexShrink: 0,
            }}
          >
            <iconify-icon icon="ant-design:idcard-outlined" width="22" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-.01em", color: "#181835" }}>Change designation</div>
            <div style={{ fontSize: 13, color: "#596392", marginTop: 2 }}>
              Update the role for {memberName} in {teamName}.
            </div>
          </div>
          <IconButton
            icon="ant-design:close-outlined"
            variant="chrome"
            size={34}
            label="Close"
            onClick={close}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ memberId, jobTitle });
          }}
        >
          <div style={{ marginTop: 22 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Designation</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Product Designer"
              required
              style={{
                display: "block",
                width: "100%",
                marginTop: 8,
                height: 46,
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
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#767FA5", marginBottom: 9 }}>Suggestions</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((label) => {
                const active = jobTitle === label;
                return (
                  <div
                    key={label}
                    onClick={() => setJobTitle(label)}
                    style={{
                      padding: "8px 13px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      color: active ? "#fff" : "#454D7A",
                      background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.55)",
                      border: active ? "1px solid transparent" : "1px solid rgba(168,175,203,.35)",
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F", marginTop: 14 }}>
              {result.serverError}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <Button
              type="button"
              variant="secondary"
              style={{ color: "#454D7A", background: "rgba(255,255,255,.6)", border: "1px solid rgba(168,175,203,.4)" }}
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" icon="ant-design:check-outlined" disabled={isExecuting}>
              {isExecuting ? "Saving…" : "Save designation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

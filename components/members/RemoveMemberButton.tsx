"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { removeMember } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

export function RemoveMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting, result, reset } = useAction(removeMember, { onSuccess: () => setOpen(false) });

  // The row is a link to the profile — a click on the button must not follow it.
  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!open) {
    return (
      <button
        type="button"
        title={`Remove ${memberName}`}
        aria-label={`Remove ${memberName}`}
        onClick={(e) => {
          stop(e);
          setOpen(true);
        }}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          background: "rgba(89,99,146,.10)",
          color: "#767FA5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <iconify-icon icon="ant-design:delete-outlined" width={15} />
      </button>
    );
  }

  return (
    <div
      onClick={(e) => {
        stop(e);
        setOpen(false);
        reset();
      }}
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
    >
      <FrostCard
        tone="solid"
        style={{ width: 430, display: "flex", flexDirection: "column", gap: 14 }}
        onClick={stop}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Remove {memberName}?</span>
          <IconButton
            icon="ant-design:close-outlined"
            variant="chrome"
            size={32}
            label="Close"
            onClick={(e) => {
              stop(e);
              setOpen(false);
            }}
          />
        </div>

        <div className="piq-caption" style={{ lineHeight: 1.6 }}>
          They lose access immediately, and their reviews, KPI scores, learning progress and mood check-ins are
          permanently deleted — team averages will change. Any KPIs or courses they created stay, and transfer to you.
          This can&rsquo;t be undone.
        </div>

        {result.serverError ? (
          <div className="piq-caption" style={{ color: "#FF5A5F" }}>
            {result.serverError}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="secondary"
            style={{ flex: 1 }}
            onClick={(e) => {
              stop(e);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={isExecuting}
            style={{ flex: 1, background: "#252944", boxShadow: "none" }}
            onClick={(e) => {
              stop(e);
              execute({ memberId });
            }}
          >
            {isExecuting ? "Removing…" : "Remove member"}
          </Button>
        </div>
      </FrostCard>
    </div>
  );
}

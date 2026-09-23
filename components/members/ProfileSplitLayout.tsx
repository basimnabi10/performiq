"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The member profile, optionally split with a review panel beside it.
 *
 * Closed, the profile is exactly what it was — full width, nothing moved.
 * Open, it gives two thirds to the profile and one third to the review, so
 * you can read someone's history while scoring them instead of holding it in
 * your head across two pages.
 *
 * The panel's contents are rendered on the server and passed in, so opening
 * it costs no extra fetch and this component stays a layout switch rather
 * than a second copy of the review page.
 */
export function ProfileSplitLayout({
  children,
  panel,
  panelTitle,
  openLabel,
  canOpen,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
  panelTitle: string;
  openLabel: string;
  /** False when there is nothing to review — no open month, or it is you. */
  canOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const showPanel = open && canOpen;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {canOpen ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant={showPanel ? "secondary" : "primary"}
            icon={showPanel ? "ant-design:close-outlined" : "ant-design:form-outlined"}
            onClick={() => setOpen((v) => !v)}
          >
            {showPanel ? "Close review" : openLabel}
          </Button>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          // 8 / 4 of a twelve-column grid when open; one full-width column
          // when closed, which is the layout that already existed.
          gridTemplateColumns: showPanel ? "repeat(12, minmax(0, 1fr))" : "minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ gridColumn: showPanel ? "span 8" : "auto", minWidth: 0 }}>{children}</div>

        {showPanel ? (
          <aside
            style={{
              gridColumn: "span 4",
              minWidth: 0,
              position: "sticky",
              top: 16,
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 18,
              borderRadius: 22,
              background: "rgba(255,255,255,.55)",
              border: "1px solid rgba(255,255,255,.7)",
              WebkitBackdropFilter: "blur(30px) saturate(140%)",
              backdropFilter: "blur(30px) saturate(140%)",
              boxShadow: "0 8px 24px rgba(0,0,0,.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-strong)" }}>{panelTitle}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close review panel"
                title="Close review panel"
                style={{ border: "none", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", lineHeight: 0 }}
              >
                <iconify-icon icon="ant-design:close-outlined" width={16} />
              </button>
            </div>
            {panel}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

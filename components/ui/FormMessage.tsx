import * as React from "react";

/**
 * Inline validation / server error. Rendered as a live region so a screen
 * reader announces a failed sign-in instead of leaving the user waiting on a
 * form that looks unchanged.
 */
export function FormError({ children }: { children?: React.ReactNode }) {
  return (
    <div role="alert" aria-live="polite" style={{ display: children ? "flex" : "none", gap: 7 }}>
      {children ? (
        <>
          <iconify-icon
            icon="ant-design:exclamation-circle-outlined"
            width={14}
            style={{ color: "var(--error)", flexShrink: 0, marginTop: 2 }}
          />
          <span className="piq-caption" style={{ color: "var(--error)", lineHeight: 1.5 }}>
            {children}
          </span>
        </>
      ) : null}
    </div>
  );
}

/** Neutral informational panel (expired links, signed-out notices). */
export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "success";
}) {
  const success = tone === "success";
  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        padding: "12px 14px",
        background: success ? "rgba(47,191,113,.10)" : "rgba(89,99,146,.10)",
        border: `1px solid ${success ? "rgba(47,191,113,.35)" : "rgba(168,175,203,.4)"}`,
        borderRadius: "var(--radius-md)",
        fontSize: 12.5,
        color: success ? "#1F7A48" : "var(--text-body)",
        lineHeight: 1.5,
      }}
    >
      <iconify-icon
        icon={success ? "ant-design:check-circle-outlined" : "ant-design:info-circle-outlined"}
        width={15}
        style={{ color: success ? "var(--success)" : "var(--text-secondary)", flexShrink: 0, marginTop: 1 }}
      />
      {/* minWidth:0 lets this column actually shrink, and anywhere-wrapping
          stops a long unbroken address (or URL) from forcing the panel into
          one-word-per-line. */}
      <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{children}</div>
    </div>
  );
}

import { BrandOrb } from "@/components/auth/AuthShell";
import { FrostCard } from "@/components/ui/FrostCard";

/**
 * The form side of an auth screen: heading, blurb, and the form itself.
 *
 * The brand lockup here only shows below 900px (.piq-auth-brand), where
 * AuthShell's panel is hidden -- otherwise the wordmark would appear twice
 * side by side.
 */
export function AuthCard({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FrostCard
      tone="solid"
      padding={30}
      style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div className="piq-auth-brand">
        <BrandOrb size={30} />
        <span style={{ fontSize: 14.5, fontWeight: 500 }}>PerformIQ</span>
      </div>

      <div>
        <h1 className="piq-h2" style={{ margin: 0 }}>
          {title}
        </h1>
        {blurb ? (
          <p
            className="piq-body"
            style={{ margin: "7px 0 0", fontSize: 13.5, color: "var(--text-secondary)" }}
          >
            {blurb}
          </p>
        ) : null}
      </div>

      {children}
    </FrostCard>
  );
}

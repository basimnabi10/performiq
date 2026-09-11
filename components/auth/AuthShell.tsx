import { FrostCard } from "@/components/ui/FrostCard";

const FEATURES = [
  {
    icon: "ant-design:line-chart-outlined",
    title: "Transparent KPI scoring",
    body: "See exactly how every weighted metric rolls up into your score.",
  },
  {
    icon: "ant-design:message-outlined",
    title: "Reviews you can respond to",
    body: "Manager feedback, your comments and history in one thread.",
  },
  {
    icon: "ant-design:bulb-outlined",
    title: "Learning tied to growth",
    body: "Assignments mapped to the areas your reviews flagged.",
  },
];

/**
 * The two-panel frame every /(auth) screen sits in: a dark brand panel
 * carrying the pitch, and the actual form beside it. The panel is decorative
 * only -- it drops out below 900px (see .piq-auth-grid) so a phone gets the
 * form at full width instead of a squeezed column.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="piq-auth-grid">
      <FrostCard
        tone="ink"
        padding={34}
        className="piq-auth-aside"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <BrandOrb />
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>PerformIQ</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.62)" }}>
                Performance, growth &amp; reviews
              </div>
            </div>
          </div>

          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(255,255,255,.09)",
              border: "1px solid rgba(255,255,255,.14)",
              fontSize: 11.5,
              color: "rgba(255,255,255,.78)",
            }}
          >
            <iconify-icon icon="ant-design:thunderbolt-outlined" width={13} />
            Performance operating system
          </span>
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: "var(--tracking-display)",
              color: "#fff",
            }}
          >
            Understand your performance.
            <br />
            <span style={{ color: "rgba(255,255,255,.46)" }}>Own your growth.</span>
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "rgba(255,255,255,.62)",
              maxWidth: 380,
            }}
          >
            One workspace for reviews, KPIs, learning and weekly check-ins — connected to your
            company directory so everyone lands exactly where they belong.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                display: "flex",
                gap: 13,
                padding: "13px 15px",
                borderRadius: "var(--radius-lg)",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.09)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "rgba(139,176,255,.14)",
                  color: "#8BB0FF",
                }}
              >
                <iconify-icon icon={f.icon} width={15} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{f.title}</div>
                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,.55)" }}>
                  {f.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            color: "rgba(255,255,255,.45)",
          }}
        >
          <iconify-icon icon="ant-design:safety-certificate-outlined" width={13} />
          Secured by your Odoo company directory.
        </div>
      </FrostCard>

      <div className="piq-auth-main">{children}</div>
    </div>
  );
}

/** The brand mark — a lit glass sphere. Shared by the panel and the form card. */
export function BrandOrb({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background:
          "radial-gradient(circle at 32% 28%,#ffffff,#8BB0FF 28%,#273FF9 72%,#1C10C9)",
        boxShadow:
          "0 5px 12px rgba(39,63,249,.4),inset -2px -3px 6px rgba(14,6,125,.5),inset 2px 2px 6px rgba(255,255,255,.6)",
      }}
    />
  );
}

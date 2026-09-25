export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 3, background: "rgba(168,175,203,.3)", overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 3,
          background: pct === 100 ? "linear-gradient(135deg,#2FBF71,#1B7A48)" : "linear-gradient(135deg,#3A63FA,#273FF9)",
        }}
      />
    </div>
  );
}

export function Panel({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div className="piq-h3">{title}</div>
      {caption ? (
        <div className="piq-caption" style={{ marginTop: 3, marginBottom: 16, lineHeight: 1.5 }}>
          {caption}
        </div>
      ) : (
        <div style={{ height: 16 }} />
      )}
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        flex: "1 1 200px",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 22,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: "rgba(39,63,249,.10)",
            color: "#273FF9",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <iconify-icon icon={icon} width="15" />
        </span>
        <span
          style={{ fontSize: 11.5, fontWeight: 500, color: "#767FA5", letterSpacing: ".05em", textTransform: "uppercase" }}
        >
          {label}
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 12 }}>
        {value}
      </div>
      <div className="piq-caption" style={{ marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

const STATUS_STYLE: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  completed: { label: "Review complete", icon: "ant-design:check-circle-outlined", bg: "rgba(58,99,250,.2)", color: "#8BB0FF" },
  in_progress: { label: "Review in progress", icon: "ant-design:sync-outlined", bg: "rgba(255,255,255,.14)", color: "#fff" },
  pending: { label: "Review pending", icon: "ant-design:clock-circle-outlined", bg: "rgba(255,255,255,.14)", color: "#fff" },
  invited: { label: "Invitation pending", icon: "ant-design:mail-outlined", bg: "rgba(255,255,255,.14)", color: "#fff" },
};

export function MemberHero({
  name,
  jobTitle,
  teamName,
  email,
  location,
  joinedLabel,
  empId,
  score,
  deltaLabel,
  deltaUp,
  statusKey,
  reviewHref,
  ctaLabel,
  designationTrigger,
}: {
  name: string;
  jobTitle: string;
  teamName: string;
  email: string;
  location: string | null;
  joinedLabel: string | null;
  empId: string | null;
  score: number | null;
  deltaLabel: string | null;
  deltaUp: boolean;
  statusKey: string;
  reviewHref: string | null;
  ctaLabel: string;
  designationTrigger: React.ReactNode;
}) {
  const status = STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending;
  const pct = score != null ? Math.round((score / 5) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        gap: 22,
        background: "linear-gradient(150deg,#2C3158,#181835)",
        border: "1px solid rgba(255,255,255,.1)",
        boxShadow: "0 12px 32px rgba(24,24,53,.25)",
        borderRadius: 26,
        padding: "28px 30px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          right: -90,
          top: -140,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(58,99,250,.4),transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          right: 220,
          bottom: -150,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(136,176,255,.16),transparent 70%)",
        }}
      />

      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar
          name={name}
          size={96}
          style={{
            borderRadius: 26,
            fontSize: 32,
            border: "3px solid rgba(255,255,255,.25)",
            boxShadow: "0 12px 30px rgba(0,0,0,.35)",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#3A63FA",
            border: "3px solid #1c2036",
          }}
        />
      </div>

      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-.02em", color: "#fff" }}>{name}</div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              padding: "5px 12px",
              borderRadius: 9,
              color: status.color,
              background: status.bg,
            }}
          >
            <iconify-icon icon={status.icon} width="13" />
            {status.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 3 }}>
          <span style={{ fontSize: 14, color: "#A8AFCB" }}>
            {jobTitle} · {teamName}
          </span>
          {designationTrigger}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C3C9E0" }}>
            <iconify-icon icon="ant-design:mail-outlined" width="15" style={{ color: "#8BB0FF" }} />
            {email}
          </div>
          {location ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C3C9E0" }}>
              <iconify-icon icon="ant-design:environment-outlined" width="15" style={{ color: "#8BB0FF" }} />
              {location}
            </div>
          ) : null}
          {joinedLabel ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C3C9E0" }}>
              <iconify-icon icon="ant-design:calendar-outlined" width="15" style={{ color: "#8BB0FF" }} />
              Joined {joinedLabel}
            </div>
          ) : null}
          {empId ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C3C9E0" }}>
              <iconify-icon icon="ant-design:idcard-outlined" width="15" style={{ color: "#8BB0FF" }} />
              {empId}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          {reviewHref ? (
            <Link
              href={reviewHref}
              style={{
                height: 44,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                font: "500 13px 'Switzer',sans-serif",
                color: "#fff",
                borderRadius: 13,
                cursor: "pointer",
                background: "linear-gradient(135deg,#3A63FA,#273FF9)",
                boxShadow: "0 10px 24px rgba(39,63,249,.4)",
                textDecoration: "none",
              }}
            >
              <iconify-icon icon="ant-design:eye-outlined" width="15" />
              {ctaLabel}
            </Link>
          ) : null}
          <a
            href={`mailto:${email}`}
            style={{
              height: 44,
              padding: "0 18px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              font: "500 13px 'Switzer',sans-serif",
              color: "#fff",
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 13,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            <iconify-icon icon="ant-design:message-outlined" width="15" />
            Message
          </a>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 26,
          borderLeft: "1px solid rgba(255,255,255,.12)",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `conic-gradient(#8BB0FF 0 ${pct}%,rgba(255,255,255,.12) ${pct}% 100%)`,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "#1c2036",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 500, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {score != null ? score.toFixed(1) : "—"}
            </span>
            <span style={{ fontSize: 11, color: "#767FA5" }}>of 5.0</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#A8AFCB", marginTop: 12 }}>Overall score</div>
        {deltaLabel ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 11,
              fontWeight: 500,
              marginTop: 8,
              padding: "4px 10px",
              borderRadius: 8,
              color: "#fff",
              background: deltaUp ? "#3A63FA" : "rgba(255,255,255,.16)",
            }}
          >
            {deltaUp ? "▲" : "▼"} {deltaLabel} vs start
          </span>
        ) : null}
      </div>
    </div>
  );
}

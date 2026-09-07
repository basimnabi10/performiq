"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ReviewsCycleTabs({ view, basePath }: { view: "current" | "history"; basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function go(next: "current" | "history") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "current") params.delete("view");
    else params.set("view", "history");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(255,255,255,.4)", borderRadius: 13, width: "fit-content" }}>
      {(
        [
          { id: "current", label: "Current cycle", icon: "ant-design:file-protect-outlined" },
          { id: "history", label: "History", icon: "ant-design:history-outlined" },
        ] as const
      ).map((tab) => {
        const active = tab.id === view;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => go(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              color: active ? "#fff" : "#596392",
              background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
            }}
          >
            <iconify-icon icon={tab.icon} width={15} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

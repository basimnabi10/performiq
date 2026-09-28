/**
 * The organization's mark. Its uploaded logo when there is one, and the
 * default sphere when there is not.
 *
 * Shared by the sidebar and the settings preview so the two cannot drift —
 * a logo that looks right on the settings page and wrong in the sidebar is
 * the sort of thing nobody notices until someone else points at it.
 */
export function OrgMark({
  src,
  name,
  size = 36,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element --
         Uploaded to Supabase Storage and served from there; next/image would
         need a remote pattern per project and buys nothing at this size. */
      <img
        src={src}
        alt={`${name} logo`}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          flexShrink: 0,
          // Logos are rarely square. Covering keeps the circle full rather
          // than letting a wide mark letterbox inside it.
          objectFit: "cover",
          background: "rgba(255,255,255,.6)",
          boxShadow: "0 5px 12px rgba(39,63,249,.18)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "radial-gradient(circle at 32% 28%,#fff,#8BB0FF 28%,#273FF9 72%,#1C10C9)",
        boxShadow:
          "0 5px 12px rgba(39,63,249,.4),inset -2px -3px 6px rgba(14,6,125,.5),inset 2px 2px 6px rgba(255,255,255,.6)",
      }}
    />
  );
}

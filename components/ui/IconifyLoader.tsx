"use client";

import { useEffect } from "react";

/**
 * Registers the <iconify-icon> custom element once on the client.
 * Self-hosted via the `iconify-icon` npm package (no third-party CDN script).
 */
export function IconifyLoader() {
  useEffect(() => {
    import("iconify-icon");
  }, []);
  return null;
}

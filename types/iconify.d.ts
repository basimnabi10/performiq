import type { DetailedHTMLProps, HTMLAttributes } from "react";

type IconifyIconProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  icon?: string;
  width?: string | number;
  height?: string | number;
  inline?: boolean;
};

// React 19 types resolve JSX.IntrinsicElements through the `react` module's
// namespace, not a bare global `JSX` namespace — augment it there.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": IconifyIconProps;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": IconifyIconProps;
    }
  }
}

export {};

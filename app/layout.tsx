import type { Metadata } from "next";
import localFont from "next/font/local";
import { IconifyLoader } from "@/components/ui/IconifyLoader";
import "./globals.css";

const switzer = localFont({
  variable: "--font-switzer",
  src: [
    { path: "./fonts/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-Medium.woff2", weight: "500", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "PerformIQ",
  description: "Team performance, growth & review platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={switzer.variable}>
      <body>
        <IconifyLoader />
        {children}
      </body>
    </html>
  );
}

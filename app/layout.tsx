import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { IconifyLoader } from "@/components/ui/IconifyLoader";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PerformIQ",
  description: "Team performance, growth & review platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body>
        <IconifyLoader />
        {children}
      </body>
    </html>
  );
}

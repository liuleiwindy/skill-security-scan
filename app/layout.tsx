import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill Security Scan",
  description: "Scan a skill repository and generate a shareable security report.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

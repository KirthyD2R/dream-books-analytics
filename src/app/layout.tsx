import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream Books · Analytics",
  description: "Data volume and user activity for Dream Books",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

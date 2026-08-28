import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RegDesk | CYSCOM x FYI",
  description: "Reliable event registration, team, and attendance operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-ink text-paper antialiased">{children}</body>
    </html>
  );
}
